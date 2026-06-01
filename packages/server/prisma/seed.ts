// Agent: 🖥️ Agent B (Server)
// File: packages/server/prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('TestPass123', 12);
  
  await prisma.user.upsert({
    where: { email: 'arjun@test.com' },
    update: {},
    create: {
      email: 'arjun@test.com',
      passwordHash: hash,
      displayName: 'Arjun (Dev)',
    },
  });
  
  console.log('🌱 Database seeded with user arjun@test.com (password: TestPass123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
