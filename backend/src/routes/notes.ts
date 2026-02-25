import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import {
  createNoteHandler,
  createTaskFromNoteHandler,
  deleteNoteHandler,
  getNoteHandler,
  listNotesHandler,
  updateNoteHandler,
} from './notes.handlers'
import type {
  NoteCreateBody,
  NoteListQuery,
  NoteToTaskBody,
  NoteUpdateBody,
} from './notes.schemas'
import {
  noteCreateBodySchema,
  noteListQuerySchema,
  noteParamsSchema,
  noteToTaskBodySchema,
  noteUpdateBodySchema,
} from './notes.schemas'

export async function noteRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Querystring: NoteListQuery }>(
    '/notes',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Notes'],
        querystring: noteListQuerySchema,
      },
    },
    listNotesHandler
  )

  app.get<{ Params: { id: string } }>(
    '/notes/:id',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Notes'],
        params: noteParamsSchema,
      },
    },
    getNoteHandler
  )

  app.post<{ Body: NoteCreateBody }>(
    '/notes',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Notes'],
        body: noteCreateBodySchema,
      },
    },
    createNoteHandler
  )

  app.patch<{ Params: { id: string }; Body: NoteUpdateBody }>(
    '/notes/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Notes'],
        params: noteParamsSchema,
        body: noteUpdateBodySchema,
      },
    },
    updateNoteHandler
  )

  app.delete<{ Params: { id: string } }>(
    '/notes/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Notes'],
        params: noteParamsSchema,
        response: {
          204: z.undefined(),
        },
      },
    },
    deleteNoteHandler
  )

  app.post<{ Params: { id: string }; Body: NoteToTaskBody }>(
    '/notes/:id/tasks',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Notes'],
        params: noteParamsSchema,
        body: noteToTaskBodySchema,
      },
    },
    createTaskFromNoteHandler
  )
}
