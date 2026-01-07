import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prismaBin = path.resolve(__dirname, '../../node_modules/.bin/prisma')
const tsxBin = path.resolve(__dirname, '../../node_modules/.bin/tsx')

const loadEnv = () => {
  // Prefer backend/.env, but also fall back to repo root .env so tests work without duplication
  dotenv.config({ path: path.resolve(__dirname, '../../.env') })
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') })
}

const ensureTestDatabase = async (databaseUrl: string) => {
  const url = new URL(databaseUrl)
  const dbName = url.pathname.replace(/^\//, '')
  const adminUrl = new URL(databaseUrl)
  adminUrl.pathname = '/postgres'

  const adminClient = new PrismaClient({
    datasources: {
      db: { url: adminUrl.toString() },
    },
  })

  try {
    const existing = await adminClient.$queryRaw`SELECT 1 FROM pg_database WHERE datname = ${dbName}`
    if (Array.isArray(existing) && existing.length === 0) {
      await adminClient.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`)
    }
  } finally {
    await adminClient.$disconnect()
  }
}

export default async function globalSetup() {
  loadEnv()

  if (!process.env.DATABASE_URL_TEST) {
    throw new Error('DATABASE_URL_TEST is not set')
  }

  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST
  process.env.NODE_ENV = 'test'

  await ensureTestDatabase(process.env.DATABASE_URL_TEST)

  execSync(`"${prismaBin}" migrate reset --force --skip-seed --skip-generate`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL_TEST,
    },
  })

  execSync(`"${tsxBin}" prisma/seed.ts`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL_TEST,
      NODE_ENV: 'test',
    },
  })
}
