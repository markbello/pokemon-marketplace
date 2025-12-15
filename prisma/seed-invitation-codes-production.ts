/**
 * PM-65: Script to generate Pokemon-themed invitation codes for PRODUCTION
 * Run with: npm run db:seed:invitations:remote
 *
 * This version is safe for production - it skips existing codes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Popular Pokemon names for invitation codes
const POKEMON_NAMES = [
  'CHARIZARD',
  'BLASTOISE',
  'VENUSAUR',
  'PIKACHU',
  'MEWTWO',
  'DRAGONITE',
  'GYARADOS',
  'GENGAR',
  'ALAKAZAM',
  'MACHAMP',
  'LAPRAS',
  'SNORLAX',
  'ARTICUNO',
  'ZAPDOS',
  'MOLTRES',
  'EEVEE',
  'JOLTEON',
  'FLAREON',
  'VAPOREON',
  'UMBREON',
  'ESPEON',
  'LUCARIO',
  'GARCHOMP',
  'RAYQUAZA',
  'SALAMENCE',
];

/**
 * Generate a random 4-character hex string
 */
function generateHexSuffix(): string {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0');
}

/**
 * Generate a Pokemon-themed invitation code
 * Format: POKEMONNAME-XXXX (e.g., CHARIZARD-A1B2)
 */
function generateInvitationCode(pokemonName: string): string {
  const suffix = generateHexSuffix();
  return `${pokemonName}-${suffix}`;
}

/**
 * Check if a code already exists
 */
async function codeExists(code: string): Promise<boolean> {
  const existing = await prisma.invitationCode.findUnique({
    where: { code },
  });
  return !!existing;
}

async function seedInvitationCodes() {
  console.log('🎫 Generating Pokemon-themed invitation codes for PRODUCTION...\n');

  // Safety check: Confirm we want to proceed
  const existingCount = await prisma.invitationCode.count();
  console.log(`📊 Current codes in database: ${existingCount}\n`);

  if (existingCount > 0) {
    console.log('⚠️  WARNING: Database already contains invitation codes.');
    console.log('This script will skip existing codes and only add new ones.\n');
  }

  const codes: { code: string; createdBy: string }[] = [];
  const targetCount = 50; // Generate more codes for production
  let attempts = 0;
  const maxAttempts = targetCount * 3; // Prevent infinite loops

  // Generate unique codes
  while (codes.length < targetCount && attempts < maxAttempts) {
    attempts++;
    const pokemonName = POKEMON_NAMES[Math.floor(Math.random() * POKEMON_NAMES.length)];
    const code = generateInvitationCode(pokemonName);

    // Check if code already exists in our list or database
    const isDuplicate = codes.some((c) => c.code === code);
    if (!isDuplicate && !(await codeExists(code))) {
      codes.push({
        code,
        createdBy: 'production-seed',
      });
    }
  }

  if (codes.length === 0) {
    console.log('✅ No new codes to create. All codes already exist.\n');
    return;
  }

  console.log(`📝 Will create ${codes.length} new codes:\n`);

  // Insert codes into database
  let successCount = 0;
  let skipCount = 0;

  for (const codeData of codes) {
    try {
      await prisma.invitationCode.create({
        data: codeData,
      });
      console.log(`✅ Created code: ${codeData.code}`);
      successCount++;
    } catch (error) {
      // Code might have been created between our check and now
      console.log(`⚠️  Skipped code (already exists): ${codeData.code}`);
      skipCount++;
    }
  }

  console.log(`\n✨ Successfully created ${successCount} invitation codes!`);
  if (skipCount > 0) {
    console.log(`⚠️  Skipped ${skipCount} codes (already existed)\n`);
  }

  // Show final summary
  const total = await prisma.invitationCode.count();
  const unused = await prisma.invitationCode.count({
    where: { usedBy: null },
  });
  const used = total - unused;

  console.log('\n📊 Production Database Summary:');
  console.log(`   Total codes: ${total}`);
  console.log(`   Unused: ${unused}`);
  console.log(`   Used: ${used}`);
}

// Run the seed function
seedInvitationCodes()
  .then(() => {
    console.log('\n✅ Production invitation codes seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error seeding invitation codes:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
