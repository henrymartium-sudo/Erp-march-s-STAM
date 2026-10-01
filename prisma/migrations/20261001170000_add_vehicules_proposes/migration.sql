-- CreateTable
CREATE TABLE "vehicules_proposes" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prixUnitaire" DECIMAL(15,2) NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicules_proposes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicules_proposes_lotId_idx" ON "vehicules_proposes"("lotId");

-- CreateIndex
CREATE INDEX "vehicules_proposes_marque_modele_idx" ON "vehicules_proposes"("marque", "modele");

-- AddForeignKey
ALTER TABLE "vehicules_proposes" ADD CONSTRAINT "vehicules_proposes_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

