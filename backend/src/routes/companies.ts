import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { requireAdmin, requireAuth, requireWriteAccess } from '../middleware/rbac'
import {
  CompanyCreateBody,
  CompanyListQuery,
  CompanySearchQuery,
  CompanyUpdateBody,
  ContactCreateBody,
  ContactReorderBody,
  ContactUpdateBody,
  CompanyMergeBody,
  companyCreateBodySchema,
  companyListQuerySchema,
  companyListResponseSchema,
  companyMergeBodySchema,
  companyOptionsResponseSchema,
  companyParamsSchema,
  companyResponseSchema,
  companySearchQuerySchema,
  companySearchResponseSchema,
  companyUpdateBodySchema,
  contactCreateBodySchema,
  contactListResponseSchema,
  contactParamsSchema,
  contactReorderBodySchema,
  contactResponseSchema,
  contactUpdateBodySchema,
} from './companies.schemas'
import {
  createCompanyContactHandler,
  createCompanyHandler,
  deleteCompanyHandler,
  deleteContactHandler,
  getCompanyHandler,
  getCompanyOptionsHandler,
  listCompaniesHandler,
  listCompanyContactsHandler,
  mergeCompanyHandler,
  reorderContactsHandler,
  searchCompaniesHandler,
  updateCompanyHandler,
  updateContactHandler,
} from './companies.handlers'

export async function companyRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Querystring: CompanyListQuery }>(
    '/companies',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Companies'],
        querystring: companyListQuerySchema,
        response: {
          200: companyListResponseSchema,
        },
      },
    },
    listCompaniesHandler
  )

  app.get<{ Querystring: CompanySearchQuery }>(
    '/companies/search',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Companies'],
        querystring: companySearchQuerySchema,
        response: {
          200: companySearchResponseSchema,
        },
      },
    },
    searchCompaniesHandler
  )

  app.post<{ Body: CompanyCreateBody }>(
    '/companies',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Companies'],
        body: companyCreateBodySchema,
        response: {
          201: companyResponseSchema,
        },
      },
    },
    createCompanyHandler
  )

  app.get<{ Params: { id: string } }>(
    '/companies/:id',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Companies'],
        params: companyParamsSchema,
        response: {
          200: companyResponseSchema,
        },
      },
    },
    getCompanyHandler
  )

  app.patch<{ Params: { id: string }; Body: CompanyUpdateBody }>(
    '/companies/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Companies'],
        params: companyParamsSchema,
        body: companyUpdateBodySchema,
        response: {
          200: companyResponseSchema,
        },
      },
    },
    updateCompanyHandler
  )

  app.post<{ Params: { id: string }; Body: CompanyMergeBody }>(
    '/companies/:id/merge',
    {
      preHandler: requireAdmin(),
      schema: {
        tags: ['Companies'],
        params: companyParamsSchema,
        body: companyMergeBodySchema,
        response: {
          200: companyResponseSchema,
        },
      },
    },
    mergeCompanyHandler
  )

  app.delete<{ Params: { id: string } }>(
    '/companies/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Companies'],
        params: companyParamsSchema,
        response: {
          204: z.undefined(),
        },
      },
    },
    deleteCompanyHandler
  )

  app.get<{ Params: { id: string } }>(
    '/companies/:id/contacts',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Contacts'],
        params: companyParamsSchema,
        response: {
          200: contactListResponseSchema,
        },
      },
    },
    listCompanyContactsHandler
  )

  app.post<{ Params: { id: string }; Body: ContactCreateBody }>(
    '/companies/:id/contacts',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Contacts'],
        params: companyParamsSchema,
        body: contactCreateBodySchema,
        response: {
          201: contactResponseSchema,
        },
      },
    },
    createCompanyContactHandler
  )

  app.patch<{ Params: { id: string }; Body: ContactUpdateBody }>(
    '/contacts/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Contacts'],
        params: contactParamsSchema,
        body: contactUpdateBodySchema,
        response: {
          200: contactResponseSchema,
        },
      },
    },
    updateContactHandler
  )

  app.delete<{ Params: { id: string } }>(
    '/contacts/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Contacts'],
        params: contactParamsSchema,
        response: {
          204: z.undefined(),
        },
      },
    },
    deleteContactHandler
  )

  app.patch<{ Params: { id: string }; Body: ContactReorderBody }>(
    '/companies/:id/contacts/reorder',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Contacts'],
        params: companyParamsSchema,
        body: contactReorderBodySchema,
        response: {
          204: z.undefined(),
        },
      },
    },
    reorderContactsHandler
  )

  // 検索/フィルタ用のカテゴリ・ステータス・タグ候補を返す
  app.get(
    '/companies/options',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Companies'],
        response: {
          200: companyOptionsResponseSchema,
        },
      },
    },
    getCompanyOptionsHandler
  )
}
