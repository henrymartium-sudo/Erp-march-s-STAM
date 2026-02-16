/**
 * Script de création des utilisateurs de test
 * Utilise tsx pour l'exécution TypeScript
 */

import { prisma } from '../lib/db/prisma';

const TEST_USERS = [
  {
    id: 'test-admin-001',
    email: 'admin@erp-marches.local',
    name: 'Admin Test',
    password: '$2b$10$UatN8q4PNR.ypcmIYf9wt.1zfxhoE9/cCt6NkwlYpNiW1d5q8KnlK', // Admin123!
    role: 'ADMIN' as const
  },
  {
    id: 'test-avance-001',
    email: 'avance@erp-marches.local',
    name: 'Avance Test',
    password: '$2b$10$KP8.OCXfUHfa/VdYW3GHwedcRWKx63U451tsyujVDWOV4LiP3mKHi', // Avance123!
    role: 'AVANCE' as const
  },
  {
    id: 'test-exploitation-001',
    email: 'exploitation@erp-marches.local',
    name: 'Exploitation Test',
    password: '$2b$10$oQ36jFf9hCmGSFN3BhoX.e6UNVfBp.YhU4cVKECVlb2bKoG4vqlJ2', // Exploitation123!
    role: 'EXPLOITATION' as const
  },
  {
    id: 'test-visiteur-001',
    email: 'visiteur@erp-marches.local',
    name: 'Visiteur Test',
    password: '$2b$10$y8T1Nd3J5NN0ro3PU75u4.iGq/W1dBkpMzxZKt.8W5Py/djPhRVn2', // Visiteur123!
    role: 'VISITEUR' as const
  }
];

async function main() {
  console.log('\n🚀 Création des utilisateurs de test...\n');

  try {
    for (const user of TEST_USERS) {
      console.log(`⏳ Traitement : ${user.email}...`);

      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          password: user.password,
          role: user.role,
          name: user.name
        },
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
          password: user.password,
          role: user.role
        }
      });

      console.log(`✅ ${user.email} créé/mis à jour\n`);
    }

    console.log('🎉 Tous les utilisateurs de test ont été créés avec succès!\n');
    console.log('📋 CREDENTIALS :\n');
    console.log('1. admin@erp-marches.local / Admin123!');
    console.log('2. avance@erp-marches.local / Avance123!');
    console.log('3. exploitation@erp-marches.local / Exploitation123!');
    console.log('4. visiteur@erp-marches.local / Visiteur123!\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
