## Why

Le système de gestion des cautions et garanties bancaires est critique pour la maîtrise du risque contractuel et financier dans les marchés publics. Actuellement, l'absence de ce module expose l'entreprise à des risques majeurs : perte de garanties non libérées (immobilisation de trésorerie), expiration de cautions non renouvelées (rejet d'offres, pénalités), et absence de traçabilité documentaire. Ce module MVP permettra la gestion complète du cycle de vie des cautions avec alertes automatiques sur les échéances critiques.

## What Changes

- Ajout d'un module complet de gestion des cautions et garanties bancaires
- CRUD complet pour les 4 types de cautions (Provisoire, Définitive, Avance, Retenue de garantie)
- Système de suivi des échéances avec alertes automatiques (30j, 15j, 7j avant expiration)
- Interface de visualisation des cautions actives, expirées et libérées par marché
- Liaison bidirectionnelle entre marchés et cautions
- Gestion des informations bancaires (banque émettrice, contact, référence)
- Statistiques et indicateurs de suivi (montants mobilisés, cautions à libérer)
- Export des données de cautions pour reporting comptable

## Capabilities

### New Capabilities

- `caution-crud`: Gestion CRUD complète des cautions bancaires (création, lecture, modification, suppression) avec validation des données et gestion des erreurs
- `caution-lifecycle`: Suivi du cycle de vie des cautions (statuts : ACTIVE, EXPIREE, LIBEREE, APPELEE) avec transitions automatiques et manuelles
- `caution-alerts`: Système d'alertes automatiques basé sur les échéances (notifications 30j, 15j, 7j avant expiration)
- `caution-ui`: Interface utilisateur complète pour la gestion des cautions (liste, filtres, formulaires, détails, tableaux de bord)
- `caution-marche-relation`: Gestion de la relation entre cautions et marchés publics (affichage des cautions par marché, création depuis un marché)

### Modified Capabilities

- `database-schema`: Ajout du modèle Caution avec relations vers Marche et User selon ARCHITECTURE.md

## Impact

**Base de données**
- Ajout de la table `cautions` avec le schéma Prisma défini dans ARCHITECTURE.md
- Ajout des enums `TypeCaution` et `StatutCaution`
- Création d'index sur `dateEcheance`, `statut`, et `marcheId`
- Migration Prisma requise

**Backend**
- Nouveaux Server Actions dans `lib/actions/cautions.ts` (CRUD + logique métier)
- Schémas de validation Zod dans `lib/validations/caution.ts`
- Utilitaires de calcul d'alertes dans `lib/utils/caution.ts`

**Frontend**
- Nouvelle section `/cautions` dans le dashboard
- Composants UI : `caution-card`, `caution-form`, `caution-detail`, `caution-filters`
- Intégration dans la page détail marché (`/marches/[id]`) pour afficher les cautions associées
- Composants shadcn/ui : Table, Form, Dialog, Badge, Calendar, Select

**Dépendances**
- Utilisation de `date-fns` pour manipulation des dates (déjà installé)
- Composants shadcn/ui existants (pas de nouvelles dépendances UI)
- Prisma Client régénération après migration

**Navigation**
- Ajout d'un item "Cautions" dans le menu principal du dashboard
- Breadcrumbs pour navigation `/cautions`, `/cautions/nouveau`, `/cautions/[id]`

**Système d'alertes**
- Création de la logique de génération d'alertes (prête pour intégration future avec Vercel Cron + Nodemailer)
- Stockage des alertes dans la table existante `alertes` (selon ARCHITECTURE.md)
