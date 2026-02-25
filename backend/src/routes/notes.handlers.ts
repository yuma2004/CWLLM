import { FastifyReply, FastifyRequest } from 'fastify'
import { NoteType, Prisma, TaskStatus, TargetType } from '@prisma/client'
import {
  badRequest,
  buildPaginatedResponse,
  createEnumNormalizer,
  handlePrismaError,
  isNonEmptyString,
  isNullableString,
  notFound,
  parseDate,
  parsePagination,
  prisma,
  unauthorized,
} from '../utils'
import { JWTUser } from '../types/auth'
import type {
  NoteCreateBody,
  NoteListQuery,
  NoteTargetType,
  NoteToTaskBody,
  NoteUpdateBody,
} from './notes.schemas'

const normalizeNoteType = createEnumNormalizer(new Set(Object.values(NoteType)))
const normalizeTaskStatus = createEnumNormalizer(new Set(Object.values(TaskStatus)))
const normalizeTargetType = createEnumNormalizer(
  new Set(['company', 'project', 'wholesale'] as const)
)

const ensureTargetExists = async (
  targetType: NoteTargetType,
  targetId: string
): Promise<boolean> => {
  if (targetType === 'company') {
    const company = await prisma.company.findUnique({ where: { id: targetId } })
    return Boolean(company)
  }
  if (targetType === 'project') {
    const project = await prisma.project.findUnique({ where: { id: targetId } })
    return Boolean(project)
  }
  const wholesale = await prisma.wholesale.findUnique({ where: { id: targetId } })
  return Boolean(wholesale)
}

const buildNoteTargetConnect = (
  targetType: NoteTargetType,
  targetId: string
): Pick<Prisma.NoteCreateInput, 'company' | 'project' | 'wholesale'> => {
  if (targetType === 'company') {
    return { company: { connect: { id: targetId } } }
  }
  if (targetType === 'project') {
    return { project: { connect: { id: targetId } } }
  }
  return { wholesale: { connect: { id: targetId } } }
}

const buildNoteTargetWhere = (
  targetType: NoteTargetType,
  targetId: string
): Prisma.NoteWhereInput => {
  if (targetType === 'company') return { companyId: targetId }
  if (targetType === 'project') return { projectId: targetId }
  return { wholesaleId: targetId }
}

export const listNotesHandler = async (
  request: FastifyRequest<{ Querystring: NoteListQuery }>,
  reply: FastifyReply
) => {
  const targetType = normalizeTargetType(request.query.targetType)
  const type = normalizeNoteType(request.query.type)
  const { targetId, authorId } = request.query
  const q = request.query.q?.trim()
  const { page, pageSize, skip } = parsePagination(
    request.query.page,
    request.query.pageSize
  )

  if (request.query.targetType !== undefined && targetType === null) {
    return reply.code(400).send(badRequest('Invalid targetType'))
  }
  if (request.query.type !== undefined && type === null) {
    return reply.code(400).send(badRequest('Invalid type'))
  }
  if (targetType && !isNonEmptyString(targetId)) {
    return reply.code(400).send(badRequest('targetId is required'))
  }
  if (!targetType && targetId !== undefined) {
    return reply.code(400).send(badRequest('targetType is required'))
  }
  if (authorId !== undefined && !isNonEmptyString(authorId)) {
    return reply.code(400).send(badRequest('Invalid authorId'))
  }

  const where: Prisma.NoteWhereInput = {}
  if (targetType && targetId) {
    Object.assign(where, buildNoteTargetWhere(targetType, targetId))
  }
  if (type) {
    where.type = type
  }
  if (authorId) {
    where.authorId = authorId
  }
  if (q) {
    where.content = { contains: q, mode: 'insensitive' }
  }

  const [items, total] = await prisma.$transaction([
    prisma.note.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, email: true, name: true },
        },
        company: {
          select: { id: true, name: true },
        },
        project: {
          select: { id: true, name: true },
        },
        wholesale: {
          select: { id: true, projectId: true, companyId: true, dealStatus: true },
        },
      },
    }),
    prisma.note.count({ where }),
  ])

  return buildPaginatedResponse(items, page, pageSize, total)
}

export const getNoteHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const note = await prisma.note.findUnique({
    where: { id: request.params.id },
    include: {
      author: {
        select: { id: true, email: true, name: true },
      },
      company: {
        select: { id: true, name: true },
      },
      project: {
        select: { id: true, name: true },
      },
      wholesale: {
        select: { id: true, projectId: true, companyId: true, dealStatus: true },
      },
    },
  })
  if (!note) {
    return reply.code(404).send(notFound('Note'))
  }
  return { note }
}

export const createNoteHandler = async (
  request: FastifyRequest<{ Body: NoteCreateBody }>,
  reply: FastifyReply
) => {
  const { targetType, targetId, content, authorId } = request.body
  const type = normalizeNoteType(request.body.type)

  if (!isNonEmptyString(targetId)) {
    return reply.code(400).send(badRequest('targetId is required'))
  }
  if (!isNonEmptyString(content)) {
    return reply.code(400).send(badRequest('content is required'))
  }
  if (request.body.type !== undefined && type === null) {
    return reply.code(400).send(badRequest('Invalid type'))
  }
  if (authorId !== undefined && !isNonEmptyString(authorId)) {
    return reply.code(400).send(badRequest('Invalid authorId'))
  }

  const targetExists = await ensureTargetExists(targetType, targetId)
  if (!targetExists) {
    return reply.code(404).send(notFound('Target'))
  }

  if (authorId) {
    const author = await prisma.user.findUnique({ where: { id: authorId } })
    if (!author) {
      return reply.code(404).send(notFound('User'))
    }
  }

  try {
    const note = await prisma.note.create({
      data: {
        ...buildNoteTargetConnect(targetType, targetId),
        type: type ?? NoteType.other,
        content: content.trim(),
        ...(authorId ? { author: { connect: { id: authorId } } } : {}),
      },
      include: {
        author: {
          select: { id: true, email: true, name: true },
        },
      },
    })
    return reply.code(201).send({ note })
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}

export const updateNoteHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: NoteUpdateBody }>,
  reply: FastifyReply
) => {
  const type = normalizeNoteType(request.body.type)
  const { content } = request.body

  if (request.body.type !== undefined && type === null) {
    return reply.code(400).send(badRequest('Invalid type'))
  }
  if (content !== undefined && !isNonEmptyString(content)) {
    return reply.code(400).send(badRequest('Invalid content'))
  }
  if (content === undefined && request.body.type === undefined) {
    return reply.code(400).send(badRequest('No fields to update'))
  }

  const existing = await prisma.note.findUnique({ where: { id: request.params.id } })
  if (!existing) {
    return reply.code(404).send(notFound('Note'))
  }

  const data: Prisma.NoteUpdateInput = {}
  if (type !== undefined && type !== null) {
    data.type = type
  }
  if (content !== undefined) {
    data.content = content.trim()
  }

  try {
    const note = await prisma.note.update({
      where: { id: request.params.id },
      data,
      include: {
        author: {
          select: { id: true, email: true, name: true },
        },
      },
    })
    return { note }
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}

export const deleteNoteHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const existing = await prisma.note.findUnique({ where: { id: request.params.id } })
  if (!existing) {
    return reply.code(404).send(notFound('Note'))
  }

  try {
    await prisma.note.delete({ where: { id: request.params.id } })
    return reply.code(204).send()
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}

const resolveNoteTarget = (note: {
  companyId: string | null
  projectId: string | null
  wholesaleId: string | null
}): { targetType: TargetType; targetId: string } | null => {
  if (note.wholesaleId) return { targetType: TargetType.wholesale, targetId: note.wholesaleId }
  if (note.projectId) return { targetType: TargetType.project, targetId: note.projectId }
  if (note.companyId) return { targetType: TargetType.company, targetId: note.companyId }
  return null
}

export const createTaskFromNoteHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: NoteToTaskBody }>,
  reply: FastifyReply
) => {
  const user = request.user as JWTUser | undefined
  if (!user?.userId) {
    return reply.code(401).send(unauthorized())
  }

  const { title, description, assigneeId } = request.body
  const status = normalizeTaskStatus(request.body.status)
  const dueDate = parseDate(request.body.dueDate)

  if (title !== undefined && !isNonEmptyString(title)) {
    return reply.code(400).send(badRequest('Invalid title'))
  }
  if (description !== undefined && !isNonEmptyString(description)) {
    return reply.code(400).send(badRequest('Invalid description'))
  }
  if (!isNullableString(assigneeId)) {
    return reply.code(400).send(badRequest('Invalid assigneeId'))
  }
  if (typeof assigneeId === 'string' && assigneeId.trim() === '') {
    return reply.code(400).send(badRequest('Invalid assigneeId'))
  }
  if (request.body.status !== undefined && status === null) {
    return reply.code(400).send(badRequest('Invalid status'))
  }
  if (request.body.dueDate !== undefined && request.body.dueDate !== null && !dueDate) {
    return reply.code(400).send(badRequest('Invalid dueDate'))
  }

  const note = await prisma.note.findUnique({
    where: { id: request.params.id },
    select: {
      id: true,
      content: true,
      companyId: true,
      projectId: true,
      wholesaleId: true,
    },
  })
  if (!note) {
    return reply.code(404).send(notFound('Note'))
  }

  const target = resolveNoteTarget(note)
  if (!target) {
    return reply.code(400).send(badRequest('Note target is not set'))
  }

  const resolvedTitle =
    title?.trim() ||
    `Note: ${note.content.trim().slice(0, 60)}${note.content.trim().length > 60 ? '...' : ''}`
  const resolvedDescription = description?.trim() || note.content

  try {
    const task = await prisma.task.create({
      data: {
        targetType: target.targetType,
        targetId: target.targetId,
        title: resolvedTitle,
        description: resolvedDescription,
        dueDate: request.body.dueDate === null ? null : (dueDate ?? undefined),
        assigneeId: assigneeId === undefined ? user.userId : assigneeId,
        status: status ?? TaskStatus.todo,
      },
    })
    return reply.code(201).send({ task })
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}
