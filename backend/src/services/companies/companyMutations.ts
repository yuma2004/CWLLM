import { CACHE_KEYS, deleteCache, generateSortKey, prisma } from '../../utils'

export const mergeCompanies = async (
  targetCompanyId: string,
  sourceCompanyId: string
) => {
  const [targetCompany, sourceCompany] = await prisma.$transaction([
    prisma.company.findUnique({ where: { id: targetCompanyId } }),
    prisma.company.findUnique({ where: { id: sourceCompanyId } }),
  ])

  if (!targetCompany || !sourceCompany) {
    return null
  }

  const mergedTags = Array.from(
    new Set([...(targetCompany.tags ?? []), ...(sourceCompany.tags ?? [])])
  )
  const mergedOwnerIds = Array.from(
    new Set([...(targetCompany.ownerIds ?? []), ...(sourceCompany.ownerIds ?? [])])
  )
  const mergedCategory = targetCompany.category ?? sourceCompany.category ?? null
  const mergedProfile = targetCompany.profile ?? sourceCompany.profile ?? null

  const updatedCompany = await prisma.$transaction(async (tx) => {
    const sourceContacts = await tx.contact.findMany({
      where: { companyId: sourceCompanyId },
      orderBy: [{ sortKey: 'asc' }, { createdAt: 'asc' }],
    })

    for (const contact of sourceContacts) {
      await tx.contact.update({
        where: { id: contact.id },
        data: {
          companyId: targetCompanyId,
          sortKey: generateSortKey(),
        },
      })
    }

    await tx.project.updateMany({
      where: { companyId: sourceCompanyId },
      data: { companyId: targetCompanyId },
    })
    await tx.wholesale.updateMany({
      where: { companyId: sourceCompanyId },
      data: { companyId: targetCompanyId },
    })
    await tx.message.updateMany({
      where: { companyId: sourceCompanyId },
      data: { companyId: targetCompanyId },
    })
    await tx.summary.updateMany({
      where: { companyId: sourceCompanyId },
      data: { companyId: targetCompanyId },
    })

    const targetRoomLinks = await tx.companyRoomLink.findMany({
      where: { companyId: targetCompanyId },
      select: { chatworkRoomId: true },
    })
    const targetRoomIds = new Set(targetRoomLinks.map((link) => link.chatworkRoomId))
    const sourceRoomLinks = await tx.companyRoomLink.findMany({
      where: { companyId: sourceCompanyId },
      select: { id: true, chatworkRoomId: true },
    })
    for (const link of sourceRoomLinks) {
      if (targetRoomIds.has(link.chatworkRoomId)) {
        await tx.companyRoomLink.delete({ where: { id: link.id } })
      } else {
        await tx.companyRoomLink.update({
          where: { id: link.id },
          data: { companyId: targetCompanyId },
        })
      }
    }

    await tx.task.updateMany({
      where: { targetType: 'company', targetId: sourceCompanyId },
      data: { targetId: targetCompanyId },
    })

    const company = await tx.company.update({
      where: { id: targetCompanyId },
      data: {
        tags: mergedTags,
        ownerIds: mergedOwnerIds,
        category: mergedCategory,
        profile: mergedProfile,
      },
    })

    await tx.company.delete({ where: { id: sourceCompanyId } })

    return company
  })

  deleteCache(CACHE_KEYS.companyOptions)

  return updatedCompany
}
