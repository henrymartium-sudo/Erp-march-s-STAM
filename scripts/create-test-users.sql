-- ============================================
-- Script SQL: Créer les 4 utilisateurs de test
-- ============================================
--
-- Exécution:
--   - Supabase: Dashboard > SQL Editor > Coller ce script
--   - PostgreSQL local: psql -d DATABASE_URL -f scripts/create-test-users.sql
--
-- Hash générés avec bcrypt(password, 10)
-- ============================================

-- 1. ADMIN
-- Email: admin@erp-marches.local
-- Password: Admin123!
INSERT INTO users (id, email, name, password, role, "createdAt", "updatedAt")
VALUES (
  'test-admin-001',
  'admin@erp-marches.local',
  'Admin Test',
  '$2b$10$UatN8q4PNR.ypcmIYf9wt.1zfxhoE9/cCt6NkwlYpNiW1d5q8KnlK',
  'ADMIN',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = '$2b$10$UatN8q4PNR.ypcmIYf9wt.1zfxhoE9/cCt6NkwlYpNiW1d5q8KnlK',
  role = 'ADMIN',
  "updatedAt" = NOW();

-- 2. AVANCE
-- Email: avance@erp-marches.local
-- Password: Avance123!
INSERT INTO users (id, email, name, password, role, "createdAt", "updatedAt")
VALUES (
  'test-avance-001',
  'avance@erp-marches.local',
  'Avance Test',
  '$2b$10$KP8.OCXfUHfa/VdYW3GHwedcRWKx63U451tsyujVDWOV4LiP3mKHi',
  'AVANCE',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = '$2b$10$KP8.OCXfUHfa/VdYW3GHwedcRWKx63U451tsyujVDWOV4LiP3mKHi',
  role = 'AVANCE',
  "updatedAt" = NOW();

-- 3. EXPLOITATION
-- Email: exploitation@erp-marches.local
-- Password: Exploitation123!
INSERT INTO users (id, email, name, password, role, "createdAt", "updatedAt")
VALUES (
  'test-exploitation-001',
  'exploitation@erp-marches.local',
  'Exploitation Test',
  '$2b$10$oQ36jFf9hCmGSFN3BhoX.e6UNVfBp.YhU4cVKECVlb2bKoG4vqlJ2',
  'EXPLOITATION',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = '$2b$10$oQ36jFf9hCmGSFN3BhoX.e6UNVfBp.YhU4cVKECVlb2bKoG4vqlJ2',
  role = 'EXPLOITATION',
  "updatedAt" = NOW();

-- 4. VISITEUR
-- Email: visiteur@erp-marches.local
-- Password: Visiteur123!
INSERT INTO users (id, email, name, password, role, "createdAt", "updatedAt")
VALUES (
  'test-visiteur-001',
  'visiteur@erp-marches.local',
  'Visiteur Test',
  '$2b$10$y8T1Nd3J5NN0ro3PU75u4.iGq/W1dBkpMzxZKt.8W5Py/djPhRVn2',
  'VISITEUR',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = '$2b$10$y8T1Nd3J5NN0ro3PU75u4.iGq/W1dBkpMzxZKt.8W5Py/djPhRVn2',
  role = 'VISITEUR',
  "updatedAt" = NOW();

-- ============================================
-- Vérification: Lister les utilisateurs créés
-- ============================================
SELECT
  id,
  email,
  name,
  role,
  "createdAt",
  "updatedAt"
FROM users
WHERE email LIKE '%erp-marches.local'
ORDER BY role;

-- ============================================
-- Résultat attendu: 4 utilisateurs
-- ============================================
-- ✅ admin@erp-marches.local (ADMIN)
-- ✅ avance@erp-marches.local (AVANCE)
-- ✅ exploitation@erp-marches.local (EXPLOITATION)
-- ✅ visiteur@erp-marches.local (VISITEUR)
