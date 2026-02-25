import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import bcrypt from 'bcryptjs'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { PrismaClient, UserRole } from '@prisma/client'
import { wholesaleRoutes } from './wholesales'

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
  await app.register(wholesaleRoutes, { prefix: '/api' })
  return app
}

const createUser = async (email: string, role: UserRole = UserRole.employee) => {
  const hashedPassword = await bcrypt.hash('password123', 10)
  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role,
    },
  })
}

describe('Wholesale deal extension endpoints', () => {
  let fastify: FastifyInstance

  beforeEach(async () => {
    fastify = await buildTestServer()
  })

  afterEach(async () => {
    await prisma.wholesale.deleteMany()
    await prisma.project.deleteMany()
    await prisma.company.deleteMany()
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'deal-test-' },
      },
    })
    await fastify.close()
  })

  it('enforces deal status transitions and supports deal filters', async () => {
    const owner = await createUser(`deal-test-owner-${Date.now()}@example.com`)
    const otherOwner = await createUser(`deal-test-other-${Date.now()}@example.com`)
    const token = fastify.jwt.sign({ userId: owner.id, role: 'employee' })

    const advertiser = await prisma.company.create({
      data: {
        name: 'Deal Advertiser',
        normalizedName: `deal-advertiser-${Date.now()}`,
        status: 'active',
        tags: [],
      },
    })
    const media = await prisma.company.create({
      data: {
        name: 'Deal Media',
        normalizedName: `deal-media-${Date.now()}`,
        status: 'active',
        tags: [],
      },
    })
    const project = await prisma.project.create({
      data: {
        companyId: advertiser.id,
        name: 'Deal Project',
        status: 'active',
      },
    })

    const firstCreate = await fastify.inject({
      method: 'POST',
      url: '/api/wholesales',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        projectId: project.id,
        companyId: media.id,
        ownerId: owner.id,
        unitPrice: 120000,
        dealStatus: 'pre_contact',
      },
    })
    expect(firstCreate.statusCode).toBe(201)
    const firstWholesale = JSON.parse(firstCreate.body).wholesale

    const secondCreate = await fastify.inject({
      method: 'POST',
      url: '/api/wholesales',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        projectId: project.id,
        companyId: media.id,
        ownerId: otherOwner.id,
        unitPrice: 60000,
        dealStatus: 'contacting',
      },
    })
    expect(secondCreate.statusCode).toBe(201)

    const invalidTransition = await fastify.inject({
      method: 'PATCH',
      url: `/api/wholesales/${firstWholesale.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        dealStatus: 'publishing',
      },
    })
    expect(invalidTransition.statusCode).toBe(400)
    expect(JSON.parse(invalidTransition.body).error.message).toBe(
      'Invalid dealStatus transition'
    )

    const toContacting = await fastify.inject({
      method: 'PATCH',
      url: `/api/wholesales/${firstWholesale.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        dealStatus: 'contacting',
      },
    })
    expect(toContacting.statusCode).toBe(200)

    const toNegotiating = await fastify.inject({
      method: 'PATCH',
      url: `/api/wholesales/${firstWholesale.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        dealStatus: 'negotiating',
      },
    })
    expect(toNegotiating.statusCode).toBe(200)

    const filtered = await fastify.inject({
      method: 'GET',
      url: `/api/wholesales?dealStatus=negotiating&ownerId=${owner.id}&unitPriceMin=100000&unitPriceMax=130000`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    expect(filtered.statusCode).toBe(200)
    const filteredBody = JSON.parse(filtered.body)
    expect(filteredBody.items).toHaveLength(1)
    expect(filteredBody.items[0].id).toBe(firstWholesale.id)

    const invalidDealStatusFilter = await fastify.inject({
      method: 'GET',
      url: '/api/wholesales?dealStatus=invalid',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    expect(invalidDealStatusFilter.statusCode).toBe(400)
    expect(JSON.parse(invalidDealStatusFilter.body).error.message).toBe('Invalid dealStatus')
  })

  it('records and lists negotiation history for a wholesale', async () => {
    const owner = await createUser(`deal-test-negotiation-${Date.now()}@example.com`)
    const token = fastify.jwt.sign({ userId: owner.id, role: 'employee' })

    const advertiser = await prisma.company.create({
      data: {
        name: 'Negotiation Advertiser',
        normalizedName: `negotiation-advertiser-${Date.now()}`,
        status: 'active',
        tags: [],
      },
    })
    const media = await prisma.company.create({
      data: {
        name: 'Negotiation Media',
        normalizedName: `negotiation-media-${Date.now()}`,
        status: 'active',
        tags: [],
      },
    })
    const project = await prisma.project.create({
      data: {
        companyId: advertiser.id,
        name: 'Negotiation Project',
        status: 'active',
      },
    })
    const createdWholesaleResponse = await fastify.inject({
      method: 'POST',
      url: '/api/wholesales',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        projectId: project.id,
        companyId: media.id,
        ownerId: owner.id,
        dealStatus: 'contacting',
      },
    })
    expect(createdWholesaleResponse.statusCode).toBe(201)
    const wholesale = JSON.parse(createdWholesaleResponse.body).wholesale

    const invalidNegotiation = await fastify.inject({
      method: 'POST',
      url: `/api/wholesales/${wholesale.id}/negotiations`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {},
    })
    expect(invalidNegotiation.statusCode).toBe(400)

    const createFirstNegotiation = await fastify.inject({
      method: 'POST',
      url: `/api/wholesales/${wholesale.id}/negotiations`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        offeredUnitPrice: 150000,
        note: 'initial offer',
      },
    })
    expect(createFirstNegotiation.statusCode).toBe(201)

    const createSecondNegotiation = await fastify.inject({
      method: 'POST',
      url: `/api/wholesales/${wholesale.id}/negotiations`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        agreedUnitPrice: 120000,
        note: 'agreed price',
      },
    })
    expect(createSecondNegotiation.statusCode).toBe(201)

    const historyResponse = await fastify.inject({
      method: 'GET',
      url: `/api/wholesales/${wholesale.id}/negotiations`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    expect(historyResponse.statusCode).toBe(200)
    const historyBody = JSON.parse(historyResponse.body)
    expect(historyBody.negotiations).toHaveLength(2)

    const offeredValues = historyBody.negotiations
      .map((entry: { offeredUnitPrice?: number | null }) => entry.offeredUnitPrice)
      .filter((value: unknown) => typeof value === 'number')
    const agreedValues = historyBody.negotiations
      .map((entry: { agreedUnitPrice?: number | null }) => entry.agreedUnitPrice)
      .filter((value: unknown) => typeof value === 'number')
    expect(offeredValues).toEqual([150000])
    expect(agreedValues).toEqual([120000])

    const wholesaleDetailResponse = await fastify.inject({
      method: 'GET',
      url: `/api/wholesales/${wholesale.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    expect(wholesaleDetailResponse.statusCode).toBe(200)
    const wholesaleDetail = JSON.parse(wholesaleDetailResponse.body).wholesale
    expect(wholesaleDetail.proposedUnitPrice).toBe(150000)
    expect(wholesaleDetail.agreedUnitPrice).toBe(120000)
  })
})
