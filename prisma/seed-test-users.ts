import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

// Configuration Pool PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Adapter PostgreSQL pour Prisma 7
const adapter = new PrismaPg(pool);

// PrismaClient avec adapter
const prisma = new PrismaClient({ adapter });

/**
 * Script de seed pour créer les utilisateurs de test E2E
 *
 * Utilisation :
 * - Local : npx ts-node prisma/seed-test-users.ts
 * - Production : Exécuter via Vercel CLI ou directement en DB
 */

async function main() {
  console.log('🌱 Création des utilisateurs de test...');

  // Hasher les mots de passe
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const avancePassword = await bcrypt.hash('Avance123!', 10);
  const exploitationPassword = await bcrypt.hash('Exploitation123!', 10);
  const visiteurPassword = await bcrypt.hash('Visiteur123!', 10);

  // Utilisateur 1 : ADMIN
  const admin = await prisma.user.upsert({
    where: { email: 'admin@erp-marches.local' },
    update: {
      password: adminPassword,
      role: 'ADMIN',
    },
    create: {
      id: 'test-admin-001',
      name: 'Admin Test',
      email: 'admin@erp-marches.local',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('✅ Utilisateur ADMIN créé :', admin.email);

  // Utilisateur 2 : AVANCE
  const avance = await prisma.user.upsert({
    where: { email: 'avance@erp-marches.local' },
    update: {
      password: avancePassword,
      role: 'AVANCE',
    },
    create: {
      id: 'test-avance-001',
      name: 'Avance Test',
      email: 'avance@erp-marches.local',
      password: avancePassword,
      role: 'AVANCE',
    },
  });
  console.log('✅ Utilisateur AVANCE créé :', avance.email);

  // Utilisateur 3 : EXPLOITATION
  const exploitation = await prisma.user.upsert({
    where: { email: 'exploitation@erp-marches.local' },
    update: {
      password: exploitationPassword,
      role: 'EXPLOITATION',
    },
    create: {
      id: 'test-exploitation-001',
      name: 'Exploitation Test',
      email: 'exploitation@erp-marches.local',
      password: exploitationPassword,
      role: 'EXPLOITATION',
    },
  });
  console.log('✅ Utilisateur EXPLOITATION créé :', exploitation.email);

  // Utilisateur 4 : VISITEUR
  const visiteur = await prisma.user.upsert({
    where: { email: 'visiteur@erp-marches.local' },
    update: {
      password: visiteurPassword,
      role: 'VISITEUR',
    },
    create: {
      id: 'test-visiteur-001',
      name: 'Visiteur Test',
      email: 'visiteur@erp-marches.local',
      password: visiteurPassword,
      role: 'VISITEUR',
    },
  });
  console.log('✅ Utilisateur VISITEUR créé :', visiteur.email);

  console.log('\n🎉 Seed terminé ! 4 utilisateurs de test créés.\n');

  console.log('📋 Credentials de test :');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. ADMIN');
  console.log('   Email    : admin@erp-marches.local');
  console.log('   Password : Admin123!');
  console.log('   Rôle     : Tous les droits\n');

  console.log('2. AVANCE');
  console.log('   Email    : avance@erp-marches.local');
  console.log('   Password : Avance123!');
  console.log('   Rôle     : Lecture/écriture, pas de suppression\n');

  console.log('3. EXPLOITATION');
  console.log('   Email    : exploitation@erp-marches.local');
  console.log('   Password : Exploitation123!');
  console.log('   Rôle     : Lecture seule sur marchés\n');

  console.log('4. VISITEUR');
  console.log('   Email    : visiteur@erp-marches.local');
  console.log('   Password : Visiteur123!');
  console.log('   Rôle     : Lecture seule partout\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error('❌ Erreur lors du seed :', e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
