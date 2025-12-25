import { describe, it, expect, afterEach } from 'vitest'
import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Prisma constraints', () => {
  afterEach(async () => {
    await prisma.message.deleteMany()
    await prisma.chatworkRoom.deleteMany()
    await prisma.wholesale.deleteMany()
    await prisma.project.deleteMany()
    await prisma.company.deleteMany()
  })

  it('has seeded users', async () => {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: [adminEmail, 'sales@example.com', 'ops@example.com', 'readonly@example.com'],
        },
      },
    })

    const emails = users.map((user) => user.email).sort()
    expect(emails).toEqual(
      [adminEmail, 'ops@example.com', 'readonly@example.com', 'sales@example.com'].sort()
    )
  })

  it('prevents duplicate messages by roomId and messageId', async () => {
    const room = await prisma.chatworkRoom.create({
      data: {
        roomId: `room-${Date.now()}`,
        name: 'Test Room',
      },
    })

    await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: 'msg-1',
        sender: 'tester',
        body: 'hello',
        sentAt: new Date(),
      },
    })

    let error: unknown = null
    try {
      await prisma.message.create({
        data: {
          chatworkRoomId: room.id,
          roomId: room.roomId,
          messageId: 'msg-1',
          sender: 'tester',
          body: 'duplicate',
          sentAt: new Date(),
        },
      })
    } catch (err) {
      error = err
    }

    expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      expect(error.code).toBe('P2002')
    }
  })

  it('requires project for wholesale', async () => {
    const company = await prisma.company.create({
      data: {
        name: 'Wholesale Corp',
        normalizedName: 'wholesalecorp',
        status: 'active',
        tags: [],
      },
    })

    const project = await prisma.project.create({
      data: {
        companyId: company.id,
        name: 'Project A',
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

    expect(wholesale.projectId).toBe(project.id)

    let error: unknown = null
    try {
      await prisma.wholesale.create({
        data: {
          projectId: 'invalid-project-id',
          companyId: company.id,
          status: 'active',
        },
      })
    } catch (err) {
      error = err
    }

    expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      expect(error.code).toBe('P2003')
    }
  })
})
