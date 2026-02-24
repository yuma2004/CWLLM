import { FastifyReply, FastifyRequest } from 'fastify'
import { FeedbackType } from '@prisma/client'
import { JWTUser } from '../types/auth'
import {
  badRequest,
  forbidden,
  handlePrismaError,
  isNonEmptyString,
  notFound,
  prisma,
  unauthorized,
} from '../utils'
import { FeedbackCreateBody, FeedbackListQuery, FeedbackUpdateBody } from './feedback.schemas'

const feedbackUserSelect = {
  id: true,
  email: true,
  name: true,
}

const trimValue = (value: string | undefined) => value?.trim()

const emptyStringToNull = (value: string | undefined) =>
  value && value.length > 0 ? value : null

export const createFeedbackHandler = async (
  request: FastifyRequest<{ Body: FeedbackCreateBody }>,
  reply: FastifyReply
) => {
  const userId = (request.user as JWTUser | undefined)?.userId
  if (!userId) {
    return reply.code(401).send(unauthorized())
  }

  const trimmedMessage = trimValue(request.body.message)
  if (!isNonEmptyString(trimmedMessage)) {
    return reply.code(400).send(badRequest('message is required'))
  }

  const trimmedTitle = trimValue(request.body.title)
  const trimmedPageUrl = trimValue(request.body.pageUrl)
  const type = request.body.type ?? FeedbackType.improvement

  try {
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        type,
        title: emptyStringToNull(trimmedTitle),
        message: trimmedMessage,
        pageUrl: emptyStringToNull(trimmedPageUrl),
      },
    })

    return reply.code(201).send({ feedback })
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}

export const listFeedbackHandler = async (
  request: FastifyRequest<{ Querystring: FeedbackListQuery }>,
  reply: FastifyReply
) => {
  const userId = (request.user as JWTUser | undefined)?.userId
  if (!userId) {
    return reply.code(401).send(unauthorized())
  }

  const type = request.query.type ?? FeedbackType.improvement

  try {
    const feedbacks = await prisma.feedback.findMany({
      where: { type },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: feedbackUserSelect,
        },
      },
    })

    return reply.send({ feedbacks })
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}

export const updateFeedbackHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: FeedbackUpdateBody }>,
  reply: FastifyReply
) => {
  const user = request.user as JWTUser | undefined
  if (!user?.userId) {
    return reply.code(401).send(unauthorized())
  }

  const feedbackId = request.params.id

  try {
    const existing = await prisma.feedback.findUnique({
      where: { id: feedbackId },
    })

    if (!existing) {
      return reply.code(404).send(notFound('feedback'))
    }

    if (existing.type !== FeedbackType.improvement) {
      return reply.code(400).send(badRequest('only improvement feedback can be edited'))
    }

    if (user.role !== 'admin' && existing.userId !== user.userId) {
      return reply.code(403).send(forbidden())
    }

    const hasTitle = request.body.title !== undefined
    const hasMessage = request.body.message !== undefined
    const trimmedTitle = trimValue(request.body.title)
    const trimmedMessage = trimValue(request.body.message)

    if (!hasTitle && !hasMessage) {
      return reply.code(400).send(badRequest('title or message is required'))
    }

    if (hasMessage && !isNonEmptyString(trimmedMessage)) {
      return reply.code(400).send(badRequest('message is required'))
    }

    const feedback = await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        title: hasTitle ? emptyStringToNull(trimmedTitle) : undefined,
        message: hasMessage ? trimmedMessage : undefined,
      },
      include: {
        user: {
          select: feedbackUserSelect,
        },
      },
    })

    return reply.send({ feedback })
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}
