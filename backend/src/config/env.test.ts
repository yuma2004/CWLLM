import { afterEach, describe, expect, it, vi } from 'vitest'

const managedKeys = [
  'NODE_ENV',
  'RUN_MODE',
  'PORT',
  'BACKEND_PORT',
  'JWT_SECRET',
  'CORS_ORIGINS',
  'RATE_LIMIT_MAX',
  'RATE_LIMIT_WINDOW_MS',
  'TRUST_PROXY',
  'CHATWORK_API_TOKEN',
  'CHATWORK_API_BASE_URL',
  'CHATWORK_AUTO_SYNC_ENABLED',
  'CHATWORK_AUTO_SYNC_INTERVAL_MINUTES',
  'CHATWORK_AUTO_SYNC_ROOM_LIMIT',
  'CHATWORK_NEW_ROOMS_ACTIVE',
  'CHATWORK_WEBHOOK_TOKEN',
  'CHATWORK_WEBHOOK_COOLDOWN_SECONDS',
  'REDIS_URL',
  'JOB_WORKER_ENABLED',
] as const

type ManagedKey = (typeof managedKeys)[number]
type ManagedOverrides = Partial<Record<ManagedKey, string | undefined>>

const originalEnv: Record<ManagedKey, string | undefined> = managedKeys.reduce(
  (acc, key) => ({
    ...acc,
    [key]: process.env[key],
  }),
  {} as Record<ManagedKey, string | undefined>
)

const restoreManagedEnv = () => {
  for (const key of managedKeys) {
    const value = originalEnv[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

const loadEnvModule = async (overrides: ManagedOverrides) => {
  restoreManagedEnv()
  for (const key of managedKeys) {
    if (!Object.prototype.hasOwnProperty.call(overrides, key)) continue
    const value = overrides[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
  vi.resetModules()
  return import('./env')
}

describe('env config', () => {
  afterEach(() => {
    restoreManagedEnv()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('parses defaults and list values in test mode', async () => {
    const { env } = await loadEnvModule({
      NODE_ENV: 'test',
      BACKEND_PORT: '4300',
      PORT: undefined,
      CORS_ORIGINS: 'https://a.example.com, https://b.example.com',
      TRUST_PROXY: 'invalid',
      CHATWORK_AUTO_SYNC_ENABLED: '',
      CHATWORK_NEW_ROOMS_ACTIVE: '',
      CHATWORK_WEBHOOK_COOLDOWN_SECONDS: undefined,
      CHATWORK_AUTO_SYNC_ROOM_LIMIT: '0',
      JOB_WORKER_ENABLED: '',
    })

    expect(env.nodeEnv).toBe('test')
    expect(env.port).toBe(4300)
    expect(env.corsOrigins).toEqual(['https://a.example.com', 'https://b.example.com'])
    expect(env.trustProxy).toBeUndefined()
    expect(env.chatworkAutoSyncEnabled).toBe(false)
    expect(env.chatworkNewRoomsActive).toBe(true)
    expect(env.chatworkAutoSyncRoomLimit).toBeUndefined()
    expect(env.chatworkWebhookCooldownMs).toBe(60_000)
    expect(env.jobWorkerEnabled).toBe(true)
  })

  it('parses explicit booleans, numeric values and port override', async () => {
    const { env } = await loadEnvModule({
      NODE_ENV: 'test',
      BACKEND_PORT: '3001',
      PORT: '3100',
      TRUST_PROXY: '2',
      CHATWORK_AUTO_SYNC_ENABLED: '1',
      CHATWORK_NEW_ROOMS_ACTIVE: '0',
      CHATWORK_AUTO_SYNC_ROOM_LIMIT: '25',
      CHATWORK_WEBHOOK_COOLDOWN_SECONDS: '120',
      JOB_WORKER_ENABLED: 'false',
    })

    expect(env.port).toBe(3100)
    expect(env.trustProxy).toBe(2)
    expect(env.chatworkAutoSyncEnabled).toBe(true)
    expect(env.chatworkNewRoomsActive).toBe(false)
    expect(env.chatworkAutoSyncRoomLimit).toBe(25)
    expect(env.chatworkWebhookCooldownMs).toBe(120_000)
    expect(env.jobWorkerEnabled).toBe(false)
  })

  it('throws when JWT_SECRET is invalid in production', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})

    await expect(
      loadEnvModule({
        NODE_ENV: 'production',
        BACKEND_PORT: '3000',
        JWT_SECRET: 'short',
        REDIS_URL: 'redis://localhost:6379',
      })
    ).rejects.toThrow('Invalid environment variables')
  })

  it('throws when REDIS_URL is missing in production', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})

    await expect(
      loadEnvModule({
        NODE_ENV: 'production',
        BACKEND_PORT: '3000',
        JWT_SECRET: '1234567890123456',
        REDIS_URL: '',
      })
    ).rejects.toThrow('REDIS_URL is required in production')
  })

  it('defaults job worker to disabled in production', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { env } = await loadEnvModule({
      NODE_ENV: 'production',
      BACKEND_PORT: '3000',
      JWT_SECRET: '1234567890123456',
      REDIS_URL: 'redis://localhost:6379',
      JOB_WORKER_ENABLED: undefined,
    })

    expect(env.jobWorkerEnabled).toBe(false)
  })
})
