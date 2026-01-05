import { FastifyInstance } from 'fastify'
import { requireAdmin } from '../middleware/rbac'
import { prisma } from '../utils/prisma'
import { parseStringArray } from '../utils/validation'

const DEFAULT_SETTINGS = {
  summaryDefaultPeriodDays: 30,
  tagOptions: [] as string[],
}

interface SettingsUpdateBody {
  summaryDefaultPeriodDays?: number
  tagOptions?: string[]
}

export async function settingRoutes(fastify: FastifyInstance) {
  fastify.get('/settings', { preHandler: requireAdmin() }, async () => {
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
  })

  fastify.patch<{ Body: SettingsUpdateBody }>(
    '/settings',
    { preHandler: requireAdmin() },
    async (request, reply) => {
      const { summaryDefaultPeriodDays } = request.body
      const tagOptions = parseStringArray(request.body.tagOptions)

      if (summaryDefaultPeriodDays !== undefined) {
        if (
          typeof summaryDefaultPeriodDays !== 'number' ||
          Number.isNaN(summaryDefaultPeriodDays) ||
          summaryDefaultPeriodDays < 1 ||
          summaryDefaultPeriodDays > 365
        ) {
          return reply.code(400).send({ error: 'Invalid summaryDefaultPeriodDays' })
        }
      }

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
  )
}
