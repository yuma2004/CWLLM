import { TargetType } from '@prisma/client'
import { prisma } from '../utils/prisma'

type TaskTarget = {
  targetType: TargetType
  targetId: string
}

type TaskTargetInfo = {
  id: string
  type: TargetType
  name: string
}

export const attachTargetInfo = async <T extends TaskTarget>(
  items: T[]
): Promise<Array<T & { target: TaskTargetInfo }>> => {
  if (items.length === 0) return []

  const companyIds = new Set<string>()
  const projectIds = new Set<string>()
  const wholesaleIds = new Set<string>()

  items.forEach((task) => {
    if (task.targetType === 'company') companyIds.add(task.targetId)
    if (task.targetType === 'project') projectIds.add(task.targetId)
    if (task.targetType === 'wholesale') wholesaleIds.add(task.targetId)
  })

  const [companies, projects, wholesales] = await Promise.all([
    companyIds.size > 0
      ? prisma.company.findMany({
          where: { id: { in: Array.from(companyIds) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    projectIds.size > 0
      ? prisma.project.findMany({
          where: { id: { in: Array.from(projectIds) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    wholesaleIds.size > 0
      ? prisma.wholesale.findMany({
          where: { id: { in: Array.from(wholesaleIds) } },
          select: { id: true, company: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ])

  const companyMap = new Map(companies.map((company) => [company.id, company.name]))
  const projectMap = new Map(projects.map((project) => [project.id, project.name]))
  const wholesaleMap = new Map(
    wholesales.map((wholesale) => [wholesale.id, wholesale.company?.name ?? wholesale.id])
  )

  return items.map((task) => {
    const targetName =
      task.targetType === 'company'
        ? companyMap.get(task.targetId)
        : task.targetType === 'project'
          ? projectMap.get(task.targetId)
          : wholesaleMap.get(task.targetId)

    return {
      ...task,
      target: {
        id: task.targetId,
        type: task.targetType,
        name: targetName ?? task.targetId,
      },
    }
  })
}
