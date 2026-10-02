-- AlterTable : lien facultatif d'une caution vers une opportunité (additif, aucune donnée existante modifiée)
ALTER TABLE "cautions" ADD COLUMN "opportuniteId" TEXT;

-- CreateIndex
CREATE INDEX "cautions_opportuniteId_idx" ON "cautions"("opportuniteId");

-- AddForeignKey : supprimer l'opportunité détache la caution, elle n'est jamais supprimée avec elle
ALTER TABLE "cautions" ADD CONSTRAINT "cautions_opportuniteId_fkey" FOREIGN KEY ("opportuniteId") REFERENCES "opportunites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Une caution est rattachée à une opportunité OU à un marché, jamais aux deux
ALTER TABLE "cautions" ADD CONSTRAINT "cautions_marche_ou_opportunite_check" CHECK ("marcheId" IS NULL OR "opportuniteId" IS NULL);
