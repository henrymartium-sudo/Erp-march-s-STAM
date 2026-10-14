-- CreateEnum
CREATE TYPE "TypeRapportOpportunite" AS ENUM ('SUIVI', 'ECHEANCES_MATIN');

-- AlterTable
ALTER TABLE "opportunite_reporting_rules" ADD COLUMN "reportType" "TypeRapportOpportunite" NOT NULL DEFAULT 'SUIVI';
