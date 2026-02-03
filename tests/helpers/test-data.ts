/**
 * Générateur de données de test pour les tests E2E
 */

export interface TestMarche {
  reference: string;
  intitule: string;
  typeMarche: 'FOURNITURES' | 'SERVICES' | 'TRAVAUX';
  statut: string;
  montantEstime?: number;
}

export interface TestDocument {
  nom: string;
  type: string;
  phase: string;
  description?: string;
  tags?: string[];
}

export interface TestCaution {
  reference: string;
  typeCaution: 'PROVISOIRE' | 'DEFINITIVE' | 'AVANCE' | 'RETENUE_GARANTIE';
  montant: number;
  banqueNom: string;
  dateEmission: string;
  dateEcheance: string;
}

/**
 * Générer un marché de test
 */
export function createTestMarche(override: Partial<TestMarche> = {}): TestMarche {
  const timestamp = Date.now();

  return {
    reference: `TEST-MARCHE-${timestamp}`,
    intitule: `Marché de test ${timestamp}`,
    typeMarche: 'FOURNITURES',
    statut: 'OPPORTUNITE_IDENTIFIEE',
    montantEstime: 100000,
    ...override,
  };
}

/**
 * Générer un document de test
 */
export function createTestDocument(override: Partial<TestDocument> = {}): TestDocument {
  const timestamp = Date.now();

  return {
    nom: `Document-Test-${timestamp}.pdf`,
    type: 'DAO',
    phase: 'PREPARATION',
    description: 'Document de test généré automatiquement',
    tags: ['test', 'automation'],
    ...override,
  };
}

/**
 * Générer une caution de test
 */
export function createTestCaution(override: Partial<TestCaution> = {}): TestCaution {
  const timestamp = Date.now();
  const now = new Date();
  const threeMonthsLater = new Date(now);
  threeMonthsLater.setMonth(now.getMonth() + 3);

  return {
    reference: `TEST-CAUTION-${timestamp}`,
    typeCaution: 'PROVISOIRE',
    montant: 5000,
    banqueNom: 'Banque de Test',
    dateEmission: now.toISOString().split('T')[0]!,
    dateEcheance: threeMonthsLater.toISOString().split('T')[0]!,
    ...override,
  };
}

/**
 * Chemin vers un fichier de test
 */
export function getTestFilePath(filename: string): string {
  return `tests/fixtures/files/${filename}`;
}

/**
 * Attendre un délai (pour laisser les animations se terminer)
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
