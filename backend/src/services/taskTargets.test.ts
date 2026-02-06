import type { TargetType } from '@prisma/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../utils'
import { attachTargetInfo } from './taskTargets'

type TaskInput = {
  id: string
  targetType: TargetType
  targetId: string
}

describe('attachTargetInfo', () => {
  let companyIds: string[] = []
  let projectIds: string[] = []
  let wholesaleIds: string[] = []

  beforeEach(() => {
    companyIds = []
    projectIds = []
    wholesaleIds = []
  })

  afterEach(async () => {
    if (wholesaleIds.length > 0) {
      await prisma.wholesale.deleteMany({ where: { id: { in: wholesaleIds } } })
    }
    if (projectIds.length > 0) {
      await prisma.project.deleteMany({ where: { id: { in: projectIds } } })
    }
    if (companyIds.length > 0) {
      await prisma.company.deleteMany({ where: { id: { in: companyIds } } })
    }
  })

  it('returns empty array when no task exists', async () => {
    expect(await attachTargetInfo([])).toEqual([])
  })

  it('attaches names for known target types and falls back to id when unknown', async () => {
    const company = await prisma.company.create({
      data: {
        name: `TaskTarget Company ${Date.now()}`,
        normalizedName: `tasktarget-company-${Date.now()}`,
        status: 'active',
        tags: [],
      },
    })
    companyIds.push(company.id)

    const project = await prisma.project.create({
      data: {
        companyId: company.id,
        name: `TaskTarget Project ${Date.now()}`,
        status: 'active',
      },
    })
    projectIds.push(project.id)

    const wholesale = await prisma.wholesale.create({
      data: {
        companyId: company.id,
        projectId: project.id,
        status: 'active',
      },
    })
    wholesaleIds.push(wholesale.id)

    const tasks: TaskInput[] = [
      { id: 't-company', targetType: 'company', targetId: company.id },
      { id: 't-project', targetType: 'project', targetId: project.id },
      { id: 't-wholesale', targetType: 'wholesale', targetId: wholesale.id },
      { id: 't-general', targetType: 'general', targetId: 'general' },
      { id: 't-missing', targetType: 'company', targetId: 'missing-company-id' },
    ]

    const enriched = await attachTargetInfo(tasks)
    const byId = new Map(enriched.map((item) => [item.id, item]))

    expect(byId.get('t-company')?.target.name).toBe(company.name)
    expect(byId.get('t-project')?.target.name).toBe(project.name)
    expect(byId.get('t-wholesale')?.target.name).toBe(company.name)
    expect(byId.get('t-missing')?.target.name).toBe('missing-company-id')

    const general = byId.get('t-general')
    expect(general?.target.type).toBe('general')
    expect(general?.target.name.length ?? 0).toBeGreaterThan(0)
    expect(general?.target.name).not.toBe('general')
  })
})
