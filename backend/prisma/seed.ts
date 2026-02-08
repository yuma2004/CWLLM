import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Seed script starting ===')
  console.log('NODE_ENV:', process.env.NODE_ENV)

  // 初期adminユーザーを作成（既に存在する場合はスキップ）
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').trim()
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminRole = (process.env.ADMIN_ROLE || 'admin') as 'admin' | 'employee'

  console.log('Admin email:', adminEmail)
  console.log('Admin role:', adminRole)

  const existingAdmin =
    (await prisma.user.findUnique({
      where: { email: adminEmail },
    })) ??
    (await prisma.user.findFirst({
      where: {
        email: {
          equals: adminEmail,
          mode: 'insensitive',
        },
      },
    }))
  console.log('Existing admin found:', !!existingAdmin)

  if (!existingAdmin) {
    if (!adminPassword) {
      console.log('ADMIN_PASSWORD is not set. Skipping admin user creation.')
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10)
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          role: adminRole,
        },
      })
      console.log('Created admin user:', adminEmail)
    }
  } else if (adminPassword && process.env.NODE_ENV !== 'production') {
    const hashedPassword = await bcrypt.hash(adminPassword, 10)
    await prisma.user.updateMany({
      where: {
        email: {
          equals: adminEmail,
          mode: 'insensitive',
        },
      },
      data: {
        password: hashedPassword,
        role: adminRole,
      },
    })
    console.log('Updated admin user password:', adminEmail)
  }

  // テスト用ユーザー（開発環境のみ）
  if (process.env.NODE_ENV !== 'production') {
    const testUsers = [{ email: 'employee@example.com', role: 'employee' as const }]

    for (const testUser of testUsers) {
      const existing = await prisma.user.findUnique({
        where: { email: testUser.email },
      })

      if (!existing) {
        const hashedPassword = await bcrypt.hash('password123', 10)
        await prisma.user.create({
          data: {
            email: testUser.email,
            password: hashedPassword,
            role: testUser.role,
          },
        })
        console.log(`Created test user: ${testUser.email}`)
      }
    }
  }
}

main()
  .then(() => {
    console.log('=== Seed script completed successfully ===')
  })
  .catch((e) => {
    console.error('=== Seed script failed ===')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
