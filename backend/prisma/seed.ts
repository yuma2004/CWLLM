import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 初期adminユーザーを作成（既に存在する場合はスキップ）
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const adminRole = (process.env.ADMIN_ROLE || 'admin') as 'admin' | 'sales' | 'ops' | 'readonly'
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  const hashedPassword = await bcrypt.hash(adminPassword, 10)
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: adminRole,
      },
    })
    console.log('Created admin user:', adminEmail)
  } else {
    // パスワードを更新（bcrypt→bcryptjs移行対応）
    await prisma.user.update({
      where: { email: adminEmail },
      data: { password: hashedPassword },
    })
    console.log('Updated admin user password:', adminEmail)
  }

  // テスト用ユーザー（開発環境のみ）
  if (process.env.NODE_ENV !== 'production') {
    const testUsers = [
      { email: 'sales@example.com', role: 'sales' as const },
      { email: 'ops@example.com', role: 'ops' as const },
      { email: 'readonly@example.com', role: 'readonly' as const },
    ]

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
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
