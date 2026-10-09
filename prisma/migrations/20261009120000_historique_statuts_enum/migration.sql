-- Aligne historique_statuts sur le schéma : les colonnes de statut sont en TEXT en production
-- (table créée hors historique de migrations), l'énumération StatutMarche est attendue.
-- Le transtypage échoue (et la transaction est annulée) si une valeur n'appartient pas à l'énumération.
ALTER TABLE "historique_statuts"
  ALTER COLUMN "ancienStatut" TYPE "StatutMarche" USING "ancienStatut"::"StatutMarche",
  ALTER COLUMN "nouveauStatut" TYPE "StatutMarche" USING "nouveauStatut"::"StatutMarche";
