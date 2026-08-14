-- Ajout du support Google OAuth avec validation ADMIN.
-- password devient nullable (comptes créés via Google sans mot de passe).
-- accountStatus (ACTIVE/PENDING/REJECTED) contrôle l'accès réel au-delà de la connexion.

CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'PENDING', 'REJECTED');

ALTER TABLE "users" ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;
