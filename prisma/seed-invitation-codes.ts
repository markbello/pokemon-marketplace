/**
 * PM-65: Script to generate Pokemon-themed invitation codes
 * Run with: npm run db:seed-invitations
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

async function seedInvitationCodes() {
  console.log('🎫 Generating Pokemon-themed invitation codes...\n');

  const codes: { code: string; createdBy: string }[] = [];

  // Generate 20 unique codes
  for (let i = 0; i < 20; i++) {
    const pokemonName = POKEMON_NAMES[i % POKEMON_NAMES.length];
    const code = generateInvitationCode(pokemonName);
    codes.push({
      code,
      createdBy: 'system',
    });
  }

  // Insert codes into database
  try {
    for (const codeData of codes) {
      await prisma.invitationCode.create({
        data: codeData,
      });
      console.log(`✅ Created code: ${codeData.code}`);
    }

    console.log(`\n✨ Successfully created ${codes.length} invitation codes!\n`);

    // Show summary
    const total = await prisma.invitationCode.count();
    const unused = await prisma.invitationCode.count({
      where: { usedBy: null },
    });
    const used = total - unused;

    console.log('📊 Summary:');
    console.log(`   Total codes: ${total}`);
    console.log(`   Unused: ${unused}`);
    console.log(`   Used: ${used}`);
  } catch (error) {
    console.error('❌ Error creating invitation codes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedInvitationCodes()
  .then(() => {
    console.log('\n✅ Invitation codes seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error seeding invitation codes:', error);
    process.exit(1);
  });
