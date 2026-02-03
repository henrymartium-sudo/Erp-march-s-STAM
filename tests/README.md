# Tests E2E - ERP Marchés STAM

## Structure des tests

```
tests/
├── helpers/
│   ├── auth.ts          # Helpers d'authentification
│   └── test-data.ts     # Générateur de données de test
├── fixtures/
│   └── files/
│       └── test-document.pdf  # Fichier PDF de test
├── documents/
│   ├── upload.spec.ts      # Tests d'upload de documents
│   ├── filters.spec.ts     # Tests de filtrage
│   ├── crud.spec.ts        # Tests CRUD complets
│   ├── preview.spec.ts     # Tests de prévisualisation
│   └── versioning.spec.ts  # Tests de versioning
└── README.md              # Ce fichier
```

## Lancer les tests

### Tous les tests
```bash
npx playwright test
```

### Tests d'un module spécifique
```bash
npx playwright test tests/documents/
```

### Un fichier de test spécifique
```bash
npx playwright test tests/documents/upload.spec.ts
```

### Mode UI (interface graphique)
```bash
npx playwright test --ui
```

### Mode debug
```bash
npx playwright test --debug
```

### Tests sur un navigateur spécifique
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Configuration

La configuration se trouve dans `playwright.config.ts` :
- URL de base : `http://localhost:3000`
- Timeout par test : 30 secondes
- Retry en cas d'échec : 2 fois (CI uniquement)
- Screenshots et vidéos : uniquement en cas d'échec

## Helpers disponibles

### Authentification (`helpers/auth.ts`)

```typescript
import { login, logout, TEST_USERS } from '../helpers/auth';

// Se connecter
await login(page, TEST_USERS.admin);

// Utilisateurs disponibles
TEST_USERS.admin         // ADMIN
TEST_USERS.avance        // AVANCE
TEST_USERS.exploitation  // EXPLOITATION
TEST_USERS.visiteur      // VISITEUR
```

### Données de test (`helpers/test-data.ts`)

```typescript
import {
  createTestMarche,
  createTestDocument,
  createTestCaution
} from '../helpers/test-data';

// Générer un marché de test
const marche = createTestMarche({
  reference: 'MON-MARCHE-123'
});

// Générer un document de test
const doc = createTestDocument({
  type: 'DAO'
});
```

## Scénarios de test

### Module Documents (50 tests)

#### Upload (10 tests)
- ✅ Afficher la page d'upload
- ✅ Uploader un fichier PDF
- ✅ Valider la taille maximale (10MB)
- ✅ Valider les types de fichiers autorisés
- ✅ Afficher une barre de progression
- ✅ Uploader un document lié à un marché
- ✅ Gérer les erreurs d'upload
- ✅ Annuler l'upload
- ✅ Respecter les permissions (VISITEUR)

#### Filtres (10 tests)
- ✅ Afficher le panneau de filtres
- ✅ Filtrer par type de document
- ✅ Filtrer par phase
- ✅ Combiner plusieurs filtres
- ✅ Filtrer par dates d'émission
- ✅ Rechercher par texte
- ✅ Supprimer un filtre individuel
- ✅ Réinitialiser tous les filtres
- ✅ Afficher le nombre de filtres actifs
- ✅ Persister les filtres lors de la navigation

#### CRUD (12 tests)
- ✅ Afficher la liste des documents
- ✅ Afficher les statistiques
- ✅ Créer un nouveau document
- ✅ Voir le détail d'un document
- ✅ Télécharger un document
- ✅ Supprimer un document (soft delete)
- ✅ Restaurer un document supprimé
- ✅ Afficher un message si aucun document
- ✅ Paginer les documents
- ✅ Trier les documents
- ✅ Respecter les permissions (VISITEUR)

#### Prévisualisation (8 tests)
- ✅ Prévisualiser un PDF
- ✅ Prévisualiser une image
- ✅ Message pour fichiers non prévisualisables
- ✅ Gérer les erreurs de chargement
- ✅ Afficher un loader
- ✅ Zoomer sur une image
- ✅ Afficher les métadonnées
- ✅ Sécuriser les URLs (URLs signées)

#### Versioning (10 tests)
- ✅ Créer une nouvelle version
- ✅ Afficher l'historique des versions
- ✅ Télécharger une version antérieure
- ✅ Afficher la version actuelle clairement
- ✅ Comparer deux versions
- ✅ Afficher les métadonnées de chaque version
- ✅ Empêcher la suppression de la version actuelle
- ✅ Numéroter les versions de façon incrémentale
- ✅ Conserver l'historique après soft delete

## Prérequis

### Utilisateurs de test

Les utilisateurs de test doivent exister dans la base de données :

```sql
-- Créer les utilisateurs de test
INSERT INTO "User" (id, nom, prenom, email, password, role) VALUES
  ('test-admin', 'Admin', 'Test', 'admin@erp-marches.local', '$2a$10$...', 'ADMIN'),
  ('test-avance', 'Avance', 'Test', 'avance@erp-marches.local', '$2a$10$...', 'AVANCE'),
  ('test-exploitation', 'Exploitation', 'Test', 'exploitation@erp-marches.local', '$2a$10$...', 'EXPLOITATION'),
  ('test-visiteur', 'Visiteur', 'Test', 'visiteur@erp-marches.local', '$2a$10$...', 'VISITEUR');
```

### Base de données de test

Il est recommandé d'utiliser une base de données dédiée aux tests :

```env
# .env.test
DATABASE_URL="postgresql://user:password@localhost:5432/erp_marches_test"
```

## Rapports

Les rapports de test sont générés dans :
- `playwright-report/` - Rapport HTML détaillé
- `test-results/` - Screenshots et vidéos des échecs

Pour voir le rapport HTML :
```bash
npx playwright show-report
```

## CI/CD

Les tests sont exécutés automatiquement dans la CI (GitHub Actions, Vercel, etc.) :
- Retry : 2 fois en cas d'échec
- Workers : 1 (séquentiel pour éviter les conflits DB)
- Timeout : Build CI échoue si tests > 10 minutes

## Prochains tests à ajouter

- [ ] Tests Cautions (après implémentation complète)
- [ ] Tests Véhicules (Phase 2)
- [ ] Tests Alertes (Phase 3)
- [ ] Tests Dashboard (enrichi)
- [ ] Tests Exports Excel/PDF (Phase 3)

## Ressources

- [Documentation Playwright](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)
