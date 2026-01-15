import { FastifyReply, FastifyRequest } from 'fastify'
import { prisma, parseStringArray } from '../utils'
import type { SettingsUpdateBody } from './settings.schemas'

const DEFAULT_SETTINGS = {
  summaryDefaultPeriodDays: 30,
  tagOptions: [] as string[],
}

export const getSettingsHandler = async () => {
  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ['summaryDefaultPeriodDays', 'tagOptions'] } },
  })

  const map = new Map(settings.map((item) => [item.key, item.value]))

  return {
    settings: {
      summaryDefaultPeriodDays:
        (map.get('summaryDefaultPeriodDays') as number | undefined) ??
        DEFAULT_SETTINGS.summaryDefaultPeriodDays,
      tagOptions:
        (map.get('tagOptions') as string[] | undefined) ?? DEFAULT_SETTINGS.tagOptions,
    },
  }
}

export const updateSettingsHandler = async (
  request: FastifyRequest<{ Body: SettingsUpdateBody }>,
  reply: FastifyReply
) => {
  const { summaryDefaultPeriodDays } = request.body
  const tagOptions = parseStringArray(request.body.tagOptions)

  if (tagOptions === null) {
    return reply.code(400).send({ error: 'tagOptions must be string array' })
  }

  const updates: Array<Promise<unknown>> = []
  if (summaryDefaultPeriodDays !== undefined) {
    updates.push(
      prisma.appSetting.upsert({
        where: { key: 'summaryDefaultPeriodDays' },
        update: { value: summaryDefaultPeriodDays },
        create: { key: 'summaryDefaultPeriodDays', value: summaryDefaultPeriodDays },
      })
    )
  }
  if (tagOptions !== undefined) {
    updates.push(
      prisma.appSetting.upsert({
        where: { key: 'tagOptions' },
        update: { value: tagOptions },
        create: { key: 'tagOptions', value: tagOptions },
      })
    )
  }

  await Promise.all(updates)

  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ['summaryDefaultPeriodDays', 'tagOptions'] } },
  })

  const map = new Map(settings.map((item) => [item.key, item.value]))

  return reply.send({
    settings: {
      summaryDefaultPeriodDays:
        (map.get('summaryDefaultPeriodDays') as number | undefined) ??
        DEFAULT_SETTINGS.summaryDefaultPeriodDays,
      tagOptions:
        (map.get('tagOptions') as string[] | undefined) ?? DEFAULT_SETTINGS.tagOptions,
    },
  })
}
