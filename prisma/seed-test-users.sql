-- ========================================
-- Script SQL pour créer les utilisateurs de test
-- À exécuter dans Supabase SQL Editor
-- ========================================

-- Supprimer les utilisateurs de test s'ils existent déjà
DELETE FROM users WHERE email LIKE '%@erp-marches.local';

-- Utilisateur 1: ADMIN
-- Email: admin@erp-marches.local
-- Password: Admin123!
INSERT INTO users (id, name, email, password, role, "createdAt", "updatedAt")
VALUES (
  'test-admin-001',
  'Admin Test',
  'admin@erp-marches.local',
  '$2b$10$a94IdTcUzFVldVDRk9EZw..64x0mYHb4oylnpRshAMY0o6tSrBiKO',
  'ADMIN',
  NOW(),
  NOW()
);

-- Utilisateur 2: AVANCE
-- Email: avance@erp-marches.local
-- Password: Avance123!
INSERT INTO users (id, name, email, password, role, "createdAt", "updatedAt")
VALUES (
  'test-avance-001',
  'Avance Test',
  'avance@erp-marches.local',
  '$2b$10$pBhUB23NiURJu02vw3v/k./g5N1Yw150NaomlBFCcDUniyAEypuxi',
  'AVANCE',
  NOW(),
  NOW()
);

-- Utilisateur 3: EXPLOITATION
-- Email: exploitation@erp-marches.local
-- Password: Exploitation123!
INSERT INTO users (id, name, email, password, role, "createdAt", "updatedAt")
VALUES (
  'test-exploitation-001',
  'Exploitation Test',
  'exploitation@erp-marches.local',
  '$2b$10$35VWYMAKTYqyrXATM.zDWO7o6IvYOcBmTjqL81PF3Y8CafHfASi7K',
  'EXPLOITATION',
  NOW(),
  NOW()
);

-- Utilisateur 4: VISITEUR
-- Email: visiteur@erp-marches.local
-- Password: Visiteur123!
INSERT INTO users (id, name, email, password, role, "createdAt", "updatedAt")
VALUES (
  'test-visiteur-001',
  'Visiteur Test',
  'visiteur@erp-marches.local',
  '$2b$10$jaltKl8slW/n3orsaDfMN.yalul1k0RqIM907evXPfyFshwNedaAK',
  'VISITEUR',
  NOW(),
  NOW()
);

-- Vérifier les utilisateurs créés
SELECT id, name, email, role, "createdAt" FROM users WHERE email LIKE '%@erp-marches.local';

-- ========================================
-- CREDENTIALS DE TEST
-- ========================================
--
-- 1. ADMIN
--    Email    : admin@erp-marches.local
--    Password : Admin123!
--    Rôle     : Tous les droits (créer, modifier, supprimer)
--
-- 2. AVANCE
--    Email    : avance@erp-marches.local
--    Password : Avance123!
--    Rôle     : Lecture/écriture, pas de suppression
--
-- 3. EXPLOITATION
--    Email    : exploitation@erp-marches.local
--    Password : Exploitation123!
--    Rôle     : Lecture seule sur marchés
--
-- 4. VISITEUR
--    Email    : visiteur@erp-marches.local
--    Password : Visiteur123!
--    Rôle     : Lecture seule partout
--
-- ========================================
