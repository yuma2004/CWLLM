import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().optional(),
  BACKEND_PORT: z.coerce.number().int().positive().default(3000),
  JWT_SECRET: z.string().min(16).optional(),
  CORS_ORIGINS: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  TRUST_PROXY: z.string().optional(),
  CHATWORK_API_TOKEN: z.string().optional(),
  CHATWORK_API_BASE_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
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

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  const issues = parsed.error.flatten().fieldErrors
  throw new Error(`Invalid environment variables: ${JSON.stringify(issues)}`)
}

const raw = parsed.data

if (raw.NODE_ENV === 'production' && !raw.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production')
}
if (raw.NODE_ENV === 'production' && !raw.REDIS_URL) {
  throw new Error('REDIS_URL is required in production')
}

const corsOrigins = (raw.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const env = {
  nodeEnv: raw.NODE_ENV,
  port: raw.PORT ?? raw.BACKEND_PORT,
  jwtSecret: raw.JWT_SECRET,
  corsOrigins,
  rateLimitMax: raw.RATE_LIMIT_MAX,
  rateLimitWindowMs: raw.RATE_LIMIT_WINDOW_MS,
  trustProxy: parseTrustProxy(raw.TRUST_PROXY),
  chatworkApiToken: raw.CHATWORK_API_TOKEN,
  chatworkApiBaseUrl: raw.CHATWORK_API_BASE_URL,
  openaiApiKey: raw.OPENAI_API_KEY,
  openaiModel: raw.OPENAI_MODEL,
  redisUrl: raw.REDIS_URL,
  jobWorkerEnabled: parseBoolean(raw.JOB_WORKER_ENABLED, true),
}
