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

  // Créer 18 marchés couvrant tous les 13 statuts avec champs spécifiques
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
        autoriteContractanteNom: 'Conseil Régional Rabat-Salé-Kénitra',
        autoriteContractanteContact: 'M. Hassan Benali',
        autoriteContractanteTel: '+212 5 37 26 17 00',
        dateClotureAdministrative: new Date('2023-12-15'),
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
        autoriteContractanteNom: 'Protection Civile',
        autoriteContractanteEmail: 'marches@protectioncivile.gov.ma',
        dateClotureAdministrative: new Date('2023-10-20'),
      },
    }),

    // 11. RESILIE
    prisma.marche.create({
      data: {
        numero: 'MAR-2023-010',
        objet: 'Contrat maintenance climatisation véhicules',
        type: TypeMarche.SERVICES,
        montant: 125000,
        dateNotification: new Date('2023-11-20'),
        dateOrdreService: new Date('2023-12-15'),
        delaiExecution: 365,
        dateFinPrevue: new Date('2024-12-15'),
        statut: StatutMarche.RESILIE,
        autoriteContractanteNom: 'Ministère de l\'Équipement',
        autoriteContractanteEmail: 'achats@equipement.gov.ma',
        autoriteContractanteTel: '+212 5 37 68 84 00',
        dateResiliation: new Date('2024-03-20'),
        motifsResiliation: 'Non-respect des délais d\'intervention par le prestataire. Plusieurs véhicules sont restés immobilisés pendant plus de 15 jours sans intervention malgré les relances répétées.',
      },
    }),

    // 12. ANNULE
    prisma.marche.create({
      data: {
        numero: 'MAR-2024-007',
        objet: 'Services de lavage flotte véhicules',
        type: TypeMarche.SERVICES,
        montant: 75000,
        dateNotification: new Date('2024-01-20'),
        delaiExecution: 365,
        statut: StatutMarche.ANNULE,
        autoriteContractanteNom: 'Ministère de la Justice',
        autoriteContractanteContact: 'M. Omar Tazi',
        dateAnnulation: new Date('2024-02-15'),
        motifsAnnulation: 'Révision budgétaire du ministère suite aux nouvelles orientations. Le service sera internalisé au lieu d\'être externalisé.',
      },
    }),

    // 13. INFRUCTUEUX
    prisma.marche.create({
      data: {
        numero: 'MAR-2024-009',
        objet: 'Fourniture véhicules électriques',
        type: TypeMarche.FOURNITURES,
        montant: 1800000,
        dateNotification: new Date('2024-01-05'),
        delaiExecution: 180,
        statut: StatutMarche.INFRUCTUEUX,
        autoriteContractanteNom: 'Ministère de la Transition Énergétique',
        autoriteContractanteEmail: 'marches@energie.gov.ma',
        autoriteContractanteTel: '+212 5 37 68 00 00',
        dateInfructueux: new Date('2024-02-10'),
        motifsInfructueux: 'Notre offre financière était 18% au-dessus de la moyenne des offres concurrentes. Le concurrent gagnant a proposé des véhicules de même standing à un prix plus compétitif grâce à un partenariat direct avec le constructeur.',
        concurrentGagnant: 'Eco Mobility Solutions SARL',
        montantOffreConcurrent: 1520000,
      },
    }),

    // Marchés supplémentaires pour tests
    prisma.marche.create({
      data: {
        numero: 'MAR-2024-008',
        objet: 'Fourniture pneus et accessoires',
        type: TypeMarche.FOURNITURES,
        montant: 320000,
        dateNotification: new Date('2024-02-10'),
        delaiExecution: 90,
        statut: StatutMarche.OFFRE_DEPOSEE,
        autoriteContractanteNom: 'Royal Air Maroc',
        autoriteContractanteEmail: 'achats@royalairmaroc.com',
        autoriteContractanteTel: '+212 5 22 48 97 00',
        dateDepotOffre: new Date('2024-02-25'),
        delaiValiditeOffre: 90,
      },
    }),

    prisma.marche.create({
      data: {
        numero: 'MAR-2024-010',
        objet: 'Contrat assurance flotte automobile',
        type: TypeMarche.SERVICES,
        montant: 650000,
        dateNotification: new Date('2024-02-20'),
        delaiExecution: 365,
        statut: StatutMarche.EN_EXECUTION,
        autoriteContractanteNom: 'Agence pour le Développement Agricole',
        autoriteContractanteEmail: 'marches@ada.gov.ma',
        dateOrdreService: new Date('2024-03-01'),
        dateFinPrevue: new Date('2025-03-01'),
        dateReceptionProvisoirePrevue: new Date('2025-02-25'),
      },
    }),

    prisma.marche.create({
      data: {
        numero: 'MAR-2023-020',
        objet: 'Fourniture équipements GPS pour véhicules',
        type: TypeMarche.FOURNITURES,
        montant: 215000,
        dateNotification: new Date('2023-10-15'),
        dateOrdreService: new Date('2023-11-01'),
        delaiExecution: 60,
        dateFinPrevue: new Date('2024-01-01'),
        dateReception: new Date('2023-12-28'),
        statut: StatutMarche.EXECUTE_ATTENTE_GARANTIES,
        autoriteContractanteNom: 'Office National des Chemins de Fer',
        autoriteContractanteEmail: 'achats@oncf.ma',
        autoriteContractanteTel: '+212 5 37 77 47 47',
        garantiesLiberees: true,
      },
    }),

    prisma.marche.create({
      data: {
        numero: 'MAR-2024-011',
        objet: 'Travaux construction garage administratif',
        type: TypeMarche.TRAVAUX,
        montant: 1450000,
        dateNotification: new Date('2024-01-30'),
        delaiExecution: 180,
        statut: StatutMarche.ATTRIBUE_PROVISOIREMENT,
        autoriteContractanteNom: 'Wilaya de Marrakech',
        autoriteContractanteContact: 'Mme Laila Benkirane',
        autoriteContractanteEmail: 'marches@wilaya-marrakech.gov.ma',
        dateAttributionProvisoire: new Date('2024-03-05'),
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
