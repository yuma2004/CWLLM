import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../utils'

const resetResponseSchema = z.object({
  ok: z.literal(true),
  users: z.object({
    adminEmail: z.string().email(),
    employeeEmail: z.string().email(),
  }),
})

const normalizeEmail = (value: string) => value.trim().toLowerCase()

const getTestCredentials = () => {
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || 'admin@example.com')
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const employeeEmail = normalizeEmail(process.env.E2E_EMPLOYEE_EMAIL || 'employee@example.com')
  const employeePassword = process.env.E2E_EMPLOYEE_PASSWORD || 'password123'

  return {
    adminEmail,
    adminPassword,
    employeeEmail,
    employeePassword,
  }
}

export async function testRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.post(
    '/test/reset',
    {
      schema: {
        response: {
          200: resetResponseSchema,
        },
      },
    },
    async () => {
      const { adminEmail, adminPassword, employeeEmail, employeePassword } =
        getTestCredentials()

      const [adminHash, employeeHash] = await Promise.all([
        bcrypt.hash(adminPassword, 10),
        bcrypt.hash(employeePassword, 10),
      ])

      await prisma.$transaction([
        prisma.feedback.deleteMany(),
        prisma.job.deleteMany(),
        prisma.message.deleteMany(),
        prisma.companyRoomLink.deleteMany(),
        prisma.chatworkRoom.deleteMany(),
        prisma.dealNegotiation.deleteMany(),
        prisma.note.deleteMany(),
        prisma.task.deleteMany(),
        prisma.summary.deleteMany(),
        prisma.wholesale.deleteMany(),
        prisma.project.deleteMany(),
        prisma.contact.deleteMany(),
        prisma.company.deleteMany(),
        prisma.user.deleteMany(),
      ])

      await prisma.user.createMany({
        data: [
          {
            email: adminEmail,
            password: adminHash,
            role: UserRole.admin,
          },
          {
            email: employeeEmail,
            password: employeeHash,
            role: UserRole.employee,
          },
        ],
      })

      return {
        ok: true as const,
        users: {
          adminEmail,
          employeeEmail,
        },
      }
    }
  )
}
