import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'
import { companyRoutes } from './companies'

const prisma = new PrismaClient()

const buildTestServer = async () => {
  const app = Fastify()
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

const createUser = async (email: string, role: string) => {
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
    const owner = await createUser(`test-owner-${Date.now()}@example.com`, 'sales')

    await prisma.company.create({
      data: {
        name: 'Acme Media',
        normalizedName: 'acmemedia',
        category: 'media',
        status: 'active',
        tags: ['vip', 'priority'],
        ownerId: owner.id,
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

  it('prevents readonly from creating companies', async () => {
    const token = fastify.jwt.sign({ userId: 'readonly', role: 'readonly' })

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

    expect(response.statusCode).toBe(403)
  })
})
