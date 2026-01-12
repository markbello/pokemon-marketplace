# Database Migrations & Seeding

## How Migrations Work

### Migration Generation

Migrations are automatically generated when you run:

```bash
npm run db:migrate
# or
npx prisma migrate dev --name your_migration_name
```

This command:
1. **Compares** your `prisma/schema.prisma` file with the current database state
2. **Generates** a new migration file in `prisma/migrations/YYYYMMDDHHMMSS_migration_name/migration.sql`
3. **Applies** the migration to your database
4. **Regenerates** the Prisma Client with updated types

### Migration File Structure

Each migration is stored in a timestamped folder:
```
prisma/migrations/
  └── 20251225120000_add_pokemon_tcg_models/
      └── migration.sql
```

The SQL file contains the actual database changes (CREATE TABLE, ALTER TABLE, etc.)

### Example Migration

When you add new models to `schema.prisma`, Prisma generates SQL like:

```sql
-- CreateEnum
CREATE TYPE "CardGameType" AS ENUM ('POKEMON');

-- CreateTable
CREATE TABLE "CardSet" (
    "id" TEXT NOT NULL,
    "gameType" "CardGameType" NOT NULL DEFAULT 'POKEMON',
    "name" TEXT NOT NULL,
    ...
    CONSTRAINT "CardSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardSet_gameType_series_idx" ON "CardSet"("gameType", "series");
```

## How Seeding Works

### Seed Script Configuration

In `package.json`:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### Running Seeds

```bash
npm run db:seed
# or
npx prisma db seed
```

This runs the script defined in `package.json` → `prisma.seed`.

### Seed Script Structure

Your seed script (`prisma/seed.ts`) should:
1. Import PrismaClient
2. Create/update records
3. Handle errors gracefully
4. Disconnect when done

Example:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Your seeding logic here
  await prisma.cardSet.createMany({ data: [...] });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### When to Seed

- **Development**: After `migrate dev` or `migrate reset`
- **Production**: Manually run after migrations are deployed
- **CI/CD**: Can be automated in deployment pipelines

## Workflow

### Adding New Models

1. **Edit** `prisma/schema.prisma` (add/modify models)
2. **Generate migration**: `npm run db:migrate`
3. **Review** the generated SQL in `prisma/migrations/.../migration.sql`
4. **Update seed script** if needed: `prisma/seed.ts`
5. **Test**: Migration is applied automatically, then run `npm run db:seed`

### Resetting Database

```bash
npm run db:reset
```

This:
1. Drops all tables
2. Reapplies all migrations
3. Runs the seed script automatically
