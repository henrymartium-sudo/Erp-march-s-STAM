/**
 * Script de seed pour environnement de test local
 * Crée les utilisateurs de test et quelques données de démonstration
 *
 * Usage: npm run db:seed:test
 */

import 'dotenv/config';
import { PrismaClient, UserRole, StatutMarche, TypeMarche, TypeDocument, PhaseMarche, TypeCaution, StatutCaution } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Configuration Pool PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Adapter PostgreSQL pour Prisma 7
const adapter = new PrismaPg(pool);

// PrismaClient avec adapter
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Début du seed de test local...\n');

  // ==========================================
  // 1. UTILISATEURS DE TEST
  // ==========================================
  console.log('📝 Création des utilisateurs de test...');

  const testUsers = [
    {
      email: 'admin@erp-marches.local',
      name: 'Admin Test',
      password: 'Admin123!',
      role: UserRole.ADMIN,
    },
    {
      email: 'avance@erp-marches.local',
      name: 'Utilisateur Avancé',
      password: 'Avance123!',
      role: UserRole.AVANCE,
    },
    {
      email: 'exploitation@erp-marches.local',
      name: 'Utilisateur Exploitation',
      password: 'Exploitation123!',
      role: UserRole.EXPLOITATION,
    },
    {
      email: 'visiteur@erp-marches.local',
      name: 'Utilisateur Visiteur',
      password: 'Visiteur123!',
      role: UserRole.VISITEUR,
    },
  ];

  for (const userData of testUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        password: hashedPassword,
        role: userData.role,
      },
      create: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        role: userData.role,
      },
    });

    console.log(`  ✅ ${user.email} (${user.role})`);
  }

  console.log('');

  // ==========================================
  // 2. MARCHÉS DE TEST
  // ==========================================
  console.log('📋 Création des marchés de test...');

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@erp-marches.local' },
  });

  if (!adminUser) {
    throw new Error('Utilisateur admin non trouvé');
  }

  const testMarches = [
    {
      numero: 'TEST-2026-001',
      objet: 'Fourniture de véhicules légers - Lot 1',
      type: TypeMarche.FOURNITURES,
      montant: 250000,
      dateNotification: new Date('2026-02-15'),
      delaiExecution: 90,
      autoriteContractanteNom: 'Commune de Test',
      autoriteContractanteEmail: 'contact@commune-test.fr',
      statut: StatutMarche.DOSSIER_EN_PREPARATION,
      userId: adminUser.id,
    },
    {
      numero: 'TEST-2026-002',
      objet: 'Maintenance véhicules administratifs',
      type: TypeMarche.SERVICES,
      montant: 120000,
      dateNotification: new Date('2026-02-20'),
      delaiExecution: 1095, // 3 ans
      autoriteContractanteNom: 'Département Test',
      autoriteContractanteEmail: 'services@departement-test.fr',
      statut: StatutMarche.OFFRE_DEPOSEE,
      userId: adminUser.id,
    },
    {
      numero: 'TEST-2025-003',
      objet: 'Véhicules utilitaires - Appel d\'offres',
      type: TypeMarche.FOURNITURES,
      montant: 175000,
      dateNotification: new Date('2026-01-10'),
      dateOrdreService: new Date('2026-02-01'),
      delaiExecution: 60,
      dateFinPrevue: new Date('2026-04-02'),
      autoriteContractanteNom: 'Région Test',
      autoriteContractanteEmail: 'marches@region-test.fr',
      statut: StatutMarche.EN_EXECUTION,
      userId: adminUser.id,
    },
  ];

  const createdMarches = [];
  for (const marcheData of testMarches) {
    const marche = await prisma.marche.upsert({
      where: { numero: marcheData.numero },
      update: marcheData,
      create: marcheData,
    });
    createdMarches.push(marche);
    console.log(`  ✅ ${marche.numero} - ${marche.objet}`);
  }

  console.log('');

  // ==========================================
  // 3. CAUTIONS DE TEST
  // ==========================================
  console.log('🛡️  Création des cautions de test...');

  if (createdMarches.length > 0) {
    const cautions = [
      {
        reference: 'CAU-TEST-001',
        type: TypeCaution.SOUMISSION,
        montant: 12500,
        dateEmission: new Date('2026-01-20'),
        dateEcheance: new Date('2026-04-30'),
        banqueNom: 'Banque Test SA',
        banqueContact: 'cautions@banquetest.fr',
        statut: StatutCaution.ACTIVE,
        marcheId: createdMarches[0]!.id,
        userId: adminUser.id,
      },
      {
        reference: 'CAU-TEST-002',
        type: TypeCaution.BONNE_EXECUTION,
        montant: 17500,
        dateEmission: new Date('2026-01-15'),
        dateEcheance: new Date('2027-02-01'),
        banqueNom: 'Assurance Test Mutuelle',
        banqueContact: 'garanties@assurancetest.fr',
        statut: StatutCaution.ACTIVE,
        marcheId: createdMarches[2]!.id,
        userId: adminUser.id,
      },
    ];

    for (const cautionData of cautions) {
      const caution = await prisma.caution.upsert({
        where: { reference: cautionData.reference },
        update: cautionData,
        create: cautionData,
      });
      console.log(`  ✅ ${caution.reference} - ${caution.type} (${caution.montant}€)`);
    }
  }

  console.log('');

  // ==========================================
  // 4. DOCUMENTS DE TEST (optionnel)
  // ==========================================
  console.log('📄 Création des documents de test...');

  if (createdMarches.length > 0) {
    const documents = [
      {
        nom: 'Cahier des charges - Lot 1',
        nomOriginal: 'cahier-charges-lot1.pdf',
        type: TypeDocument.DAO,
        phase: PhaseMarche.PREPARATION,
        marcheId: createdMarches[0]!.id,
        taille: 1024 * 500, // 500 KB
        mimeType: 'application/pdf',
        storagePath: 'test/documents/cahier-charges-lot1.pdf',
        version: 1,
        userId: adminUser.id,
      },
      {
        nom: 'Dossier de réponse',
        nomOriginal: 'dossier-reponse.pdf',
        type: TypeDocument.DRP,
        phase: PhaseMarche.SOUMISSION,
        marcheId: createdMarches[1]!.id,
        taille: 1024 * 750, // 750 KB
        mimeType: 'application/pdf',
        storagePath: 'test/documents/dossier-reponse.pdf',
        version: 1,
        userId: adminUser.id,
      },
      {
        nom: 'Ordre de service n°1',
        nomOriginal: 'ordre-service-1.pdf',
        type: TypeDocument.ORDRE_SERVICE,
        phase: PhaseMarche.EXECUTION,
        marcheId: createdMarches[2]!.id,
        taille: 1024 * 350, // 350 KB
        mimeType: 'application/pdf',
        storagePath: 'test/documents/ordre-service-1.pdf',
        version: 1,
        userId: adminUser.id,
      },
    ];

    for (const docData of documents) {
      const document = await prisma.document.create({
        data: docData,
      });
      console.log(`  ✅ ${document.nom} (${document.type})`);
    }
  }

  console.log('');
  console.log('✨ Seed de test local terminé avec succès !\n');

  // Afficher un récapitulatif
  const userCount = await prisma.user.count();
  const marcheCount = await prisma.marche.count();
  const cautionCount = await prisma.caution.count();
  const documentCount = await prisma.document.count();

  console.log('📊 Récapitulatif :');
  console.log(`  - Utilisateurs : ${userCount}`);
  console.log(`  - Marchés : ${marcheCount}`);
  console.log(`  - Cautions : ${cautionCount}`);
  console.log(`  - Documents : ${documentCount}`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
