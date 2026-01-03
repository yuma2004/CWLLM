import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadRootEnv } from './env'

const runCommand = (
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv }
) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`))
      }
    })
  })

export default async function globalSetup() {
  const rootEnv = loadRootEnv()
  const databaseUrl = rootEnv.DATABASE_URL_TEST || rootEnv.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL_TEST or DATABASE_URL is required for E2E setup')
  }

  const moduleDir = path.dirname(fileURLToPath(import.meta.url))
  const backendDir = path.resolve(moduleDir, '..', '..', 'backend')
  const npmCommand = 'npm'
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    NODE_ENV: 'test',
    ADMIN_EMAIL: rootEnv.ADMIN_EMAIL || 'admin@example.com',
    ADMIN_PASSWORD: rootEnv.ADMIN_PASSWORD || 'admin123',
    ADMIN_ROLE: rootEnv.ADMIN_ROLE || 'admin',
  }

  await runCommand(npmCommand, ['run', 'migrate:deploy'], { cwd: backendDir, env })
  await runCommand(npmCommand, ['run', 'seed'], { cwd: backendDir, env })
}
