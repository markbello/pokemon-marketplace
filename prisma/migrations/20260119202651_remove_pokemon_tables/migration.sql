/*
  Warnings:

  - You are about to drop the column `pokemonCardId` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the `PokemonCard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PokemonPSASpec` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PokemonSalesData` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PokemonSet` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Card" DROP CONSTRAINT "Card_pokemonCardId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PokemonCard" DROP CONSTRAINT "PokemonCard_pokemonSetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PokemonPSASpec" DROP CONSTRAINT "PokemonPSASpec_pokemonCardId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PokemonSalesData" DROP CONSTRAINT "PokemonSalesData_pokemonCardId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PokemonSalesData" DROP CONSTRAINT "PokemonSalesData_pokemonPSASpecId_fkey";

-- DropIndex
DROP INDEX "public"."Card_pokemonCardId_idx";

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "pokemonCardId",
ADD COLUMN     "backImageUrl" TEXT,
ADD COLUMN     "cardName" TEXT,
ADD COLUMN     "cardNumber" TEXT,
ADD COLUMN     "frontImageUrl" TEXT,
ADD COLUMN     "setName" TEXT,
ADD COLUMN     "variety" TEXT;

-- DropTable
DROP TABLE "public"."PokemonCard";

-- DropTable
DROP TABLE "public"."PokemonPSASpec";

-- DropTable
DROP TABLE "public"."PokemonSalesData";

-- DropTable
DROP TABLE "public"."PokemonSet";

-- CreateTable
CREATE TABLE "SalesData" (
    "id" TEXT NOT NULL,
    "cardId" TEXT,
    "gradingCompany" TEXT,
    "certNumber" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isAuction" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "title" TEXT,
    "apiResponse" JSONB,
    "source" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtDb" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesData_certNumber_idx" ON "SalesData"("certNumber");

-- CreateIndex
CREATE INDEX "SalesData_cardId_idx" ON "SalesData"("cardId");

-- CreateIndex
CREATE INDEX "SalesData_gradingCompany_idx" ON "SalesData"("gradingCompany");

-- CreateIndex
CREATE INDEX "SalesData_date_idx" ON "SalesData"("date");

-- CreateIndex
CREATE INDEX "SalesData_value_idx" ON "SalesData"("value");

-- CreateIndex
CREATE INDEX "Card_cardName_idx" ON "Card"("cardName");

-- CreateIndex
CREATE INDEX "Card_setName_idx" ON "Card"("setName");

-- CreateIndex
CREATE INDEX "Card_cardNumber_idx" ON "Card"("cardNumber");

-- AddForeignKey
ALTER TABLE "SalesData" ADD CONSTRAINT "SalesData_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;
