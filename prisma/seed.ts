import { PrismaClient, TypeMarche, StatutMarche } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
})

async function main() {
  console.log('🌱 Début du seeding...')

  // Supprimer les données existantes
  await prisma.marche.deleteMany()
  console.log('✅ Données existantes supprimées')

  // Créer 15 marchés couvrant tous les 11 statuts
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
        fournisseurNom: 'Auto Plus SARL',
        fournisseurEmail: 'contact@autoplus.ma',
        fournisseurTel: '+212 5 22 11 22 33',
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
        fournisseurNom: 'Garage Central',
        fournisseurContact: 'M. Ahmed Benjelloun',
        fournisseurEmail: 'ahmed@garagecentral.ma',
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
        fournisseurNom: 'Maroc Auto Distribution',
        fournisseurEmail: 'commercial@mad.ma',
        fournisseurTel: '+212 5 22 44 55 66',
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
        fournisseurNom: 'BTP Moderne',
        fournisseurContact: 'Mme Fatima Zahra',
        fournisseurTel: '+212 6 61 22 33 44',
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
        fournisseurNom: 'Pièces Auto Maroc',
        fournisseurEmail: 'ventes@pam.ma',
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
        fournisseurNom: 'Service Auto Pro',
        fournisseurContact: 'M. Karim Alaoui',
        fournisseurEmail: 'karim@sapro.ma',
        fournisseurTel: '+212 5 22 77 88 99',
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
        fournisseurNom: '4x4 Premium Motors',
        fournisseurEmail: 'sales@4x4premium.ma',
        fournisseurTel: '+212 5 22 99 00 11',
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
        fournisseurNom: 'Cabinet Conseil Auto',
        fournisseurContact: 'M. Youssef Tahiri',
        fournisseurEmail: 'y.tahiri@cca.ma',
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
        fournisseurNom: 'Auto Excellence',
        fournisseurEmail: 'info@autoexcellence.ma',
        fournisseurTel: '+212 5 22 33 44 55',
      },
    }),

    // 10. CLOTURE (2 marchés)
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
        fournisseurNom: 'Construction BTP',
        fournisseurContact: 'M. Hassan Benali',
        fournisseurTel: '+212 6 62 33 44 55',
      },
    }),

    prisma.marche.create({
      data: {
        numero: 'MAR-2023-008',
        objet: 'Fourniture équipements sécurité véhicules',
        type: TypeMarche.FOURNITURES,
        montant: 95000,
        dateNotification: new Date('2023-08-15'),
        dateOrdreService: new Date('2023-09-01'),
        delaiExecution: 30,
        dateFinPrevue: new Date('2023-10-01'),
        dateReception: new Date('2023-09-28'),
        statut: StatutMarche.CLOTURE,
        fournisseurNom: 'Sécurité Auto Plus',
        fournisseurEmail: 'contact@secuauto.ma',
      },
    }),

    // 11. RESILIE_ANNULE_INFRUCTUEUX (3 marchés)
    prisma.marche.create({
      data: {
        numero: 'MAR-2023-010',
        objet: 'Fourniture véhicules électriques',
        type: TypeMarche.FOURNITURES,
        montant: 1800000,
        dateNotification: new Date('2023-10-01'),
        delaiExecution: 180,
        statut: StatutMarche.RESILIE_ANNULE_INFRUCTUEUX,
        fournisseurNom: 'Eco Mobility',
        fournisseurEmail: 'info@ecomobility.ma',
        fournisseurTel: '+212 5 22 66 77 88',
      },
    }),

    prisma.marche.create({
      data: {
        numero: 'MAR-2024-007',
        objet: 'Services de lavage flotte véhicules',
        type: TypeMarche.SERVICES,
        montant: 75000,
        dateNotification: new Date('2024-01-20'),
        delaiExecution: 365,
        statut: StatutMarche.RESILIE_ANNULE_INFRUCTUEUX,
        fournisseurNom: 'Clean Auto Services',
        fournisseurContact: 'M. Omar Tazi',
      },
    }),

    prisma.marche.create({
      data: {
        numero: 'MAR-2023-016',
        objet: 'Contrat maintenance climatisation véhicules',
        type: TypeMarche.SERVICES,
        montant: 125000,
        dateNotification: new Date('2023-11-20'),
        dateOrdreService: new Date('2023-12-15'),
        delaiExecution: 365,
        dateFinPrevue: new Date('2024-12-15'),
        statut: StatutMarche.RESILIE_ANNULE_INFRUCTUEUX,
        fournisseurNom: 'Clim Auto Expert',
        fournisseurEmail: 'contact@climexpert.ma',
        fournisseurTel: '+212 5 22 88 99 00',
      },
    }),

    // Marchés supplémentaires pour atteindre 15
    prisma.marche.create({
      data: {
        numero: 'MAR-2024-008',
        objet: 'Fourniture pneus et accessoires',
        type: TypeMarche.FOURNITURES,
        montant: 320000,
        dateNotification: new Date('2024-02-10'),
        delaiExecution: 90,
        statut: StatutMarche.OFFRE_DEPOSEE,
        fournisseurNom: 'Pneumatique Pro',
        fournisseurEmail: 'ventes@pneumapro.ma',
        fournisseurTel: '+212 5 22 11 33 55',
      },
    }),
  ])

  console.log(`✅ ${marches.length} marchés créés avec succès`)
  console.log('\n📊 Répartition par statut:')

  const stats = await prisma.marche.groupBy({
    by: ['statut'],
    _count: true,
  })

  stats.forEach(stat => {
    console.log(`   ${stat.statut}: ${stat._count} marché(s)`)
  })

  console.log('\n🎉 Seeding terminé !')
}

main()
  .catch((e) => {
    console.error('❌ Erreur durant le seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
