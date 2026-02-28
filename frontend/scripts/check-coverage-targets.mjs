import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const coveragePath = path.join(root, 'coverage', 'coverage-final.json')

const globalThresholds = {
  statements: 83,
  lines: 83,
  branches: 75,
  functions: 62,
}

const fileStatementThresholds = {
  'src/hooks/useFilterForm.ts': 95,
  'src/hooks/useFormState.ts': 95,
  'src/components/Layout.tsx': 85,
  'src/components/companies/CompanyProjectsTab.tsx': 90,
  'src/components/companies/CompanyWholesalesTab.tsx': 90,
  'src/components/companies/CompanySummariesTab.tsx': 90,
  'src/components/companies/CompanyTasksSection.tsx': 85,
  'src/components/companies/CompanyOverviewTab.tsx': 75,
  'src/components/companies/CompanyContactsSection.tsx': 75,
  'src/hooks/useCompanyContacts.ts': 70,
  'src/pages/Projects.tsx': 85,
}

const normalizePath = (value) => value.replace(/\\/g, '/')
const toPercent = (covered, total) => (total === 0 ? 100 : (covered / total) * 100)

const getCoverageStats = (entry) => {
  const statements = Object.values(entry.s ?? {})
  const functions = Object.values(entry.f ?? {})
  const branches = Object.values(entry.b ?? {}).flat()
  const coveredStatements = statements.filter((count) => count > 0).length
  const coveredFunctions = functions.filter((count) => count > 0).length
  const coveredBranches = branches.filter((count) => count > 0).length
  return {
    statements: { covered: coveredStatements, total: statements.length },
    lines: { covered: coveredStatements, total: statements.length },
    functions: { covered: coveredFunctions, total: functions.length },
    branches: { covered: coveredBranches, total: branches.length },
  }
}

if (!fs.existsSync(coveragePath)) {
  console.error(`Coverage file is missing: ${coveragePath}`)
  process.exit(1)
}

const raw = fs.readFileSync(coveragePath, 'utf8')
const coverage = JSON.parse(raw)
const entries = Object.entries(coverage)

const appEntries = entries.filter(([filePath]) => {
  const normalized = normalizePath(filePath)
  return (
    normalized.includes('/src/') &&
    !normalized.includes('/src/test/') &&
    !normalized.endsWith('.test.ts') &&
    !normalized.endsWith('.test.tsx')
  )
})

if (appEntries.length === 0) {
  console.error('No app coverage entries found in coverage-final.json')
  process.exit(1)
}

const totals = {
  statements: { covered: 0, total: 0 },
  lines: { covered: 0, total: 0 },
  functions: { covered: 0, total: 0 },
  branches: { covered: 0, total: 0 },
}

for (const [, entry] of appEntries) {
  const stats = getCoverageStats(entry)
  totals.statements.covered += stats.statements.covered
  totals.statements.total += stats.statements.total
  totals.lines.covered += stats.lines.covered
  totals.lines.total += stats.lines.total
  totals.functions.covered += stats.functions.covered
  totals.functions.total += stats.functions.total
  totals.branches.covered += stats.branches.covered
  totals.branches.total += stats.branches.total
}

const failures = []

for (const [metric, threshold] of Object.entries(globalThresholds)) {
  const current = toPercent(totals[metric].covered, totals[metric].total)
  if (current < threshold) {
    failures.push(
      `Global ${metric}: ${current.toFixed(2)}% < ${threshold.toFixed(2)}%`
    )
  } else {
    console.log(`Global ${metric}: ${current.toFixed(2)}% (>= ${threshold.toFixed(2)}%)`)
  }
}

for (const [target, threshold] of Object.entries(fileStatementThresholds)) {
  const normalizedTarget = normalizePath(path.join(root, target))
  const entry = entries.find(([filePath]) => normalizePath(filePath) === normalizedTarget)
  if (!entry) {
    failures.push(`File coverage missing: ${target}`)
    continue
  }
  const stats = getCoverageStats(entry[1])
  const statements = toPercent(stats.statements.covered, stats.statements.total)
  if (statements < threshold) {
    failures.push(
      `${target} statements: ${statements.toFixed(2)}% < ${threshold.toFixed(2)}%`
    )
  } else {
    console.log(
      `${target} statements: ${statements.toFixed(2)}% (>= ${threshold.toFixed(2)}%)`
    )
  }
}

if (failures.length > 0) {
  console.error('\nCoverage threshold failures:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('\nCoverage thresholds passed.')
