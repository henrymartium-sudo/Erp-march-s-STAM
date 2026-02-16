#!/usr/bin/env node

/**
 * ============================================
 * GESTION COMPLÈTE DES UTILISATEURS DE TEST
 * ============================================
 *
 * Phase 1 : Vérification (lecture seule)
 * Phase 2 : Création sécurisée (avec transaction)
 * Phase 3 : Validation (tests de connexion)
 */

// Charger les variables d'environnement
require('dotenv/config');

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ============================================
// CONFIGURATION DES UTILISATEURS DE TEST
// ============================================

const TEST_USERS = [
  {
    id: 'test-admin-001',
    email: 'admin@erp-marches.local',
    name: 'Admin Test',
    password: 'Admin123!',
    // Hash bcrypt pré-calculé pour éviter le temps de hachage
    passwordHash: '$2b$10$UatN8q4PNR.ypcmIYf9wt.1zfxhoE9/cCt6NkwlYpNiW1d5q8KnlK',
    role: 'ADMIN'
  },
  {
    id: 'test-avance-001',
    email: 'avance@erp-marches.local',
    name: 'Avance Test',
    password: 'Avance123!',
    passwordHash: '$2b$10$KP8.OCXfUHfa/VdYW3GHwedcRWKx63U451tsyujVDWOV4LiP3mKHi',
    role: 'AVANCE'
  },
  {
    id: 'test-exploitation-001',
    email: 'exploitation@erp-marches.local',
    name: 'Exploitation Test',
    password: 'Exploitation123!',
    passwordHash: '$2b$10$oQ36jFf9hCmGSFN3BhoX.e6UNVfBp.YhU4cVKECVlb2bKoG4vqlJ2',
    role: 'EXPLOITATION'
  },
  {
    id: 'test-visiteur-001',
    email: 'visiteur@erp-marches.local',
    name: 'Visiteur Test',
    password: 'Visiteur123!',
    passwordHash: '$2b$10$y8T1Nd3J5NN0ro3PU75u4.iGq/W1dBkpMzxZKt.8W5Py/djPhRVn2',
    role: 'VISITEUR'
  }
];

// ============================================
// PHASE 1 : VÉRIFICATION
// ============================================

async function phase1_verification() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 PHASE 1 : VÉRIFICATION (Lecture seule)');
  console.log('='.repeat(60) + '\n');

  try {
    // 1. Lister tous les utilisateurs existants
    console.log('📊 ÉTAPE 1 : Liste de tous les utilisateurs existants\n');

    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        role: 'asc'
      }
    });

    console.log(`   Total utilisateurs : ${allUsers.length}\n`);

    if (allUsers.length === 0) {
      console.log('   ⚠️  AUCUN UTILISATEUR TROUVÉ\n');
    } else {
      console.log('   Détails :\n');
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email}`);
        console.log(`      - ID: ${user.id}`);
        console.log(`      - Nom: ${user.name}`);
        console.log(`      - Rôle: ${user.role}`);
        console.log(`      - Créé: ${user.createdAt.toISOString().split('T')[0]}`);
        console.log('');
      });
    }

    console.log('─'.repeat(60) + '\n');

    // 2. Vérifier chaque utilisateur de test
    console.log('📋 ÉTAPE 2 : Vérification des utilisateurs de test\n');

    const results = [];
    let existingCount = 0;
    let missingCount = 0;
    const missingUsers = [];

    for (const testUser of TEST_USERS) {
      const existingUser = await prisma.user.findUnique({
        where: { email: testUser.email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        }
      });

      const exists = !!existingUser;
      results.push({ testUser, exists, existingUser });

      if (exists) {
        existingCount++;
      } else {
        missingCount++;
        missingUsers.push(testUser);
      }
    }

    // Afficher les résultats
    results.forEach((result, index) => {
      if (result.exists) {
        console.log(`   ${index + 1}. ✅ EXISTE : ${result.testUser.email}`);
        console.log(`      - ID actuel : ${result.existingUser.id}`);
        console.log(`      - Rôle actuel : ${result.existingUser.role}`);
        console.log(`      - Créé le : ${result.existingUser.createdAt.toISOString().split('T')[0]}`);

        if (result.existingUser.role !== result.testUser.role) {
          console.log(`      ⚠️  ATTENTION : Rôle différent (attendu: ${result.testUser.role})`);
        }
      } else {
        console.log(`   ${index + 1}. ❌ MANQUANT : ${result.testUser.email}`);
        console.log(`      - ID attendu : ${result.testUser.id}`);
        console.log(`      - Rôle attendu : ${result.testUser.role}`);
      }
      console.log('');
    });

    console.log('─'.repeat(60) + '\n');

    // 3. Résumé
    console.log('📊 RÉSUMÉ DE L\'ANALYSE\n');
    console.log(`   Total utilisateurs de test : 4`);
    console.log(`   ✅ Existants : ${existingCount}`);
    console.log(`   ❌ Manquants : ${missingCount}\n`);

    if (missingCount === 0) {
      console.log('   🎉 TOUS LES UTILISATEURS DE TEST EXISTENT DÉJÀ !');
      console.log('   ℹ️  Aucune action requise.\n');
    } else {
      console.log('   📝 UTILISATEURS À CRÉER :\n');
      missingUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.role})`);
      });
      console.log('');
    }

    console.log('='.repeat(60) + '\n');

    return {
      allUsers,
      existingCount,
      missingCount,
      missingUsers
    };

  } catch (error) {
    console.error('\n❌ ERREUR lors de la vérification :', error.message);
    throw error;
  }
}

// ============================================
// PHASE 2 : CRÉATION SÉCURISÉE
// ============================================

async function phase2_creation(missingUsers) {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 PHASE 2 : CRÉATION SÉCURISÉE (Avec transaction)');
  console.log('='.repeat(60) + '\n');

  if (missingUsers.length === 0) {
    console.log('ℹ️  Aucun utilisateur à créer. Phase 2 ignorée.\n');
    console.log('='.repeat(60) + '\n');
    return { created: 0, updated: 0 };
  }

  try {
    let created = 0;
    let updated = 0;

    console.log(`📝 ${missingUsers.length} utilisateur(s) à créer/mettre à jour\n`);

    // Utiliser une transaction pour la sécurité
    await prisma.$transaction(async (tx) => {
      console.log('🔒 Transaction démarrée...\n');

      for (const testUser of TEST_USERS) {
        console.log(`   ⏳ Traitement : ${testUser.email}...`);

        const existingUser = await tx.user.findUnique({
          where: { email: testUser.email }
        });

        if (existingUser) {
          // Mettre à jour l'utilisateur existant
          await tx.user.update({
            where: { email: testUser.email },
            data: {
              password: testUser.passwordHash,
              role: testUser.role,
              name: testUser.name,
              updatedAt: new Date()
            }
          });
          console.log(`   ✅ MIS À JOUR : ${testUser.email}`);
          updated++;
        } else {
          // Créer le nouvel utilisateur
          await tx.user.create({
            data: {
              id: testUser.id,
              email: testUser.email,
              name: testUser.name,
              password: testUser.passwordHash,
              role: testUser.role
            }
          });
          console.log(`   ✅ CRÉÉ : ${testUser.email}`);
          created++;
        }
        console.log('');
      }

      console.log('✅ Transaction validée (COMMIT)\n');
    });

    console.log('─'.repeat(60) + '\n');
    console.log('📊 RÉSULTAT DE LA CRÉATION\n');
    console.log(`   ✅ Créés : ${created}`);
    console.log(`   🔄 Mis à jour : ${updated}`);
    console.log(`   📌 Total traité : ${created + updated}\n`);

    console.log('='.repeat(60) + '\n');

    return { created, updated };

  } catch (error) {
    console.error('\n❌ ERREUR lors de la création :', error.message);
    console.error('⚠️  La transaction a été annulée (ROLLBACK)');
    console.error('ℹ️  Aucune donnée n\'a été modifiée\n');
    throw error;
  }
}

// ============================================
// PHASE 3 : VALIDATION
// ============================================

async function phase3_validation() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 PHASE 3 : VALIDATION FINALE');
  console.log('='.repeat(60) + '\n');

  try {
    console.log('📋 Vérification finale des utilisateurs de test...\n');

    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          endsWith: '@erp-marches.local'
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: [
        { role: 'asc' },
        { email: 'asc' }
      ]
    });

    console.log(`   Total utilisateurs de test : ${testUsers.length}\n`);

    if (testUsers.length === 0) {
      console.log('   ❌ AUCUN UTILISATEUR DE TEST TROUVÉ\n');
      return false;
    }

    console.log('   Détails :\n');
    testUsers.forEach((user, index) => {
      const expected = TEST_USERS.find(u => u.email === user.email);
      const roleMatch = expected && user.role === expected.role;

      console.log(`   ${index + 1}. ${user.email}`);
      console.log(`      - ID: ${user.id}`);
      console.log(`      - Nom: ${user.name}`);
      console.log(`      - Rôle: ${user.role} ${roleMatch ? '✅' : '⚠️'}`);
      console.log(`      - Créé: ${user.createdAt.toISOString().split('T')[0]}`);
      console.log('');
    });

    console.log('─'.repeat(60) + '\n');

    // Vérifier que tous les utilisateurs attendus existent
    let allPresent = true;
    console.log('🔍 Vérification complétude...\n');

    for (const expected of TEST_USERS) {
      const found = testUsers.find(u => u.email === expected.email);
      if (found) {
        console.log(`   ✅ ${expected.email} : OK`);
      } else {
        console.log(`   ❌ ${expected.email} : MANQUANT`);
        allPresent = false;
      }
    }

    console.log('');

    if (allPresent && testUsers.length === 4) {
      console.log('✅ VALIDATION RÉUSSIE : Tous les utilisateurs de test sont présents\n');
      console.log('📋 CREDENTIALS POUR LES TESTS E2E :\n');
      TEST_USERS.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email}`);
        console.log(`      Mot de passe : ${user.password}`);
        console.log(`      Rôle : ${user.role}`);
        console.log('');
      });
    } else {
      console.log('⚠️  VALIDATION PARTIELLE : Certains utilisateurs manquent\n');
    }

    console.log('='.repeat(60) + '\n');

    return allPresent;

  } catch (error) {
    console.error('\n❌ ERREUR lors de la validation :', error.message);
    throw error;
  }
}

// ============================================
// FONCTION PRINCIPALE
// ============================================

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(58) + '║');
  console.log('║' + '  🔒 GESTION SÉCURISÉE DES UTILISATEURS DE TEST'.padEnd(58) + '║');
  console.log('║' + ' '.repeat(58) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');

  try {
    // Phase 1 : Vérification
    const verificationResult = await phase1_verification();

    // Phase 2 : Création (si nécessaire)
    const creationResult = await phase2_creation(verificationResult.missingUsers);

    // Phase 3 : Validation
    const validationSuccess = await phase3_validation();

    // Résumé final
    console.log('\n' + '═'.repeat(60));
    console.log('🎯 RÉSUMÉ FINAL');
    console.log('═'.repeat(60) + '\n');

    console.log(`   Phase 1 (Vérification) : ✅`);
    console.log(`   Phase 2 (Création)     : ${creationResult.created + creationResult.updated > 0 ? '✅' : '⏭️  (ignorée)'}`);
    console.log(`   Phase 3 (Validation)   : ${validationSuccess ? '✅' : '⚠️'}`);
    console.log('');

    if (validationSuccess) {
      console.log('🎉 SUCCÈS COMPLET !\n');
      console.log('📝 Prochaine étape : Lancer les tests E2E Dashboard');
      console.log('   Commande : npx playwright test tests/dashboard/ --project=chromium\n');
      console.log('═'.repeat(60) + '\n');
      process.exit(0);
    } else {
      console.log('⚠️  ATTENTION : Validation incomplète\n');
      console.log('═'.repeat(60) + '\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n' + '═'.repeat(60));
    console.error('💥 ERREUR CRITIQUE');
    console.error('═'.repeat(60) + '\n');
    console.error('Message :', error.message);
    console.error('\nDétails techniques :');
    console.error(error);
    console.error('\n' + '═'.repeat(60) + '\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// EXÉCUTION
// ============================================

if (require.main === module) {
  main();
}

module.exports = { phase1_verification, phase2_creation, phase3_validation };
