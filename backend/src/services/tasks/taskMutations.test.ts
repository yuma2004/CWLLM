import { TaskStatus } from '@prisma/client'
import { afterEach, describe, expect, it } from 'vitest'
import { prisma } from '../../utils'
import { buildTaskUpdateData, ensureTaskTargetExists } from './taskMutations'

const companyPrefix = `task-mutations-company-${Date.now()}`
const projectPrefix = `task-mutations-project-${Date.now()}`

const createCompany = async (suffix: string) =>
  prisma.company.create({
    data: {
      name: `Task Mutation Company ${suffix}`,
      normalizedName: `${companyPrefix}-${suffix}`,
      status: 'active',
      tags: [],
    },
  })

describe('taskMutations', () => {
  afterEach(async () => {
    await prisma.wholesale.deleteMany({
      where: {
        project: {
          name: {
            startsWith: projectPrefix,
          },
        },
      },
    })
    await prisma.project.deleteMany({
      where: {
        name: {
          startsWith: projectPrefix,
        },
      },
    })
    await prisma.company.deleteMany({
      where: {
        normalizedName: {
          startsWith: companyPrefix,
        },
      },
    })
  })

  it('builds update data for title and description', () => {
    const data = buildTaskUpdateData({
      title: '  Follow up  ',
      description: 'notes',
      status: TaskStatus.in_progress,
      dueDate: undefined,
      updateDueDate: false,
      assigneeId: undefined,
    })

    expect(data).toEqual({
      title: 'Follow up',
      description: 'notes',
      status: TaskStatus.in_progress,
    })
  })

  it('supports disconnecting assignee and clearing dueDate', () => {
    const data = buildTaskUpdateData({
      dueDate: null,
      updateDueDate: true,
      assigneeId: null,
    })

    expect(data).toEqual({
      dueDate: null,
      assignee: { disconnect: true },
    })
  })

  it('supports connecting assignee and setting dueDate', () => {
    const dueDate = new Date('2026-02-01T00:00:00.000Z')
    const data = buildTaskUpdateData({
      dueDate,
      updateDueDate: true,
      assigneeId: 'employee-1',
    })

    expect(data).toEqual({
      dueDate,
      assignee: { connect: { id: 'employee-1' } },
    })
  })

  it('finds company/project/wholesale targets and returns null for missing target', async () => {
    const company = await createCompany('target')
    const project = await prisma.project.create({
      data: {
        companyId: company.id,
        name: `${projectPrefix}-target`,
        status: 'active',
      },
    })
    const wholesale = await prisma.wholesale.create({
      data: {
        projectId: project.id,
        companyId: company.id,
        status: 'active',
      },
    })

    const foundCompany = await ensureTaskTargetExists('company', company.id)
    const foundProject = await ensureTaskTargetExists('project', project.id)
    const foundWholesale = await ensureTaskTargetExists('wholesale', wholesale.id)
    const missing = await ensureTaskTargetExists('company', 'missing-target-id')

    expect(foundCompany?.id).toBe(company.id)
    expect(foundProject?.id).toBe(project.id)
    expect(foundWholesale?.id).toBe(wholesale.id)
    expect(missing).toBeNull()
  })
})
