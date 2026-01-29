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

export const createFeedbackHandler = async (
  request: FastifyRequest<{ Body: FeedbackCreateBody }>,
  reply: FastifyReply
) => {
  const userId = (request.user as JWTUser | undefined)?.userId
  if (!userId) {
    return reply.code(401).send(unauthorized())
  }

  const trimmedMessage = request.body.message?.trim()
  if (!isNonEmptyString(trimmedMessage)) {
    return reply.code(400).send(badRequest('message is required'))
  }

  const trimmedTitle = request.body.title?.trim()
  const trimmedPageUrl = request.body.pageUrl?.trim()
  const type = request.body.type ?? FeedbackType.improvement

  try {
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        type,
        title: trimmedTitle && trimmedTitle.length > 0 ? trimmedTitle : null,
        message: trimmedMessage,
        pageUrl: trimmedPageUrl && trimmedPageUrl.length > 0 ? trimmedPageUrl : null,
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
          select: {
            id: true,
            email: true,
            name: true,
          },
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
    const trimmedTitle = request.body.title?.trim()
    const trimmedMessage = request.body.message?.trim()

    if (!hasTitle && !hasMessage) {
      return reply.code(400).send(badRequest('title or message is required'))
    }

    if (hasMessage && !isNonEmptyString(trimmedMessage)) {
      return reply.code(400).send(badRequest('message is required'))
    }

    const feedback = await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        title:
          hasTitle
            ? (trimmedTitle?.length ?? 0) > 0
              ? trimmedTitle
              : null
            : undefined,
        message: hasMessage ? trimmedMessage : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    return reply.send({ feedback })
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}
