import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const stripQuotes = (value: string) => value.replace(/^['"]|['"]$/g, '')

export const loadRootEnv = () => {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url))
  const envPath = path.resolve(moduleDir, '..', '..', '.env')
  if (!fs.existsSync(envPath)) {
    return {}
  }

  const content = fs.readFileSync(envPath, 'utf8')
  const env: Record<string, string> = {}

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }
    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    env[key] = stripQuotes(rawValue)
  }

  return env
}
