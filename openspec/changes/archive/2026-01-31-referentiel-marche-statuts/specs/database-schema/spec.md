## ADDED Requirements

### Requirement: System SHALL define Prisma schema for Marche model

Le système doit créer un schéma Prisma complet pour le modèle `Marche` avec tous les champs métier nécessaires.

#### Scenario: Marche model has all required fields
- **WHEN** le fichier `prisma/schema.prisma` est examiné
- **THEN** le modèle `Marche` contient le champ `id` (String, @id, @default(cuid()))
- **THEN** le modèle contient le champ `numero` (String, @unique)
- **THEN** le modèle contient le champ `objet` (String)
- **THEN** le modèle contient le champ `type` (TypeMarche enum)
- **THEN** le modèle contient le champ `montant` (Decimal, @db.Decimal(15, 2))
- **THEN** le modèle contient le champ `statut` (StatutMarche enum, @default)
- **THEN** le modèle contient les champs de dates (dateNotification, dateOrdreService, dateFinPrevue, dateReception)
- **THEN** le modèle contient le champ `delaiExecution` (Int)

#### Scenario: Marche model has supplier information fields
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `fournisseurNom` (String) est présent
- **THEN** le champ `fournisseurContact` (String, optionnel) est présent
- **THEN** le champ `fournisseurEmail` (String, optionnel) est présent
- **THEN** le champ `fournisseurTel` (String, optionnel) est présent

#### Scenario: Marche model has timestamps
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `createdAt` (DateTime, @default(now())) est présent
- **THEN** le champ `updatedAt` (DateTime, @updatedAt) est présent

### Requirement: System SHALL define StatutMarche enum with 11 lifecycle stages

Le système doit définir un enum `StatutMarche` avec les 11 statuts du cycle de vie définis dans le PRD.

#### Scenario: StatutMarche enum contains all required values
- **WHEN** le schéma Prisma est examiné
- **THEN** l'enum `StatutMarche` contient `OPPORTUNITE_IDENTIFIEE`
- **THEN** l'enum contient `DOSSIER_EN_PREPARATION`
- **THEN** l'enum contient `OFFRE_DEPOSEE`
- **THEN** l'enum contient `EN_ATTENTE_ATTRIBUTION`
- **THEN** l'enum contient `ATTRIBUE_PROVISOIREMENT`
- **THEN** l'enum contient `ATTRIBUE_DEFINITIVEMENT`
- **THEN** l'enum contient `EN_ATTENTE_LIVRAISON_OS`
- **THEN** l'enum contient `EN_EXECUTION`
- **THEN** l'enum contient `EXECUTE_ATTENTE_GARANTIES`
- **THEN** l'enum contient `CLOTURE`
- **THEN** l'enum contient `RESILIE_ANNULE_INFRUCTUEUX`

#### Scenario: Default status is set
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `statut` a une valeur par défaut définie
- **THEN** la valeur par défaut est un statut initial approprié (OPPORTUNITE_IDENTIFIEE ou DOSSIER_EN_PREPARATION)

### Requirement: System SHALL define TypeMarche enum

Le système doit définir un enum `TypeMarche` pour les types de marchés selon le PRD.

#### Scenario: TypeMarche enum contains all market types
- **WHEN** le schéma Prisma est examiné
- **THEN** l'enum `TypeMarche` contient `TRAVAUX`
- **THEN** l'enum contient `FOURNITURES`
- **THEN** l'enum contient `SERVICES`
- **THEN** l'enum contient `PRESTATIONS_INTELLECTUELLES`

### Requirement: System SHALL define indexes for performance

Le système doit créer des indexes sur les champs fréquemment utilisés pour les requêtes et filtres.

#### Scenario: Performance indexes are defined
- **WHEN** le modèle `Marche` est examiné
- **THEN** un index existe sur le champ `numero` (@@index([numero]))
- **THEN** un index existe sur le champ `statut` (@@index([statut]))
- **THEN** un index existe sur le champ `dateFinPrevue` (@@index([dateFinPrevue]))

### Requirement: System SHALL configure Prisma client generator

Le système doit configurer le générateur de client Prisma correctement.

#### Scenario: Prisma generator is configured
- **WHEN** le fichier `prisma/schema.prisma` est examiné
- **THEN** la section `generator client` existe
- **THEN** le provider est défini comme "prisma-client-js"

#### Scenario: Datasource is configured for PostgreSQL
- **WHEN** le schéma Prisma est examiné
- **THEN** la section `datasource db` existe
- **THEN** le provider est "postgresql"
- **THEN** l'URL est lue depuis la variable d'environnement `DATABASE_URL`

### Requirement: System SHALL create initial migration

Le système doit créer et appliquer la migration initiale de la base de données.

#### Scenario: Initial migration is created
- **WHEN** la commande `prisma migrate dev` est exécutée
- **THEN** un dossier `prisma/migrations` est créé
- **THEN** une migration avec un nom descriptif (ex: "init_marche_schema") est générée
- **THEN** le fichier SQL de migration contient la création de la table `marches`
- **THEN** le fichier SQL contient la création des enums `StatutMarche` et `TypeMarche`

#### Scenario: Prisma client is generated
- **WHEN** la migration est appliquée
- **THEN** le client Prisma est généré dans `node_modules/@prisma/client`
- **THEN** les types TypeScript pour `Marche` sont disponibles

### Requirement: System SHALL create Prisma client singleton

Le système doit créer une instance singleton du client Prisma pour éviter les multiples connexions.

#### Scenario: Singleton pattern is implemented
- **WHEN** le fichier `lib/db/prisma.ts` est examiné
- **THEN** le client Prisma utilise le pattern singleton global
- **THEN** le client est réutilisé en développement (hot reload)
- **THEN** les logs sont configurés selon l'environnement (query en dev, error en prod)

### Requirement: System SHALL create seed script with test data

Le système doit fournir un script de seed avec des données de test couvrant tous les statuts.

#### Scenario: Seed script exists
- **WHEN** le fichier `prisma/seed.ts` est examiné
- **THEN** le fichier existe et est exécutable
- **THEN** le script est référencé dans `package.json` sous `prisma.seed`

#### Scenario: Seed data covers all statuses
- **WHEN** le script seed est exécuté
- **THEN** au moins 10 marchés sont créés
- **THEN** tous les 11 statuts sont représentés dans les données
- **THEN** les marchés ont des dates variées (passées, présentes, futures)
- **THEN** différents types de marchés sont inclus
