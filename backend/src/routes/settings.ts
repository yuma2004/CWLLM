import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
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

const MAX_JSON_VALUE_BYTES = 16 * 1024

const isValidSettingValue = (value: unknown) => {
  try {
    const serialized = JSON.stringify(value)
    return Buffer.byteLength(serialized, 'utf8') <= MAX_JSON_VALUE_BYTES
  } catch {
    return false
  }
}

export async function settingRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  const settingsResponseSchema = z.object({
    settings: z.object({
      summaryDefaultPeriodDays: z.number(),
      tagOptions: z.array(z.string()),
    }),
  })

  app.get(
    '/settings',
    {
      preHandler: requireAdmin(),
      schema: {
        response: {
          200: settingsResponseSchema,
        },
      },
    },
    async () => {
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
  )

  app.patch<{ Body: SettingsUpdateBody }>(
    '/settings',
    {
      preHandler: requireAdmin(),
      schema: {
        body: z
          .object({
            summaryDefaultPeriodDays: z.number().int().min(1).max(365).optional(),
            tagOptions: z.array(z.string()).optional(),
          })
          .refine((value) => isValidSettingValue(value), {
            message: 'Settings value is too large',
          }),
        response: {
          200: settingsResponseSchema,
        },
      },
    },
    async (request, reply) => {
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
  )
}
