-- CreateEnum
CREATE TYPE "TypeMarche" AS ENUM ('TRAVAUX', 'FOURNITURES', 'SERVICES', 'PRESTATIONS_INTELLECTUELLES');

-- CreateEnum
CREATE TYPE "StatutMarche" AS ENUM ('OPPORTUNITE_IDENTIFIEE', 'DOSSIER_EN_PREPARATION', 'OFFRE_DEPOSEE', 'EN_ATTENTE_ATTRIBUTION', 'ATTRIBUE_PROVISOIREMENT', 'ATTRIBUE_DEFINITIVEMENT', 'EN_ATTENTE_LIVRAISON_OS', 'EN_EXECUTION', 'EXECUTE_ATTENTE_GARANTIES', 'CLOTURE', 'RESILIE_ANNULE_INFRUCTUEUX');

-- CreateTable
CREATE TABLE "marches" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "objet" TEXT NOT NULL,
    "type" "TypeMarche" NOT NULL,
    "montant" DECIMAL(15,2) NOT NULL,
    "dateNotification" TIMESTAMP(3) NOT NULL,
    "dateOrdreService" TIMESTAMP(3),
    "delaiExecution" INTEGER NOT NULL,
    "dateFinPrevue" TIMESTAMP(3),
    "dateReception" TIMESTAMP(3),
    "statut" "StatutMarche" NOT NULL DEFAULT 'OPPORTUNITE_IDENTIFIEE',
    "fournisseurNom" TEXT NOT NULL,
    "fournisseurContact" TEXT,
    "fournisseurEmail" TEXT,
    "fournisseurTel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marches_numero_key" ON "marches"("numero");

-- CreateIndex
CREATE INDEX "marches_numero_idx" ON "marches"("numero");

-- CreateIndex
CREATE INDEX "marches_statut_idx" ON "marches"("statut");

-- CreateIndex
CREATE INDEX "marches_dateFinPrevue_idx" ON "marches"("dateFinPrevue");
