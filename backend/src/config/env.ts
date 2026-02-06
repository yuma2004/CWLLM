import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const logEnvSummary = () => {
  if (process.env.NODE_ENV !== 'production') return
  console.log('[env] summary', {
    nodeEnv: process.env.NODE_ENV ?? null,
    port: process.env.PORT ?? null,
    backendPort: process.env.BACKEND_PORT ?? null,
    hasJwtSecret: Boolean(process.env.JWT_SECRET),
    hasRedisUrl: Boolean(process.env.REDIS_URL),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  })
}

logEnvSummary()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  RUN_MODE: z.enum(['web', 'worker']).optional(),
  PORT: z.coerce.number().int().positive().optional(),
  BACKEND_PORT: z.coerce.number().int().positive().default(3000),
  JWT_SECRET: z.string().min(16).optional(),
  CORS_ORIGINS: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  TRUST_PROXY: z.string().optional(),
  CHATWORK_API_TOKEN: z.string().optional(),
  CHATWORK_API_BASE_URL: z.string().optional(),
  CHATWORK_AUTO_SYNC_ENABLED: z.string().optional(),
  CHATWORK_AUTO_SYNC_INTERVAL_MINUTES: z.coerce.number().int().positive().optional(),
  CHATWORK_AUTO_SYNC_ROOM_LIMIT: z.coerce.number().int().optional(),
  CHATWORK_NEW_ROOMS_ACTIVE: z.string().optional(),
  CHATWORK_WEBHOOK_TOKEN: z.string().optional(),
  CHATWORK_WEBHOOK_COOLDOWN_SECONDS: z.coerce.number().int().optional(),
  REDIS_URL: z.string().optional(),
  JOB_WORKER_ENABLED: z.string().optional(),
})

const parseTrustProxy = (value?: string) => {
  if (!value) return undefined
  if (value === 'true') return true
  if (value === 'false') return false
  const numeric = Number(value)
  if (Number.isFinite(numeric)) return numeric
  return undefined
}

const parseBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined || value === '') return defaultValue
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  return defaultValue
}

const parsePositiveInt = (value: number | undefined) => {
  if (typeof value !== 'number') return undefined
  if (!Number.isFinite(value) || value <= 0) return undefined
  return value
}

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  const issues = parsed.error.flatten().fieldErrors
  console.error('[env] invalid variables', issues)
  throw new Error(`Invalid environment variables: ${JSON.stringify(issues)}`)
}

const raw = parsed.data

if (raw.NODE_ENV === 'production' && !raw.JWT_SECRET) {
  console.error('[env] missing JWT_SECRET in production')
  throw new Error('JWT_SECRET is required in production')
}
if (raw.NODE_ENV === 'production' && !raw.REDIS_URL) {
  console.error('[env] missing REDIS_URL in production')
  throw new Error('REDIS_URL is required in production')
}

const corsOrigins = (raw.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const env = {
  nodeEnv: raw.NODE_ENV,
  runMode: raw.RUN_MODE ?? 'web',
  port: raw.PORT ?? raw.BACKEND_PORT,
  jwtSecret: raw.JWT_SECRET,
  corsOrigins,
  rateLimitMax: raw.RATE_LIMIT_MAX,
  rateLimitWindowMs: raw.RATE_LIMIT_WINDOW_MS,
  trustProxy: parseTrustProxy(raw.TRUST_PROXY),
  chatworkApiToken: raw.CHATWORK_API_TOKEN,
  chatworkApiBaseUrl: raw.CHATWORK_API_BASE_URL,
  chatworkAutoSyncEnabled: parseBoolean(raw.CHATWORK_AUTO_SYNC_ENABLED, false),
  chatworkAutoSyncIntervalMinutes: raw.CHATWORK_AUTO_SYNC_INTERVAL_MINUTES ?? 15,
  chatworkAutoSyncRoomLimit: parsePositiveInt(raw.CHATWORK_AUTO_SYNC_ROOM_LIMIT),
  chatworkNewRoomsActive: parseBoolean(raw.CHATWORK_NEW_ROOMS_ACTIVE, true),
  chatworkWebhookToken: raw.CHATWORK_WEBHOOK_TOKEN,
  chatworkWebhookCooldownMs:
    (parsePositiveInt(raw.CHATWORK_WEBHOOK_COOLDOWN_SECONDS) ?? 60) * 1000,
  redisUrl: raw.REDIS_URL,
  jobWorkerEnabled: parseBoolean(raw.JOB_WORKER_ENABLED, raw.NODE_ENV !== 'production'),
}
