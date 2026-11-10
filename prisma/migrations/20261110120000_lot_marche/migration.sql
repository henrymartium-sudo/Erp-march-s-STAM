-- AlterTable
ALTER TABLE "lots" ADD COLUMN     "marcheId" TEXT;

-- CreateIndex
CREATE INDEX "lots_marcheId_idx" ON "lots"("marcheId");

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_marcheId_fkey" FOREIGN KEY ("marcheId") REFERENCES "marches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Reprise : jusqu'ici une opportunité ne pouvait donner qu'un seul marché, qui couvrait
-- tous ses lots gagnés. On rattache donc chaque lot GAGNE au marché de son opportunité,
-- sauf si ce marché est antérieur à l'opportunité (marché préexistant converti, même règle
-- que l'ancien gel des lots).
UPDATE "lots" AS l
SET "marcheId" = m."id"
FROM "marches" AS m
JOIN "opportunites" AS o ON o."id" = m."opportuniteId"
WHERE m."opportuniteId" = l."opportuniteId"
  AND l."resultat" = 'GAGNE'
  AND m."createdAt" > o."createdAt";
