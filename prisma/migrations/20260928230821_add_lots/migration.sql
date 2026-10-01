-- CreateEnum
CREATE TYPE "ResultatLot" AS ENUM ('EN_COURS', 'ATTRIBUE_PROVISOIREMENT', 'GAGNE', 'PERDU', 'INFRUCTUEUX');

-- AlterTable
ALTER TABLE "dossiers_offre" ADD COLUMN     "lotId" TEXT;

-- AlterTable
ALTER TABLE "pieces_offre" ADD COLUMN     "opportuniteId" TEXT,
ALTER COLUMN "dossierId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "lots" (
    "id" TEXT NOT NULL,
    "opportuniteId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "intitule" TEXT NOT NULL,
    "montantEstime" DECIMAL(15,2),
    "montantPropose" DECIMAL(15,2),
    "resultat" "ResultatLot" NOT NULL DEFAULT 'EN_COURS',
    "motifPerte" TEXT,
    "concurrentGagnant" TEXT,
    "montantOffreConcurrent" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lots_opportuniteId_idx" ON "lots"("opportuniteId");

-- CreateIndex
CREATE UNIQUE INDEX "lots_opportuniteId_numero_key" ON "lots"("opportuniteId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "dossiers_offre_lotId_key" ON "dossiers_offre"("lotId");

-- CreateIndex
CREATE INDEX "pieces_offre_opportuniteId_idx" ON "pieces_offre"("opportuniteId");

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_opportuniteId_fkey" FOREIGN KEY ("opportuniteId") REFERENCES "opportunites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers_offre" ADD CONSTRAINT "dossiers_offre_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces_offre" ADD CONSTRAINT "pieces_offre_opportuniteId_fkey" FOREIGN KEY ("opportuniteId") REFERENCES "opportunites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "pieces_offre" ADD CONSTRAINT "pieces_offre_un_parent_chk"
  CHECK (("dossierId" IS NOT NULL) <> ("opportuniteId" IS NOT NULL));
