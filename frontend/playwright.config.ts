import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'
import { loadRootEnv } from './e2e/env'

const rootEnv = loadRootEnv()
const configDir = path.dirname(fileURLToPath(import.meta.url))
const backendPort = rootEnv.BACKEND_PORT || '3000'
const databaseUrl = rootEnv.DATABASE_URL_TEST || rootEnv.DATABASE_URL || ''
const adminEmail = rootEnv.ADMIN_EMAIL || 'admin@example.com'
const adminPassword = rootEnv.ADMIN_PASSWORD || 'admin123'
const mockChatworkPort = rootEnv.MOCK_CHATWORK_PORT || '9101'
const chatworkBaseUrl =
  rootEnv.CHATWORK_API_BASE_URL || `http://localhost:${mockChatworkPort}/v2`

process.env.E2E_ADMIN_EMAIL ||= adminEmail
process.env.E2E_ADMIN_PASSWORD ||= adminPassword

const baseEnv = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  NODE_ENV: 'test',
  CHATWORK_API_TOKEN: rootEnv.CHATWORK_API_TOKEN || 'mock-token',
  CHATWORK_API_BASE_URL: chatworkBaseUrl,
  BACKEND_PORT: backendPort,
  ADMIN_EMAIL: adminEmail,
  ADMIN_PASSWORD: adminPassword,
  ADMIN_ROLE: rootEnv.ADMIN_ROLE || 'admin',
  E2E_ADMIN_EMAIL: adminEmail,
  E2E_ADMIN_PASSWORD: adminPassword,
}

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node e2e/mock-chatwork-server.js',
      url: `http://localhost:${mockChatworkPort}/healthz`,
      reuseExistingServer: false,
      env: {
        ...process.env,
        MOCK_CHATWORK_PORT: mockChatworkPort,
      },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_MOCK_AUTH: 'false',
      },
    },
    {
      command: 'npm run dev:e2e',
      url: `http://localhost:${backendPort}/healthz`,
      reuseExistingServer: false,
      env: baseEnv,
      cwd: path.resolve(configDir, '..', 'backend'),
    },
  ],
})
