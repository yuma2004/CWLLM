import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const jpPattern = /[ぁ-んァ-ヶ一-龠]/
const testTitlePattern = /\b(?:describe|it|test)\s*\(\s*(["'`])([\s\S]*?)\1/g
const fireEventPattern = /\bfireEvent\b/g
const mockPattern = /\b(?:vi|jest)\.mock\s*\(\s*(["'`])([^"'`]+)\1/g

const targets = [
  {
    dir: 'src',
    matcher: (file) => file.endsWith('.test.ts') || file.endsWith('.test.tsx'),
  },
  {
    dir: 'e2e',
    matcher: (file) => file.endsWith('.spec.ts'),
  },
]

const collectFiles = async (startDir, matcher) => {
  const absoluteDir = path.join(root, startDir)
  const stack = [absoluteDir]
  const files = []
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    let entries
    try {
      entries = await fs.readdir(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(absolutePath)
        continue
      }
      const relative = path.relative(root, absolutePath).replace(/\\/g, '/')
      if (matcher(relative)) {
        files.push(relative)
      }
    }
  }
  return files.sort()
}

const findLine = (content, index) => content.slice(0, index).split(/\r?\n/).length

const violations = []
const addViolation = (rule, file, line, detail) => {
  violations.push({ rule, file, line, detail })
}

const isInternalMockPath = (modulePath) => {
  const normalized = modulePath.replace(/\\/g, '/')
  return normalized.includes('/contexts/') || normalized.includes('/hooks/')
}

const run = async () => {
  const files = []
  for (const target of targets) {
    const collected = await collectFiles(target.dir, target.matcher)
    files.push(...collected)
  }

  if (files.length === 0) {
    console.error('No test files found.')
    process.exit(1)
  }

  for (const file of files) {
    const absolutePath = path.join(root, file)
    const content = await fs.readFile(absolutePath, 'utf8')

    let titleMatch
    while ((titleMatch = testTitlePattern.exec(content)) !== null) {
      const title = titleMatch[2].trim()
      if (!title) continue
      if (!jpPattern.test(title)) {
        addViolation('non_japanese_test_title', file, findLine(content, titleMatch.index), title)
      }
    }

    let fireMatch
    while ((fireMatch = fireEventPattern.exec(content)) !== null) {
      addViolation(
        'fire_event_usage',
        file,
        findLine(content, fireMatch.index),
        'fireEvent is disallowed. Use userEvent.'
      )
    }

    let mockMatch
    while ((mockMatch = mockPattern.exec(content)) !== null) {
      const modulePath = mockMatch[2]
      if (isInternalMockPath(modulePath)) {
        addViolation(
          'internal_hook_or_context_mock',
          file,
          findLine(content, mockMatch.index),
          modulePath
        )
      }
    }
  }

  if (violations.length > 0) {
    console.error(`SKILL violations: ${violations.length}`)
    for (const violation of violations) {
      console.error(
        `${violation.rule}\t${violation.file}:${violation.line}\t${violation.detail}`
      )
    }
    process.exit(1)
  }

  console.log(`SKILL checks passed for ${files.length} files.`)
}

void run()
