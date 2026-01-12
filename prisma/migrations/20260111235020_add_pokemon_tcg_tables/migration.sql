-- CreateEnum
CREATE TYPE "CardGameType" AS ENUM ('POKEMON');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "cardId" TEXT,
ADD COLUMN     "psaCertNumber" TEXT;

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "gameType" "CardGameType" NOT NULL DEFAULT 'POKEMON',
    "pokemonCardId" TEXT,
    "psaSpecId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtDb" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonSet" (
    "id" TEXT NOT NULL,
    "gameType" "CardGameType" NOT NULL DEFAULT 'POKEMON',
    "name" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "printedTotal" INTEGER,
    "total" INTEGER NOT NULL,
    "ptcgoCode" TEXT,
    "releaseDate" TEXT,
    "updatedAt" TEXT,
    "logoUrl" TEXT,
    "symbolUrl" TEXT,
    "legalities" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtDb" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PokemonSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonCard" (
    "id" TEXT NOT NULL,
    "pokemonSetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supertype" TEXT NOT NULL,
    "subtypes" TEXT[],
    "number" TEXT NOT NULL,
    "cardData" JSONB,
    "metadata" JSONB,
    "imageSmallUrl" TEXT,
    "imageLargeUrl" TEXT,
    "artist" TEXT,
    "rarity" TEXT,
    "flavorText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtDb" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PokemonCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonPSASpec" (
    "id" TEXT NOT NULL,
    "specId" INTEGER NOT NULL,
    "specNumber" TEXT,
    "pokemonCardId" TEXT NOT NULL,
    "cardNumber" TEXT,
    "subject" TEXT,
    "variety" TEXT,
    "brand" TEXT,
    "year" TEXT,
    "labelType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtDb" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PokemonPSASpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonSalesData" (
    "id" TEXT NOT NULL,
    "pokemonPSASpecId" TEXT,
    "pokemonCardId" TEXT,
    "certNumber" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isAuction" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "title" TEXT,
    "psaApiResponse" JSONB,
    "source" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtDb" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PokemonSalesData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Card_gameType_idx" ON "Card"("gameType");

-- CreateIndex
CREATE INDEX "Card_pokemonCardId_idx" ON "Card"("pokemonCardId");

-- CreateIndex
CREATE INDEX "Card_psaSpecId_idx" ON "Card"("psaSpecId");

-- CreateIndex
CREATE INDEX "PokemonSet_series_idx" ON "PokemonSet"("series");

-- CreateIndex
CREATE INDEX "PokemonSet_name_idx" ON "PokemonSet"("name");

-- CreateIndex
CREATE INDEX "PokemonSet_gameType_idx" ON "PokemonSet"("gameType");

-- CreateIndex
CREATE INDEX "PokemonCard_pokemonSetId_number_idx" ON "PokemonCard"("pokemonSetId", "number");

-- CreateIndex
CREATE INDEX "PokemonCard_name_idx" ON "PokemonCard"("name");

-- CreateIndex
CREATE INDEX "PokemonCard_supertype_idx" ON "PokemonCard"("supertype");

-- CreateIndex
CREATE INDEX "PokemonCard_number_idx" ON "PokemonCard"("number");

-- CreateIndex
CREATE UNIQUE INDEX "PokemonPSASpec_specId_key" ON "PokemonPSASpec"("specId");

-- CreateIndex
CREATE INDEX "PokemonPSASpec_specId_idx" ON "PokemonPSASpec"("specId");

-- CreateIndex
CREATE INDEX "PokemonPSASpec_pokemonCardId_idx" ON "PokemonPSASpec"("pokemonCardId");

-- CreateIndex
CREATE INDEX "PokemonPSASpec_cardNumber_subject_variety_idx" ON "PokemonPSASpec"("cardNumber", "subject", "variety");

-- CreateIndex
CREATE INDEX "PokemonSalesData_certNumber_idx" ON "PokemonSalesData"("certNumber");

-- CreateIndex
CREATE INDEX "PokemonSalesData_pokemonCardId_idx" ON "PokemonSalesData"("pokemonCardId");

-- CreateIndex
CREATE INDEX "PokemonSalesData_pokemonPSASpecId_idx" ON "PokemonSalesData"("pokemonPSASpecId");

-- CreateIndex
CREATE INDEX "PokemonSalesData_date_idx" ON "PokemonSalesData"("date");

-- CreateIndex
CREATE INDEX "PokemonSalesData_value_idx" ON "PokemonSalesData"("value");

-- CreateIndex
CREATE INDEX "Listing_cardId_idx" ON "Listing"("cardId");

-- CreateIndex
CREATE INDEX "Listing_psaCertNumber_idx" ON "Listing"("psaCertNumber");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_pokemonCardId_fkey" FOREIGN KEY ("pokemonCardId") REFERENCES "PokemonCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonCard" ADD CONSTRAINT "PokemonCard_pokemonSetId_fkey" FOREIGN KEY ("pokemonSetId") REFERENCES "PokemonSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonPSASpec" ADD CONSTRAINT "PokemonPSASpec_pokemonCardId_fkey" FOREIGN KEY ("pokemonCardId") REFERENCES "PokemonCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonSalesData" ADD CONSTRAINT "PokemonSalesData_pokemonPSASpecId_fkey" FOREIGN KEY ("pokemonPSASpecId") REFERENCES "PokemonPSASpec"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonSalesData" ADD CONSTRAINT "PokemonSalesData_pokemonCardId_fkey" FOREIGN KEY ("pokemonCardId") REFERENCES "PokemonCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
