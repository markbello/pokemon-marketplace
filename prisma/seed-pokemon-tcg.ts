import { PrismaClient, CardGameType, Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

// Path to pokemon-tcg-data directory
const POKEMON_TCG_DATA_DIR = path.join(process.cwd(), 'pokemon-tcg-data');
const SETS_FILE = path.join(POKEMON_TCG_DATA_DIR, 'sets', 'en.json');
const CARDS_DIR = path.join(POKEMON_TCG_DATA_DIR, 'cards', 'en');

interface SetData {
  id: string;
  name: string;
  series: string;
  printedTotal?: number;
  total: number;
  ptcgoCode?: string;
  releaseDate?: string;
  updatedAt?: string;
  images?: {
    symbol?: string;
    logo?: string;
  };
  legalities?: Record<string, string>;
}

interface CardData {
  id: string;
  name: string;
  supertype: string;
  subtypes: string[];
  number: string;
  images?: {
    small?: string;
    large?: string;
  };
  artist?: string;
  rarity?: string;
  flavorText?: string;
  // Pokemon-specific fields that go into cardData JSON
  hp?: string;
  types?: string[];
  evolvesFrom?: string;
  evolvesTo?: string[];
  attacks?: unknown[];
  abilities?: unknown[];
  weaknesses?: unknown[];
  resistances?: unknown[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  level?: string;
  // Metadata fields
  regulationMark?: string;
  nationalPokedexNumbers?: number[];
  legalities?: Record<string, string>;
  // Any other fields we want to preserve
  [key: string]: unknown;
}

async function seedSets() {
  console.log('📦 Loading sets...');
  const setsData: SetData[] = JSON.parse(fs.readFileSync(SETS_FILE, 'utf-8'));

  console.log(`Found ${setsData.length} sets to seed`);

  let created = 0;
  let updated = 0;

  for (const set of setsData) {
    const setData = {
      id: set.id,
      gameType: CardGameType.POKEMON,
      name: set.name,
      series: set.series,
      printedTotal: set.printedTotal ?? null,
      total: set.total,
      ptcgoCode: set.ptcgoCode ?? null,
      releaseDate: set.releaseDate ?? null,
      updatedAt: set.updatedAt ?? null,
      logoUrl: set.images?.logo ?? null,
      symbolUrl: set.images?.symbol ?? null,
      legalities: set.legalities
        ? (set.legalities as Prisma.InputJsonValue)
        : undefined,
    };

    const existing = await prisma.pokemonSet.findUnique({
      where: { id: set.id },
    });

    if (existing) {
      await prisma.pokemonSet.update({
        where: { id: set.id },
        data: setData,
      });
      updated++;
    } else {
      await prisma.pokemonSet.create({ data: setData });
      created++;
    }
  }

  console.log(`✅ Sets: ${created} created, ${updated} updated`);
  return setsData;
}

async function seedCards(sets: SetData[]) {
  console.log('\n🃏 Loading cards...');

  let totalCards = 0;
  let created = 0;
  let updated = 0;
  let cardsCreated = 0;
  let cardsUpdated = 0;
  let errors = 0;

  for (const set of sets) {
    const cardsFile = path.join(CARDS_DIR, `${set.id}.json`);

    // Skip if cards file doesn't exist
    if (!fs.existsSync(cardsFile)) {
      console.log(`⚠️  Cards file not found for set ${set.id}, skipping...`);
      continue;
    }

    try {
      const cardsData: CardData[] = JSON.parse(
        fs.readFileSync(cardsFile, 'utf-8'),
      );

      console.log(`  Processing set ${set.id} (${set.name}): ${cardsData.length} cards`);

      for (const card of cardsData) {
        try {
          // Extract cardData (Pokemon-specific fields)
          const cardData: Record<string, unknown> = {};
          if (card.hp) cardData.hp = card.hp;
          if (card.types) cardData.types = card.types;
          if (card.evolvesFrom) cardData.evolvesFrom = card.evolvesFrom;
          if (card.evolvesTo) cardData.evolvesTo = card.evolvesTo;
          if (card.attacks) cardData.attacks = card.attacks;
          if (card.abilities) cardData.abilities = card.abilities;
          if (card.weaknesses) cardData.weaknesses = card.weaknesses;
          if (card.resistances) cardData.resistances = card.resistances;
          if (card.retreatCost) cardData.retreatCost = card.retreatCost;
          if (card.convertedRetreatCost !== undefined)
            cardData.convertedRetreatCost = card.convertedRetreatCost;
          if (card.level) cardData.level = card.level;

          // Extract metadata
          const metadata: Record<string, unknown> = {};
          if (card.regulationMark) metadata.regulationMark = card.regulationMark;
          if (card.nationalPokedexNumbers)
            metadata.nationalPokedexNumbers = card.nationalPokedexNumbers;
          if (card.legalities) metadata.legalities = card.legalities;

          const pokemonCardData = {
            id: card.id,
            pokemonSetId: set.id,
            name: card.name,
            supertype: card.supertype,
            subtypes: card.subtypes,
            number: card.number,
            cardData:
              Object.keys(cardData).length > 0
                ? (cardData as Prisma.InputJsonValue)
                : undefined,
            metadata:
              Object.keys(metadata).length > 0
                ? (metadata as Prisma.InputJsonValue)
                : undefined,
            imageSmallUrl: card.images?.small ?? null,
            imageLargeUrl: card.images?.large ?? null,
            artist: card.artist ?? null,
            rarity: card.rarity ?? null,
            flavorText: card.flavorText ?? null,
          };

          const existing = await prisma.pokemonCard.findUnique({
            where: { id: card.id },
          });

          if (existing) {
            await prisma.pokemonCard.update({
              where: { id: card.id },
              data: pokemonCardData,
            });
            updated++;
          } else {
            await prisma.pokemonCard.create({ data: pokemonCardData });
            created++;
          }

          // Create generic Card record for this PokemonCard
          const existingCard = await prisma.card.findFirst({
            where: {
              pokemonCardId: card.id,
            },
          });

          if (existingCard) {
            await prisma.card.update({
              where: { id: existingCard.id },
              data: {
                gameType: CardGameType.POKEMON,
                pokemonCardId: card.id,
              },
            });
            cardsUpdated++;
          } else {
            await prisma.card.create({
              data: {
                gameType: CardGameType.POKEMON,
                pokemonCardId: card.id,
              },
            });
            cardsCreated++;
          }

          totalCards++;
        } catch (error) {
          console.error(`    ❌ Error processing card ${card.id}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error(`  ❌ Error processing set ${set.id}:`, error);
      errors++;
    }
  }

  console.log(`\n✅ Cards: ${created} created, ${updated} updated`);
  console.log(`✅ Generic Cards: ${cardsCreated} created, ${cardsUpdated} updated`);
  console.log(`📊 Total: ${totalCards} cards processed`);
  if (errors > 0) {
    console.log(`⚠️  ${errors} errors encountered`);
  }
}

async function ensurePokemonDataExists() {
  if (!fs.existsSync(POKEMON_TCG_DATA_DIR)) {
    console.log('📦 pokemon-tcg-data directory not found. Cloning repository...');

    try {
      // Check if git is available
      execSync('git --version', { stdio: 'ignore' });

      // Clone with shallow copy for speed (only latest commit)
      execSync(
        `git clone --depth 1 https://github.com/PokemonTCG/pokemon-tcg-data.git pokemon-tcg-data`,
        { stdio: 'inherit', cwd: process.cwd() },
      );

      console.log('✅ Successfully cloned pokemon-tcg-data repository\n');
    } catch (error) {
      throw new Error(
        `Failed to clone pokemon-tcg-data repository. ` +
          `Make sure git is installed and you have network access. ` +
          `Error: ${error}`,
      );
    }
  } else {
    console.log('✅ pokemon-tcg-data directory found\n');
  }
}

async function main() {
  console.log('🌱 Starting Pokemon TCG data seeding...\n');

  try {
    // Ensure pokemon-tcg-data exists (clone if needed)
    await ensurePokemonDataExists();

    if (!fs.existsSync(SETS_FILE)) {
      throw new Error(`Sets file not found at ${SETS_FILE}`);
    }

    if (!fs.existsSync(CARDS_DIR)) {
      throw new Error(`Cards directory not found at ${CARDS_DIR}`);
    }

    // Seed sets first
    const sets = await seedSets();

    // Then seed cards
    await seedCards(sets);

    console.log('\n🎉 Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
