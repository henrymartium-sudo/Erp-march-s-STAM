## ADDED Requirements

### Requirement: System SHALL initialize Next.js 15 project with TypeScript

Le système doit créer un projet Next.js 15 fonctionnel avec TypeScript, App Router, et toutes les dépendances nécessaires pour l'application ERP Marchés.

#### Scenario: Successful project initialization
- **WHEN** la commande d'initialisation Next.js est exécutée
- **THEN** le projet est créé avec la structure App Router
- **THEN** TypeScript est configuré avec mode strict
- **THEN** le fichier `package.json` contient Next.js 15+ et React 19+

#### Scenario: TypeScript configuration is strict
- **WHEN** le fichier `tsconfig.json` est examiné
- **THEN** l'option `strict` est activée
- **THEN** l'option `noUncheckedIndexedAccess` est activée
- **THEN** les alias de chemin sont configurés (`@/*`)

### Requirement: System SHALL install all required dependencies

Le système doit installer toutes les bibliothèques nécessaires pour le MVP du référentiel marché.

#### Scenario: Core dependencies are installed
- **WHEN** le fichier `package.json` est examiné
- **THEN** Prisma Client et Prisma CLI sont présents
- **THEN** Zod est installé pour la validation
- **THEN** React Hook Form est installé
- **THEN** date-fns est installé pour les dates

#### Scenario: UI dependencies are installed
- **WHEN** shadcn/ui est initialisé
- **THEN** Radix UI primitives sont installés
- **THEN** Tailwind CSS est configuré
- **THEN** lucide-react est installé pour les icônes

### Requirement: System SHALL configure Tailwind CSS

Le système doit configurer Tailwind CSS selon les besoins du projet.

#### Scenario: Tailwind is properly configured
- **WHEN** le fichier `tailwind.config.ts` est examiné
- **THEN** le content path inclut les fichiers de l'App Router
- **THEN** le theme est étendu avec les variables CSS de shadcn/ui
- **THEN** le fichier `globals.css` contient les directives Tailwind

### Requirement: System SHALL create project folder structure

Le système doit créer la structure de dossiers Next.js App Router complète.

#### Scenario: App Router structure is created
- **WHEN** la racine du projet est examinée
- **THEN** le dossier `/app` existe
- **THEN** le dossier `/components` existe
- **THEN** le dossier `/lib` existe
- **THEN** le dossier `/prisma` existe
- **THEN** le dossier `/types` existe

#### Scenario: App subdirectories are created
- **WHEN** le dossier `/app` est examiné
- **THEN** le groupe de routes `(dashboard)` existe
- **THEN** le dossier `/app/(dashboard)/marches` existe
- **THEN** les fichiers `layout.tsx` et `page.tsx` racine existent

### Requirement: System SHALL configure environment variables template

Le système doit fournir un template `.env.example` avec toutes les variables nécessaires.

#### Scenario: Environment template is complete
- **WHEN** le fichier `.env.example` est examiné
- **THEN** la variable `DATABASE_URL` est documentée
- **THEN** les variables Supabase sont documentées
- **THEN** les commentaires expliquent chaque variable

#### Scenario: Git ignores sensitive files
- **WHEN** le fichier `.gitignore` est examiné
- **THEN** le fichier `.env` est ignoré
- **THEN** le dossier `node_modules` est ignoré
- **THEN** le dossier `.next` est ignoré
