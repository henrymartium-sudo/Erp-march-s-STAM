## Why

Établir la fondation de l'application ERP Marchés Publics en créant le référentiel central des marchés et leur cycle de vie. Sans ce système de base, aucune autre fonctionnalité du MVP ne peut être implémentée (cautions, documents, véhicules, etc. dépendent tous du référentiel marché).

Le besoin est immédiat car l'utilisateur gère actuellement les marchés de manière non structurée, entraînant des pertes d'information, des oublis de délais et des risques contractuels. Cette fondation permettra de centraliser toute l'information et de tracer le cycle de vie complet de chaque marché.

## What Changes

- **NOUVEAU** : Initialisation complète du projet Next.js 15 avec la stack technique définie (TypeScript, Prisma, shadcn/ui, Tailwind)
- **NOUVEAU** : Schéma Prisma pour le modèle `Marche` avec tous les champs métier requis
- **NOUVEAU** : Système de statuts couvrant les 11 étapes du cycle de vie d'un marché (de "Opportunité identifiée" à "Clôturé")
- **NOUVEAU** : Interface de gestion des marchés (CRUD complet) avec Server Actions
- **NOUVEAU** : Pages : liste des marchés, création, édition, détail avec visualisation du statut
- **NOUVEAU** : Formulaires avec validation Zod pour saisie sécurisée
- **NOUVEAU** : Filtres de base (statut, période, type de marché)
- **NOUVEAU** : Configuration de la base de données PostgreSQL et Supabase
- **NOUVEAU** : Structure de dossiers Next.js App Router selon ARCHITECTURE.md

## Capabilities

### New Capabilities

- `project-initialization`: Initialisation du projet Next.js 15 avec toutes les dépendances (Next.js, React 19, TypeScript, Prisma, shadcn/ui, Tailwind CSS, Zod, React Hook Form)
- `database-schema`: Schéma Prisma pour le modèle Marche et l'enum StatutMarche avec les 11 statuts du cycle de vie
- `marche-crud`: Opérations CRUD complètes sur les marchés via Server Actions avec validation Zod
- `marche-ui`: Interface utilisateur pour gérer les marchés (liste, création, édition, détail)
- `statut-lifecycle`: Gestion du cycle de vie des marchés avec transitions de statut et visualisation

### Modified Capabilities

_Aucune - Il s'agit de la première implémentation_

## Impact

**Code créé** :
- Structure complète du projet Next.js : `/app`, `/components`, `/lib`, `/prisma`, `/types`
- Configuration : `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.js`, `prisma/schema.prisma`
- Modèles de données : Schéma Prisma `Marche` + enum `StatutMarche`
- Server Actions : `/lib/actions/marches.ts` pour toutes les mutations
- Validations : `/lib/validations/marche.ts` avec schémas Zod
- Composants UI : `/components/marches/*` (formulaires, liste, carte, détail, filtres)
- Pages : `/app/(dashboard)/marches/*` (liste, nouveau, [id], [id]/edit)

**Dépendances ajoutées** :
- Frontend : `next@15`, `react@19`, `typescript`, `tailwindcss`, `@radix-ui/*`, `lucide-react`, `react-hook-form`, `zod`, `date-fns`
- Backend : `@prisma/client`, `prisma`
- Dev : `@types/*`, `eslint`, `prettier`

**APIs créées** :
- Server Actions pour marchés : `createMarche()`, `updateMarche()`, `deleteMarche()`, `getMarcheById()`, `getAllMarches()`

**Base de données** :
- Table `marches` avec colonnes : id, numero, objet, type, montant, dateNotification, dateOrdreService, delaiExecution, dateFinPrevue, dateReception, statut, fournisseurNom, fournisseurContact, fournisseurEmail, fournisseurTel, userId, createdAt, updatedAt
- Enum `StatutMarche` avec 11 valeurs
- Indexes sur : numero, statut, dateFinPrevue

**Impact sur les autres fonctionnalités MVP** :
- ✅ **Bloquant pour** : Toutes les autres fonctionnalités du MVP (Cautions, Documents, Véhicules, etc.) dépendent du référentiel marché
- ✅ **Débloque** : Une fois implémenté, permet de développer Dossier administratif, Cautions & garanties, Documents & médias
