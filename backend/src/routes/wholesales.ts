import { FastifyInstance } from 'fastify'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import {
  createWholesaleHandler,
  createWholesaleNegotiationHandler,
  deleteWholesaleHandler,
  getWholesaleHandler,
  listCompanyWholesalesHandler,
  listWholesaleNegotiationsHandler,
  listWholesalesHandler,
  updateWholesaleHandler,
} from './wholesales.handlers'
import type {
  WholesaleCreateBody,
  WholesaleListQuery,
  WholesaleNegotiationCreateBody,
  WholesaleUpdateBody,
} from './wholesales.schemas'

export async function wholesaleRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: WholesaleListQuery }>(
    '/wholesales',
    { preHandler: requireAuth() },
    listWholesalesHandler
  )

  fastify.post<{ Body: WholesaleCreateBody }>(
    '/wholesales',
    { preHandler: requireWriteAccess() },
    createWholesaleHandler
  )

  fastify.get<{ Params: { id: string } }>(
    '/wholesales/:id',
    { preHandler: requireAuth() },
    getWholesaleHandler
  )

  fastify.patch<{ Params: { id: string }; Body: WholesaleUpdateBody }>(
    '/wholesales/:id',
    { preHandler: requireWriteAccess() },
    updateWholesaleHandler
  )

  fastify.delete<{ Params: { id: string } }>(
    '/wholesales/:id',
    { preHandler: requireWriteAccess() },
    deleteWholesaleHandler
  )

  fastify.get<{ Params: { id: string } }>(
    '/companies/:id/wholesales',
    { preHandler: requireAuth() },
    listCompanyWholesalesHandler
  )

  fastify.get<{ Params: { id: string } }>(
    '/wholesales/:id/negotiations',
    { preHandler: requireAuth() },
    listWholesaleNegotiationsHandler
  )

  fastify.post<{ Params: { id: string }; Body: WholesaleNegotiationCreateBody }>(
    '/wholesales/:id/negotiations',
    { preHandler: requireWriteAccess() },
    createWholesaleNegotiationHandler
  )
}
