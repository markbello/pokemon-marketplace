/**
 * Script to mark failed migration as rolled back in production
 * Run with: npx tsx scripts/rollback-failed-migration.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function rollbackFailedMigration() {
  try {
    console.log('Marking failed migration as rolled back...');

    const result = await prisma.$executeRaw`
      UPDATE "_prisma_migrations"
      SET rolled_back_at = NOW(),
          finished_at = NOW(),
          logs = 'Manually rolled back - replaced with idempotent migration 20251215230330'
      WHERE migration_name = '20251215200000_add_shipping_and_invitation_codes'
        AND rolled_back_at IS NULL
    `;

    console.log(`✓ Updated ${result} migration record(s)`);

    // Verify the update
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, rolled_back_at, finished_at, logs
      FROM "_prisma_migrations"
      WHERE migration_name LIKE '20251215%'
      ORDER BY started_at DESC
    `;

    console.log('\nCurrent migration status:');
    console.table(migrations);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

rollbackFailedMigration();

