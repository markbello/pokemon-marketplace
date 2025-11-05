import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test users (simulating Auth0 cached data)
  const testUsers = [
    {
      id: 'auth0|test-user-1',
      displayName: 'PokeMaster2024',
      avatarUrl: 'https://example.com/avatar1.jpg',
    },
    {
      id: 'auth0|test-user-2',
      displayName: 'CardCollector',
      avatarUrl: 'https://example.com/avatar2.jpg',
    },
    {
      id: 'auth0|test-user-3',
      displayName: 'TrainerAlex',
      avatarUrl: 'https://example.com/avatar3.jpg',
    },
  ];

  for (const user of testUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

