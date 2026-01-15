import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import {
  createProjectHandler,
  deleteProjectHandler,
  getProjectHandler,
  listCompanyProjectsHandler,
  listProjectWholesalesHandler,
  listProjectsHandler,
  searchProjectsHandler,
  updateProjectHandler,
} from './projects.handlers'
import {
  ProjectCreateBody,
  ProjectListQuery,
  ProjectSearchQuery,
  ProjectUpdateBody,
  companyProjectsResponseSchema,
  projectCreateBodySchema,
  projectListQuerySchema,
  projectListResponseSchema,
  projectParamsSchema,
  projectResponseSchema,
  projectSearchQuerySchema,
  projectSearchResponseSchema,
  projectUpdateBodySchema,
  projectWholesalesResponseSchema,
} from './projects.schemas'

export async function projectRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Querystring: ProjectListQuery }>(
    '/projects',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Projects'],
        querystring: projectListQuerySchema,
        response: {
          200: projectListResponseSchema,
        },
      },
    },
    listProjectsHandler
  )

  app.get<{ Querystring: ProjectSearchQuery }>(
    '/projects/search',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Projects'],
        querystring: projectSearchQuerySchema,
        response: {
          200: projectSearchResponseSchema,
        },
      },
    },
    searchProjectsHandler
  )

  app.post<{ Body: ProjectCreateBody }>(
    '/projects',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Projects'],
        body: projectCreateBodySchema,
        response: {
          201: projectResponseSchema,
        },
      },
    },
    createProjectHandler
  )

  app.get<{ Params: { id: string } }>(
    '/projects/:id',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Projects'],
        params: projectParamsSchema,
        response: {
          200: projectResponseSchema,
        },
      },
    },
    getProjectHandler
  )

  app.patch<{ Params: { id: string }; Body: ProjectUpdateBody }>(
    '/projects/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Projects'],
        params: projectParamsSchema,
        body: projectUpdateBodySchema,
        response: {
          200: projectResponseSchema,
        },
      },
    },
    updateProjectHandler
  )

  app.delete<{ Params: { id: string } }>(
    '/projects/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Projects'],
        params: projectParamsSchema,
        response: {
          204: z.undefined(),
        },
      },
    },
    deleteProjectHandler
  )

  app.get<{ Params: { id: string } }>(
    '/projects/:id/wholesales',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Projects'],
        params: projectParamsSchema,
        response: {
          200: projectWholesalesResponseSchema,
        },
      },
    },
    listProjectWholesalesHandler
  )

  app.get<{ Params: { id: string } }>(
    '/companies/:id/projects',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Projects'],
        params: projectParamsSchema,
        response: {
          200: companyProjectsResponseSchema,
        },
      },
    },
    listCompanyProjectsHandler
  )
}
