// Agent: 🖥️ Agent B (Server)
// File: packages/server/prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const seedPassword = process.env.SEED_USER_PASSWORD || 'TestPass123';
  const hash = await bcrypt.hash(seedPassword, 12);
  
  await prisma.user.upsert({
    where: { email: 'arjun@test.com' },
    update: {},
    create: {
      email: 'arjun@test.com',
      passwordHash: hash,
      displayName: 'Arjun (Dev)',
    },
  });
  
  console.log('🌱 Database seeded with test user arjun@test.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
