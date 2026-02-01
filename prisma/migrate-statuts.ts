/**
 * Script de migration des statuts de marchés
 *
 * Ce script migre les marchés ayant le statut RESILIE_ANNULE_INFRUCTUEUX
 * vers les nouveaux statuts spécifiques : RESILIE, ANNULE, ou INFRUCTUEUX
 *
 * Logique heuristique de classification :
 * - Analyse des notes et descriptions pour détecter des mots-clés
 * - Les cas ambigus sont marqués pour révision manuelle
 */

import { PrismaClient, StatutMarche } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Adapter PostgreSQL requis pour Prisma 7
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

interface MigrationResult {
  marcheId: string;
  objet: string;
  ancienStatut: string;
  nouveauStatut: StatutMarche | null;
  raison: string;
  revisionManuelleRequise: boolean;
}

// Mots-clés pour la détection heuristique
const MOTS_CLES = {
  RESILIE: [
    'résili',
    'resili',
    'rupture',
    'annulation contrat',
    'fin anticipée',
    'terminé avant terme',
    'non-respect',
    'défaillance',
  ],
  ANNULE: [
    'annul',
    'abandon',
    'retiré',
    'retire',
    'désistement',
    'desistement',
    'non-attribution',
    'non attribué',
  ],
  INFRUCTUEUX: [
    'infructueux',
    'non retenu',
    'perte',
    'concurrent',
    'perdant',
    'échec',
    'echec',
    'autre attributaire',
    'attributaire différent',
  ],
};

/**
 * Analyse le texte pour détecter le nouveau statut probable
 */
function analyserTexte(texte: string): StatutMarche | null {
  const texteLower = texte.toLowerCase();

  const scores = {
    RESILIE: 0,
    ANNULE: 0,
    INFRUCTUEUX: 0,
  };

  // Compter les occurrences de mots-clés
  for (const [statut, motsCles] of Object.entries(MOTS_CLES)) {
    for (const motCle of motsCles) {
      if (texteLower.includes(motCle)) {
        scores[statut as keyof typeof scores]++;
      }
    }
  }

  // Retourner le statut avec le score le plus élevé
  const maxScore = Math.max(scores.RESILIE, scores.ANNULE, scores.INFRUCTUEUX);

  if (maxScore === 0) {
    return null; // Aucun mot-clé détecté
  }

  // Vérifier s'il y a ambiguïté (plusieurs statuts avec le même score)
  const statutsAvecMaxScore = Object.entries(scores)
    .filter(([_, score]) => score === maxScore)
    .map(([statut]) => statut);

  if (statutsAvecMaxScore.length > 1) {
    return null; // Ambiguïté
  }

  return statutsAvecMaxScore[0] as StatutMarche;
}

/**
 * Détermine le nouveau statut d'un marché
 */
function determinerNouveauStatut(marche: any): {
  nouveauStatut: StatutMarche | null;
  raison: string;
  revisionManuelleRequise: boolean;
} {
  // Combiner toutes les sources de texte pour l'analyse
  const texteAAnalyser = [
    marche.numero || '',
    marche.objet || '',
  ].join(' ');

  const nouveauStatut = analyserTexte(texteAAnalyser);

  if (!nouveauStatut) {
    return {
      nouveauStatut: null,
      raison: 'Aucun mot-clé détecté ou ambiguïté - révision manuelle requise',
      revisionManuelleRequise: true,
    };
  }

  return {
    nouveauStatut,
    raison: `Détecté automatiquement via analyse de texte (mots-clés de ${nouveauStatut})`,
    revisionManuelleRequise: false,
  };
}

/**
 * Exécute la migration
 */
async function migrerStatuts(): Promise<MigrationResult[]> {
  console.log('🔍 Recherche des marchés avec statut RESILIE_ANNULE_INFRUCTUEUX...\n');

  // Récupérer tous les marchés avec l'ancien statut
  const marchesAMigrer = await prisma.marche.findMany({
    where: {
      statut: 'RESILIE_ANNULE_INFRUCTUEUX' as any, // L'ancien statut n'existe plus dans le type, mais peut exister en DB
    },
    select: {
      id: true,
      numero: true,
      objet: true,
      statut: true,
    },
  });

  console.log(`📊 ${marchesAMigrer.length} marché(s) trouvé(s)\n`);

  if (marchesAMigrer.length === 0) {
    console.log('✅ Aucune migration nécessaire\n');
    return [];
  }

  const resultats: MigrationResult[] = [];

  // Traiter chaque marché
  for (const marche of marchesAMigrer) {
    const { nouveauStatut, raison, revisionManuelleRequise } = determinerNouveauStatut(marche);

    const resultat: MigrationResult = {
      marcheId: marche.id,
      objet: marche.objet,
      ancienStatut: 'RESILIE_ANNULE_INFRUCTUEUX',
      nouveauStatut,
      raison,
      revisionManuelleRequise,
    };

    resultats.push(resultat);

    // Afficher le résultat
    console.log(`📝 Marché: ${marche.numero} - ${marche.objet}`);
    console.log(`   ID: ${marche.id}`);
    console.log(`   Nouveau statut: ${nouveauStatut || '⚠️  À définir manuellement'}`);
    console.log(`   Raison: ${raison}`);
    console.log('');

    // Mettre à jour le marché si un statut a été déterminé
    if (nouveauStatut && !revisionManuelleRequise) {
      await prisma.marche.update({
        where: { id: marche.id },
        data: {
          statut: nouveauStatut,
        },
      });
    }
  }

  return resultats;
}

/**
 * Génère un rapport de migration
 */
function genererRapport(resultats: MigrationResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('📋 RAPPORT DE MIGRATION DES STATUTS');
  console.log('='.repeat(80) + '\n');

  const stats = {
    total: resultats.length,
    resilie: resultats.filter((r) => r.nouveauStatut === 'RESILIE').length,
    annule: resultats.filter((r) => r.nouveauStatut === 'ANNULE').length,
    infructueux: resultats.filter((r) => r.nouveauStatut === 'INFRUCTUEUX').length,
    revisionManuelle: resultats.filter((r) => r.revisionManuelleRequise).length,
  };

  console.log(`Total de marchés traités: ${stats.total}`);
  console.log(`  - Migrés vers RESILIE: ${stats.resilie}`);
  console.log(`  - Migrés vers ANNULE: ${stats.annule}`);
  console.log(`  - Migrés vers INFRUCTUEUX: ${stats.infructueux}`);
  console.log(`  - Nécessitant révision manuelle: ${stats.revisionManuelle}\n`);

  if (stats.revisionManuelle > 0) {
    console.log('⚠️  MARCHÉS NÉCESSITANT RÉVISION MANUELLE:\n');
    const marchesARevoir = resultats.filter((r) => r.revisionManuelleRequise);
    marchesARevoir.forEach((r, index) => {
      console.log(`${index + 1}. ${r.objet}`);
      console.log(`   ID: ${r.marcheId}`);
      console.log(`   Raison: ${r.raison}\n`);
    });
  }

  console.log('='.repeat(80) + '\n');
}

/**
 * Point d'entrée principal
 */
async function main() {
  try {
    console.log('🚀 Démarrage de la migration des statuts de marchés\n');
    console.log('⏳ Cette opération va analyser et migrer les marchés...\n');

    const resultats = await migrerStatuts();

    genererRapport(resultats);

    console.log('✅ Migration terminée avec succès!\n');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
main()
  .catch((error) => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });

export { migrerStatuts, genererRapport, type MigrationResult };
