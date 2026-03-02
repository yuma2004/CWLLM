import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
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
import {
  companyWholesalesResponseSchema,
  wholesaleCreateBodySchema,
  wholesaleListQuerySchema,
  wholesaleListResponseSchema,
  wholesaleNegotiationCreateBodySchema,
  wholesaleNegotiationResponseSchema,
  wholesaleNegotiationsResponseSchema,
  wholesaleParamsSchema,
  wholesaleResponseSchema,
  wholesaleUpdateBodySchema,
} from './wholesales.schemas'

export async function wholesaleRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Querystring: WholesaleListQuery }>(
    '/wholesales',
    {
      preHandler: requireAuth(),
      schema: {
        querystring: wholesaleListQuerySchema,
        response: {
          200: wholesaleListResponseSchema,
        },
      },
    },
    listWholesalesHandler
  )

  app.post<{ Body: WholesaleCreateBody }>(
    '/wholesales',
    {
      preHandler: requireWriteAccess(),
      schema: {
        body: wholesaleCreateBodySchema,
        response: {
          201: wholesaleResponseSchema,
        },
      },
    },
    createWholesaleHandler
  )

  app.get<{ Params: { id: string } }>(
    '/wholesales/:id',
    {
      preHandler: requireAuth(),
      schema: {
        params: wholesaleParamsSchema,
        response: {
          200: wholesaleResponseSchema,
        },
      },
    },
    getWholesaleHandler
  )

  app.patch<{ Params: { id: string }; Body: WholesaleUpdateBody }>(
    '/wholesales/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        params: wholesaleParamsSchema,
        body: wholesaleUpdateBodySchema,
        response: {
          200: wholesaleResponseSchema,
        },
      },
    },
    updateWholesaleHandler
  )

  app.delete<{ Params: { id: string } }>(
    '/wholesales/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        params: wholesaleParamsSchema,
        response: {
          204: z.undefined(),
        },
      },
    },
    deleteWholesaleHandler
  )

  app.get<{ Params: { id: string } }>(
    '/companies/:id/wholesales',
    {
      preHandler: requireAuth(),
      schema: {
        params: wholesaleParamsSchema,
        response: {
          200: companyWholesalesResponseSchema,
        },
      },
    },
    listCompanyWholesalesHandler
  )

  app.get<{ Params: { id: string } }>(
    '/wholesales/:id/negotiations',
    {
      preHandler: requireAuth(),
      schema: {
        params: wholesaleParamsSchema,
        response: {
          200: wholesaleNegotiationsResponseSchema,
        },
      },
    },
    listWholesaleNegotiationsHandler
  )

  app.post<{ Params: { id: string }; Body: WholesaleNegotiationCreateBody }>(
    '/wholesales/:id/negotiations',
    {
      preHandler: requireWriteAccess(),
      schema: {
        params: wholesaleParamsSchema,
        body: wholesaleNegotiationCreateBodySchema,
        response: {
          201: wholesaleNegotiationResponseSchema,
        },
      },
    },
    createWholesaleNegotiationHandler
  )
}
