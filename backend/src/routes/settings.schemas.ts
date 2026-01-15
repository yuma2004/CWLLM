import { z } from 'zod'

export interface SettingsUpdateBody {
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

export const settingsResponseSchema = z.object({
  settings: z.object({
    summaryDefaultPeriodDays: z.number(),
    tagOptions: z.array(z.string()),
  }),
})

export const settingsUpdateBodySchema = z
  .object({
    summaryDefaultPeriodDays: z.number().int().min(1).max(365).optional(),
    tagOptions: z.array(z.string()).optional(),
  })
  .refine((value) => isValidSettingValue(value), {
    message: 'Settings value is too large',
  })
