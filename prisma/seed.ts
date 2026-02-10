import {
  PrismaClient,
  TypeMarche,
  StatutMarche,
  TypeCaution,
  StatutCaution,
  UserRole,
} from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
})

async function main() {
  console.log('🌱 Début du seeding...')

  // Supprimer les données existantes (dans l'ordre inverse des dépendances)
  await prisma.caution.deleteMany()
  await prisma.marche.deleteMany()
  await prisma.user.deleteMany()
  console.log('✅ Données existantes supprimées')

  // ============================================================================
  // CRÉER DES UTILISATEURS PAR DÉFAUT
  // ============================================================================

  console.log('\n👤 Création des utilisateurs...')

  const adminPassword = await bcrypt.hash('Admin123!', 10)
  const userPassword = await bcrypt.hash('User123!', 10)

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@erp-marches.local',
        name: 'Administrateur Principal',
        password: adminPassword,
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        email: 'responsable@erp-marches.local',
        name: 'Responsable Marchés',
        password: userPassword,
        role: UserRole.AVANCE,
      },
    }),
    prisma.user.create({
      data: {
        email: 'exploitation@erp-marches.local',
        name: 'Chef Exploitation',
        password: userPassword,
        role: UserRole.EXPLOITATION,
      },
    }),
    prisma.user.create({
      data: {
        email: 'visiteur@erp-marches.local',
        name: 'Directeur Général',
        password: userPassword,
        role: UserRole.VISITEUR,
      },
    }),
  ])

  console.log(`✅ ${users.length} utilisateurs créés`)
  console.log(`   - Admin: admin@erp-marches.local / Admin123!`)
  console.log(`   - Responsable: responsable@erp-marches.local / User123!`)
  console.log(`   - Exploitation: exploitation@erp-marches.local / User123!`)
  console.log(`   - Visiteur: visiteur@erp-marches.local / User123!`)

  const adminUser = users[0]
  const responsableUser = users[1]

  // ============================================================================
  // CRÉER DES MARCHÉS DE TEST
  // ============================================================================

  console.log('\n📄 Création des marchés...')

  const marches = await Promise.all([
    // 1. OPPORTUNITE_IDENTIFIEE
    prisma.marche.create({
      data: {
        numero: 'MAR-2024-001',
        objet: 'Fourniture de véhicules légers pour administration',
        type: TypeMarche.FOURNITURES,
        montant: 450000,
        dateNotification: new Date('2024-01-15'),
        delaiExecution: 90,
        statut: StatutMarche.OPPORTUNITE_IDENTIFIEE,
        autoriteContractanteNom: 'Ministère de l\'Intérieur',
        autoriteContractanteEmail: 'marches@interieur.gov.ma',
        autoriteContractanteTel: '+212 5 37 66 00 00',
        dateIdentification: new Date('2024-01-10'),
        userId: adminUser.id,
      },
    }),

    // 2. DOSSIER_EN_PREPARATION
    prisma.marche.create({
      data: {
        numero: 'MAR-2024-002',
        objet: 'Contrat de maintenance préventive flotte véhicules',
        type: TypeMarche.SERVICES,
        montant: 280000,
        dateNotification: new Date('2024-02-01'),
        delaiExecution: 365,
        statut: StatutMarche.DOSSIER_EN_PREPARATION,
        autoriteContractanteNom: 'Conseil Communal de Casablanca',
        autoriteContractanteContact: 'M. Ahmed Benjelloun',
        autoriteContractanteEmail: 'marches@casablanca.ma',
        dateDepotPrevue: new Date('2024-03-15'),
        userId: responsableUser.id,
      },
    }),

    // 3. OFFRE_DEPOSEE
    prisma.marche.create({
      data: {
        numero: 'MAR-2024-003',
        objet: 'Fourniture de véhicules utilitaires',
        type: TypeMarche.FOURNITURES,
        montant: 1200000,
        dateNotification: new Date('2024-02-15'),
        delaiExecution: 120,
        statut: StatutMarche.OFFRE_DEPOSEE,
        autoriteContractanteNom: 'Direction Générale de la Sûreté Nationale',
        autoriteContractanteEmail: 'achats@dgsn.gov.ma',
        autoriteContractanteTel: '+212 5 37 77 00 00',
        dateDepotOffre: new Date('2024-02-28'),
        delaiValiditeOffre: 120,
        userId: responsableUser.id,
      },
    }),

    // 4. EN_ATTENTE_ATTRIBUTION
    prisma.marche.create({
      data: {
        numero: 'MAR-2024-004',
        objet: 'Travaux d\'aménagement parking véhicules',
        type: TypeMarche.TRAVAUX,
        montant: 350000,
        dateNotification: new Date('2024-03-01'),
        delaiExecution: 60,
        statut: StatutMarche.EN_ATTENTE_ATTRIBUTION,
        autoriteContractanteNom: 'Université Mohammed V',
        autoriteContractanteContact: 'Mme Fatima Zahra El Alaoui',
        autoriteContractanteTel: '+212 5 37 27 17 00',
        userId: responsableUser.id,
      },
    }),

    // 5. ATTRIBUE_PROVISOIREMENT
    prisma.marche.create({
      data: {
        numero: 'MAR-2024-005',
        objet: 'Fourniture de pièces de rechange véhicules',
        type: TypeMarche.FOURNITURES,
        montant: 180000,
        dateNotification: new Date('2024-03-10'),
        delaiExecution: 180,
        statut: StatutMarche.ATTRIBUE_PROVISOIREMENT,
        autoriteContractanteNom: 'Office National de l\'Électricité',
        autoriteContractanteEmail: 'marches@onee.ma',
        dateAttributionProvisoire: new Date('2024-03-25'),
        userId: adminUser.id,
      },
    }),

    // 6. ATTRIBUE_DEFINITIVEMENT
    prisma.marche.create({
      data: {
        numero: 'MAR-2024-006',
        objet: 'Contrat entretien et réparation véhicules administratifs',
        type: TypeMarche.SERVICES,
        montant: 420000,
        dateNotification: new Date('2024-03-20'),
        delaiExecution: 365,
        statut: StatutMarche.ATTRIBUE_DEFINITIVEMENT,
        autoriteContractanteNom: 'Ministère de la Santé',
        autoriteContractanteContact: 'M. Karim Alaoui',
        autoriteContractanteEmail: 'achats@sante.gov.ma',
        autoriteContractanteTel: '+212 5 37 76 81 00',
        dateAttributionProvisoire: new Date('2024-04-01'),
        dateAttributionDefinitive: new Date('2024-04-15'),
        userId: responsableUser.id,
      },
    }),

    // 7. EN_ATTENTE_LIVRAISON_OS
    prisma.marche.create({
      data: {
        numero: 'MAR-2023-015',
        objet: 'Fourniture de 20 véhicules tout terrain',
        type: TypeMarche.FOURNITURES,
        montant: 2500000,
        dateNotification: new Date('2023-11-15'),
        dateOrdreService: new Date('2024-01-10'),
        delaiExecution: 90,
        dateFinPrevue: new Date('2024-04-10'),
        statut: StatutMarche.EN_ATTENTE_LIVRAISON_OS,
        autoriteContractanteNom: 'Gendarmerie Royale',
        autoriteContractanteEmail: 'marches@gendarmerie.gov.ma',
        autoriteContractanteTel: '+212 5 37 71 78 00',
        dateLivraisonPrevue: new Date('2024-04-05'),
        dureeLivraisonPrevue: 85,
        userId: adminUser.id,
      },
    }),

    // 8. EN_EXECUTION
    prisma.marche.create({
      data: {
        numero: 'MAR-2023-018',
        objet: 'Prestations intellectuelles - Audit parc automobile',
        type: TypeMarche.PRESTATIONS_INTELLECTUELLES,
        montant: 150000,
        dateNotification: new Date('2023-12-01'),
        dateOrdreService: new Date('2024-01-15'),
        delaiExecution: 120,
        dateFinPrevue: new Date('2024-05-15'),
        statut: StatutMarche.EN_EXECUTION,
        autoriteContractanteNom: 'Ministère de l\'Économie et des Finances',
        autoriteContractanteContact: 'M. Youssef Tahiri',
        autoriteContractanteEmail: 'marches@finances.gov.ma',
        dateReceptionProvisoirePrevue: new Date('2024-05-10'),
        userId: responsableUser.id,
      },
    }),

    // 9. EXECUTE_ATTENTE_GARANTIES
    prisma.marche.create({
      data: {
        numero: 'MAR-2023-012',
        objet: 'Fourniture de véhicules de service',
        type: TypeMarche.FOURNITURES,
        montant: 890000,
        dateNotification: new Date('2023-09-01'),
        dateOrdreService: new Date('2023-10-15'),
        delaiExecution: 90,
        dateFinPrevue: new Date('2024-01-15'),
        dateReception: new Date('2024-01-10'),
        statut: StatutMarche.EXECUTE_ATTENTE_GARANTIES,
        autoriteContractanteNom: 'Office Chérifien des Phosphates',
        autoriteContractanteEmail: 'achats@ocp.ma',
        autoriteContractanteTel: '+212 5 22 23 00 25',
        garantiesLiberees: false,
        userId: adminUser.id,
      },
    }),

    // 10. CLOTURE
    prisma.marche.create({
      data: {
        numero: 'MAR-2023-005',
        objet: 'Travaux réaménagement atelier mécanique',
        type: TypeMarche.TRAVAUX,
        montant: 520000,
        dateNotification: new Date('2023-06-01'),
        dateOrdreService: new Date('2023-07-10'),
        delaiExecution: 120,
        dateFinPrevue: new Date('2023-11-10'),
        dateReception: new Date('2023-11-05'),
        statut: StatutMarche.CLOTURE,
        autoriteContractanteNom: 'Conseil Régional Rabat-Salé-Kénitra',
        autoriteContractanteContact: 'M. Hassan Benali',
        autoriteContractanteTel: '+212 5 37 26 17 00',
        dateClotureAdministrative: new Date('2023-12-15'),
        userId: responsableUser.id,
      },
    }),
  ])

  console.log(`✅ ${marches.length} marchés créés avec succès`)

  // ============================================================================
  // CRÉER DES CAUTIONS DE TEST
  // ============================================================================

  console.log('\n🔐 Création des cautions...')

  const now = new Date()
  const addDays = (date: Date, days: number) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  const cautions = await Promise.all([
    // Caution PROVISOIRE - ACTIVE - échéance dans 45 jours
    prisma.caution.create({
      data: {
        reference: 'CAU-2024-001',
        type: TypeCaution.SOUMISSION,
        montant: 25000,
        dateEmission: new Date('2024-02-01'),
        dateEcheance: addDays(now, 45),
        statut: StatutCaution.ACTIVE,
        banqueNom: 'Attijariwafa Bank',
        banqueContact: 'Service Cautions - +212 5 22 29 88 88',
        marcheId: marches[2].id,
        userId: responsableUser.id,
      },
    }),

    // Caution DEFINITIVE - ACTIVE - échéance dans 25 jours
    prisma.caution.create({
      data: {
        reference: 'CAU-2024-002',
        type: TypeCaution.BONNE_EXECUTION,
        montant: 42000,
        dateEmission: new Date('2024-03-20'),
        dateEcheance: addDays(now, 25),
        statut: StatutCaution.ACTIVE,
        banqueNom: 'Banque Populaire',
        banqueContact: 'M. Rachid Bennani - +212 5 22 46 99 00',
        marcheId: marches[5].id,
        userId: responsableUser.id,
      },
    }),

    // Caution AVANCE - ACTIVE - échéance dans 12 jours (CRITICAL)
    prisma.caution.create({
      data: {
        reference: 'CAU-2023-015',
        type: TypeCaution.AVANCE_DEMARRAGE,
        montant: 250000,
        dateEmission: new Date('2024-01-10'),
        dateEcheance: addDays(now, 12),
        statut: StatutCaution.ACTIVE,
        banqueNom: 'BMCE Bank',
        banqueContact: 'Service Entreprises - +212 5 22 20 30 40',
        marcheId: marches[6].id,
        userId: adminUser.id,
      },
    }),
  ])

  console.log(`✅ ${cautions.length} cautions créées`)

  console.log('\n🎉 Seeding terminé avec succès !')
}

main()
  .catch((e) => {
    console.error('❌ Erreur durant le seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
