-- =============================================================================
-- CRÉATION SÉCURISÉE DES UTILISATEURS DE TEST (Supabase SQL Editor)
-- =============================================================================
-- Exécuter ce script dans Supabase SQL Editor
-- Transaction avec ROLLBACK automatique si erreur
-- Idempotent : peut être exécuté plusieurs fois sans danger
-- =============================================================================

BEGIN;

-- Créer ou mettre à jour les 4 utilisateurs de test
INSERT INTO users (id, email, name, password, role, "createdAt", "updatedAt")
VALUES
  -- ADMIN
  (
    'test-admin-001',
    'admin@erp-marches.local',
    'Admin Test',
    '$2b$10$UatN8q4PNR.ypcmIYf9wt.1zfxhoE9/cCt6NkwlYpNiW1d5q8KnlK', -- Admin123!
    'ADMIN',
    NOW(),
    NOW()
  ),
  -- AVANCE
  (
    'test-avance-001',
    'avance@erp-marches.local',
    'Avance Test',
    '$2b$10$KP8.OCXfUHfa/VdYW3GHwedcRWKx63U451tsyujVDWOV4LiP3mKHi', -- Avance123!
    'AVANCE',
    NOW(),
    NOW()
  ),
  -- EXPLOITATION
  (
    'test-exploitation-001',
    'exploitation@erp-marches.local',
    'Exploitation Test',
    '$2b$10$oQ36jFf9hCmGSFN3BhoX.e6UNVfBp.YhU4cVKECVlb2bKoG4vqlJ2', -- Exploitation123!
    'EXPLOITATION',
    NOW(),
    NOW()
  ),
  -- VISITEUR
  (
    'test-visiteur-001',
    'visiteur@erp-marches.local',
    'Visiteur Test',
    '$2b$10$y8T1Nd3J5NN0ro3PU75u4.iGq/W1dBkpMzxZKt.8W5Py/djPhRVn2', -- Visiteur123!
    'VISITEUR',
    NOW(),
    NOW()
  )
ON CONFLICT (email)
DO UPDATE SET
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  "updatedAt" = NOW();

-- Vérifier que les 4 utilisateurs existent
SELECT
  id,
  email,
  name,
  role,
  "createdAt"
FROM users
WHERE email LIKE '%@erp-marches.local'
ORDER BY role, email;

COMMIT;
