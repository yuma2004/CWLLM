import { PrismaClient } from '@prisma/client'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { mergeCompanies } from './companyMutations'

const prisma = new PrismaClient()
let sequence = 0

const createCompany = async (name: string) => {
  sequence += 1
  return prisma.company.create({
    data: {
      name,
      normalizedName: `company-mutations-${sequence}`,
      status: 'active',
      tags: [],
    },
  })
}

const cleanupDatabase = async () => {
  await prisma.task.deleteMany()
  await prisma.summary.deleteMany()
  await prisma.message.deleteMany()
  await prisma.companyRoomLink.deleteMany()
  await prisma.chatworkRoom.deleteMany()
  await prisma.wholesale.deleteMany()
  await prisma.project.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.company.deleteMany({
    where: {
      normalizedName: {
        startsWith: 'company-mutations-',
      },
    },
  })
}

describe('mergeCompanies', () => {
  afterEach(async () => {
    await cleanupDatabase()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('関連データを移管し重複ルームリンクを解消する', async () => {
    const target = await createCompany('Target')
    const source = await createCompany('Source')

    await prisma.company.update({
      where: { id: target.id },
      data: {
        tags: ['existing'],
        ownerIds: ['owner-a'],
        category: 'cat-a',
        profile: 'profile-a',
      },
    })
    await prisma.company.update({
      where: { id: source.id },
      data: {
        tags: ['incoming'],
        ownerIds: ['owner-b'],
        category: 'cat-b',
        profile: 'profile-b',
      },
    })

    const project = await prisma.project.create({
      data: {
        companyId: source.id,
        name: 'Merged Project',
        status: 'active',
      },
    })

    const wholesale = await prisma.wholesale.create({
      data: {
        companyId: source.id,
        projectId: project.id,
        status: 'active',
      },
    })

    const roomA = await prisma.chatworkRoom.create({
      data: {
        roomId: `mut-room-a-${Date.now()}`,
        name: 'Room A',
      },
    })
    const roomB = await prisma.chatworkRoom.create({
      data: {
        roomId: `mut-room-b-${Date.now()}`,
        name: 'Room B',
      },
    })

    await prisma.companyRoomLink.createMany({
      data: [
        { companyId: target.id, chatworkRoomId: roomA.id },
        { companyId: source.id, chatworkRoomId: roomA.id },
        { companyId: source.id, chatworkRoomId: roomB.id },
      ],
    })

    await prisma.message.create({
      data: {
        chatworkRoomId: roomA.id,
        roomId: roomA.roomId,
        messageId: 'm-1',
        sender: 'sender',
        body: 'body',
        sentAt: new Date(),
        companyId: source.id,
      },
    })
    await prisma.summary.create({
      data: {
        companyId: source.id,
        periodStart: new Date('2026-02-01T00:00:00.000Z'),
        periodEnd: new Date('2026-02-10T00:00:00.000Z'),
        content: 'summary',
        type: 'manual',
        sourceLinks: [],
      },
    })
    await prisma.task.create({
      data: {
        targetType: 'company',
        targetId: source.id,
        title: 'task',
        status: 'todo',
      },
    })

    const merged = await mergeCompanies(target.id, source.id)
    expect(merged).not.toBeNull()
    expect(merged?.tags).toEqual(expect.arrayContaining(['existing', 'incoming']))
    expect(merged?.ownerIds).toEqual(expect.arrayContaining(['owner-a', 'owner-b']))
    expect(merged?.category).toBe('cat-a')
    expect(merged?.profile).toBe('profile-a')

    const sourceAfter = await prisma.company.findUnique({ where: { id: source.id } })
    expect(sourceAfter).toBeNull()

    const movedProject = await prisma.project.findUnique({ where: { id: project.id } })
    expect(movedProject?.companyId).toBe(target.id)

    const movedWholesale = await prisma.wholesale.findUnique({ where: { id: wholesale.id } })
    expect(movedWholesale?.companyId).toBe(target.id)

    const movedMessage = await prisma.message.findFirst({ where: { messageId: 'm-1' } })
    expect(movedMessage?.companyId).toBe(target.id)

    const movedSummary = await prisma.summary.findFirst({ where: { content: 'summary' } })
    expect(movedSummary?.companyId).toBe(target.id)

    const movedTask = await prisma.task.findFirst({ where: { title: 'task' } })
    expect(movedTask?.targetId).toBe(target.id)

    const links = await prisma.companyRoomLink.findMany({
      where: { companyId: target.id },
      orderBy: { chatworkRoomId: 'asc' },
    })
    expect(links).toHaveLength(2)
    const roomIds = links.map((link) => link.chatworkRoomId)
    expect(roomIds).toEqual(expect.arrayContaining([roomA.id, roomB.id]))
  })

  it('対象会社が見つからない場合はnullを返す', async () => {
    const source = await createCompany('Source-only')
    const result = await mergeCompanies('missing-target', source.id)
    expect(result).toBeNull()
  })

  it('マージ元会社が見つからない場合はnullを返す', async () => {
    const target = await createCompany('Target-only')
    const result = await mergeCompanies(target.id, 'missing-source')
    expect(result).toBeNull()
  })
})
