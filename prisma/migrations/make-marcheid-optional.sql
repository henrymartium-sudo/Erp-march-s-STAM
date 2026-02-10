-- Migration: Rendre marcheId optionnel dans Caution
-- Date: 2026-02-10
-- Description: Permet de créer des cautions sans marché associé

-- Étape 1: Rendre la colonne marcheId nullable
ALTER TABLE "Caution"
ALTER COLUMN "marcheId" DROP NOT NULL;

-- Étape 2: Rendre la contrainte FK nullable (DROP + RECREATE)
ALTER TABLE "Caution"
DROP CONSTRAINT IF EXISTS "Caution_marcheId_fkey";

ALTER TABLE "Caution"
ADD CONSTRAINT "Caution_marcheId_fkey"
FOREIGN KEY ("marcheId")
REFERENCES "Marche"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Vérification
SELECT
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'Caution'
AND column_name = 'marcheId';
