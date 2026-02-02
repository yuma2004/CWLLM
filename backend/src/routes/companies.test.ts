import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import bcrypt from 'bcryptjs'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { PrismaClient, UserRole } from '@prisma/client'
import { companyRoutes } from './companies'

const prisma = new PrismaClient()

const buildTestServer = async () => {
  const app = Fastify()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  await app.register(cors)
  await app.register(cookie)
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'test-secret',
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  })
  await app.register(companyRoutes, { prefix: '/api' })
  return app
}

const createUser = async (email: string, role: UserRole) => {
  const hashedPassword = await bcrypt.hash('password123', 10)
  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role,
    },
  })
}

describe('Company endpoints', () => {
  let fastify: FastifyInstance

  beforeEach(async () => {
    fastify = await buildTestServer()
  })

  afterEach(async () => {
    await prisma.task.deleteMany()
    await prisma.contact.deleteMany()
    await prisma.company.deleteMany()
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'test-' },
      },
    })
    await fastify.close()
  })

  it('creates a company and returns it in list/detail', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })

    const createResponse = await fastify.inject({
      method: 'POST',
      url: '/api/companies',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Acme Inc',
        category: 'advertiser',
        status: 'active',
        tags: ['vip'],
      },
    })

    expect(createResponse.statusCode).toBe(201)
    const created = JSON.parse(createResponse.body).company
    expect(created.name).toBe('Acme Inc')

    const listResponse = await fastify.inject({
      method: 'GET',
      url: '/api/companies',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(listResponse.statusCode).toBe(200)
    const listBody = JSON.parse(listResponse.body)
    expect(listBody.items.length).toBeGreaterThan(0)

    const detailResponse = await fastify.inject({
      method: 'GET',
      url: `/api/companies/${created.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(detailResponse.statusCode).toBe(200)
    const detailBody = JSON.parse(detailResponse.body)
    expect(detailBody.company.id).toBe(created.id)
  })

  it('filters companies by query, tag, and owner', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })
    const owner = await createUser(`test-owner-${Date.now()}@example.com`, UserRole.employee)

    await prisma.company.create({
      data: {
        name: 'Acme Media',
        normalizedName: 'acmemedia',
        category: 'media',
        status: 'active',
        tags: ['vip', 'priority'],
        ownerIds: [owner.id],
      },
    })
    await prisma.company.create({
      data: {
        name: 'Other Corp',
        normalizedName: 'othercorp',
        category: 'advertiser',
        status: 'active',
        tags: ['standard'],
      },
    })

    const qResponse = await fastify.inject({
      method: 'GET',
      url: '/api/companies?q=Acme',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    const qBody = JSON.parse(qResponse.body)
    expect(qBody.items.length).toBe(1)

    const tagResponse = await fastify.inject({
      method: 'GET',
      url: '/api/companies?tag=vip',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    const tagBody = JSON.parse(tagResponse.body)
    expect(tagBody.items.length).toBe(1)

    const ownerResponse = await fastify.inject({
      method: 'GET',
      url: `/api/companies?ownerId=${owner.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    const ownerBody = JSON.parse(ownerResponse.body)
    expect(ownerBody.items.length).toBe(1)
  })

  it('searches companies with limit', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })

    await prisma.company.create({
      data: {
        name: 'Acme Search One',
        normalizedName: 'acmesearchone',
        status: 'active',
        tags: [],
      },
    })
    await prisma.company.create({
      data: {
        name: 'Acme Search Two',
        normalizedName: 'acmesearchtwo',
        status: 'active',
        tags: [],
      },
    })

    const searchResponse = await fastify.inject({
      method: 'GET',
      url: '/api/companies/search?q=Acme&limit=1',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(searchResponse.statusCode).toBe(200)
    const searchBody = JSON.parse(searchResponse.body)
    expect(searchBody.items.length).toBe(1)
  })

  it('refreshes company options cache after create', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })
    const uniqueCategory = `cache-category-${Date.now()}`
    const uniqueTag = `cache-tag-${Date.now()}`

    await fastify.inject({
      method: 'GET',
      url: '/api/companies/options',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const createResponse = await fastify.inject({
      method: 'POST',
      url: '/api/companies',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Cache Co',
        category: uniqueCategory,
        status: 'active',
        tags: [uniqueTag],
      },
    })

    expect(createResponse.statusCode).toBe(201)

    const optionsResponse = await fastify.inject({
      method: 'GET',
      url: '/api/companies/options',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(optionsResponse.statusCode).toBe(200)
    const optionsBody = JSON.parse(optionsResponse.body)
    expect(optionsBody.categories).toContain(uniqueCategory)
    expect(optionsBody.tags).toContain(uniqueTag)
  })

  it('rejects duplicate normalizedName', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })

    await fastify.inject({
      method: 'POST',
      url: '/api/companies',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'ACME',
      },
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/companies',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'ＡＣＭＥ',
      },
    })

    expect(response.statusCode).toBe(409)
  })

  it('creates and lists contacts', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })

    const company = await prisma.company.create({
      data: {
        name: 'Contact Corp',
        normalizedName: 'contactcorp',
        status: 'active',
        tags: [],
      },
    })

    const createResponse = await fastify.inject({
      method: 'POST',
      url: `/api/companies/${company.id}/contacts`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Taro Contact',
        email: 'taro@example.com',
      },
    })

    expect(createResponse.statusCode).toBe(201)

    const listResponse = await fastify.inject({
      method: 'GET',
      url: `/api/companies/${company.id}/contacts`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const listBody = JSON.parse(listResponse.body)
    expect(listBody.contacts.length).toBe(1)
    expect(listBody.contacts[0].name).toBe('Taro Contact')
  })

  it('rejects invalid role when creating companies', async () => {
    const token = fastify.jwt.sign({ userId: 'invalid', role: 'invalid-role' })

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/companies',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Blocked Corp',
      },
    })

    expect(response.statusCode).toBe(401)
  })

  it('merges companies and reassigns related data', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })

    const target = await prisma.company.create({
      data: {
        name: 'Target Corp',
        normalizedName: 'targetcorp',
        status: 'active',
        tags: ['existing'],
        ownerIds: ['owner-1'],
        category: 'existing-category',
        profile: 'existing-profile',
      },
    })
    const source = await prisma.company.create({
      data: {
        name: 'Source Corp',
        normalizedName: 'sourcecorp',
        status: 'active',
        tags: ['incoming'],
        ownerIds: ['owner-2'],
        category: 'incoming-category',
        profile: 'incoming-profile',
      },
    })
    const contact = await prisma.contact.create({
      data: {
        companyId: source.id,
        name: 'Merged Contact',
        sortOrder: 1,
      },
    })
    const task = await prisma.task.create({
      data: {
        title: 'Company task',
        targetType: 'company',
        targetId: source.id,
        status: 'todo',
      },
    })

    const response = await fastify.inject({
      method: 'POST',
      url: `/api/companies/${target.id}/merge`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        sourceCompanyId: source.id,
      },
    })

    expect(response.statusCode).toBe(200)

    const remainingSource = await prisma.company.findUnique({
      where: { id: source.id },
    })
    expect(remainingSource).toBeNull()

    const movedContact = await prisma.contact.findUnique({
      where: { id: contact.id },
    })
    expect(movedContact?.companyId).toBe(target.id)

    const movedTask = await prisma.task.findUnique({
      where: { id: task.id },
    })
    expect(movedTask?.targetId).toBe(target.id)

    const updatedTarget = await prisma.company.findUnique({
      where: { id: target.id },
    })
    expect(updatedTarget?.tags).toEqual(expect.arrayContaining(['existing', 'incoming']))
    expect(updatedTarget?.ownerIds).toEqual(expect.arrayContaining(['owner-1', 'owner-2']))
    expect(updatedTarget?.category).toBe('existing-category')
    expect(updatedTarget?.profile).toBe('existing-profile')
  })
})
