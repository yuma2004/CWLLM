import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import bcrypt from 'bcryptjs'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { PrismaClient, UserRole } from '@prisma/client'
import { projectRoutes } from './projects'
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
  await app.register(projectRoutes, { prefix: '/api' })
  await app.register(wholesaleRoutes, { prefix: '/api' })
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

describe('Project and wholesale endpoints', () => {
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
        email: { contains: 'proj-' },
      },
    })
    await fastify.close()
  })

  it('creates project and wholesale and lists relations', async () => {
    const user = await createUser(`proj-owner-${Date.now()}@example.com`, UserRole.sales)
    const token = fastify.jwt.sign({ userId: user.id, role: 'admin' })

    const advertiser = await prisma.company.create({
      data: {
        name: 'Advertiser',
        normalizedName: 'advertiser',
        status: 'active',
        tags: [],
      },
    })
    const supplier = await prisma.company.create({
      data: {
        name: 'Supplier',
        normalizedName: 'supplier',
        status: 'active',
        tags: [],
      },
    })

    const projectResponse = await fastify.inject({
      method: 'POST',
      url: '/api/projects',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        companyId: advertiser.id,
        name: 'Winter Campaign',
      },
    })

    expect(projectResponse.statusCode).toBe(201)
    const project = JSON.parse(projectResponse.body).project

    const wholesaleResponse = await fastify.inject({
      method: 'POST',
      url: '/api/wholesales',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        projectId: project.id,
        companyId: supplier.id,
        status: 'active',
      },
    })

    expect(wholesaleResponse.statusCode).toBe(201)

    const listResponse = await fastify.inject({
      method: 'GET',
      url: `/api/projects/${project.id}/wholesales`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const listBody = JSON.parse(listResponse.body)
    expect(listBody.wholesales.length).toBe(1)

    const companyList = await fastify.inject({
      method: 'GET',
      url: `/api/companies/${supplier.id}/wholesales`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const companyBody = JSON.parse(companyList.body)
    expect(companyBody.wholesales.length).toBe(1)
  })

  it('rejects wholesale without project', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })
    const company = await prisma.company.create({
      data: {
        name: 'Missing Project',
        normalizedName: 'missingproject',
        status: 'active',
        tags: [],
      },
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/wholesales',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        projectId: 'not-found',
        companyId: company.id,
      },
    })

    expect(response.statusCode).toBe(404)
  })

  it('rejects readonly project create', async () => {
    const token = fastify.jwt.sign({ userId: 'readonly', role: 'readonly' })
    const company = await prisma.company.create({
      data: {
        name: 'Readonly Co',
        normalizedName: 'readonlyco',
        status: 'active',
        tags: [],
      },
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/projects',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        companyId: company.id,
        name: 'Blocked Project',
      },
    })

    expect(response.statusCode).toBe(403)
  })
})
