## ADDED Requirements

### Requirement: System SHALL define Prisma schema for Caution model

Le système doit créer un schéma Prisma complet pour le modèle `Caution` avec tous les champs métier nécessaires.

#### Scenario: Caution model has all required fields
- **WHEN** le fichier `prisma/schema.prisma` est examiné
- **THEN** le modèle `Caution` contient le champ `id` (String, @id, @default(cuid()))
- **THEN** le modèle contient le champ `reference` (String, @unique)
- **THEN** le modèle contient le champ `type` (TypeCaution enum)
- **THEN** le modèle contient le champ `montant` (Decimal, @db.Decimal(15, 2))
- **THEN** le modèle contient le champ `dateEmission` (DateTime)
- **THEN** le modèle contient le champ `dateEcheance` (DateTime)
- **THEN** le modèle contient le champ `statut` (StatutCaution enum, @default(ACTIVE))

#### Scenario: Caution model has bank information fields
- **WHEN** le modèle `Caution` est examiné
- **THEN** le champ `banqueNom` (String) est présent
- **THEN** le champ `banqueContact` (String, optionnel) est présent

#### Scenario: Caution model has relationships
- **WHEN** le modèle `Caution` est examiné
- **THEN** la relation `marche` pointe vers le modèle `Marche` via `marcheId`
- **THEN** la relation a la contrainte `onDelete: Cascade` (suppression en cascade)
- **THEN** la relation `user` pointe vers le modèle `User` via `userId`
- **THEN** la relation `alertes` permet d'accéder aux alertes liées (Alerte[])

#### Scenario: Caution model has timestamps
- **WHEN** le modèle `Caution` est examiné
- **THEN** le champ `createdAt` (DateTime, @default(now())) est présent
- **THEN** le champ `updatedAt` (DateTime, @updatedAt) est présent

#### Scenario: Caution model has indexes for performance
- **WHEN** le modèle `Caution` est examiné
- **THEN** un index existe sur le champ `dateEcheance` (@@index([dateEcheance]))
- **THEN** un index existe sur le champ `statut` (@@index([statut]))
- **THEN** un index existe sur le champ `marcheId` (@@index([marcheId]))

#### Scenario: Caution model uses correct table name
- **WHEN** le modèle `Caution` est examiné
- **THEN** la directive `@@map("cautions")` est présente
- **THEN** le nom de table en base de données sera "cautions" (pluriel, minuscules)

### Requirement: System SHALL define TypeCaution enum

Le système doit définir un enum `TypeCaution` pour les 4 types de cautions bancaires.

#### Scenario: TypeCaution enum contains all caution types
- **WHEN** le schéma Prisma est examiné
- **THEN** l'enum `TypeCaution` contient `PROVISOIRE` avec commentaire "Caution de soumission"
- **THEN** l'enum contient `DEFINITIVE` avec commentaire "Caution de bonne exécution"
- **THEN** l'enum contient `AVANCE` avec commentaire "Caution d'avance de démarrage"
- **THEN** l'enum contient `RETENUE_GARANTIE` avec commentaire "Caution de retenue de garantie"

### Requirement: System SHALL define StatutCaution enum

Le système doit définir un enum `StatutCaution` pour les 4 statuts du cycle de vie des cautions.

#### Scenario: StatutCaution enum contains all status values
- **WHEN** le schéma Prisma est examiné
- **THEN** l'enum `StatutCaution` contient `ACTIVE`
- **THEN** l'enum contient `EXPIREE`
- **THEN** l'enum contient `LIBEREE`
- **THEN** l'enum contient `APPELEE` avec commentaire "Caution appelée par le maître d'ouvrage"

#### Scenario: Default status is ACTIVE
- **WHEN** le modèle `Caution` est examiné
- **THEN** le champ `statut` a une valeur par défaut définie
- **THEN** la valeur par défaut est `ACTIVE`

### Requirement: System SHALL create migration for Caution schema

Le système doit créer et appliquer la migration pour ajouter les cautions à la base de données.

#### Scenario: Migration adds Caution table
- **WHEN** la commande `prisma migrate dev` est exécutée
- **THEN** une nouvelle migration est créée dans `prisma/migrations`
- **THEN** le nom de la migration contient "add_caution_model" ou similaire
- **THEN** le fichier SQL contient `CREATE TABLE "cautions"`
- **THEN** le fichier SQL contient la création des enums `TypeCaution` et `StatutCaution`

#### Scenario: Migration creates foreign key constraints
- **WHEN** la migration SQL est examinée
- **THEN** une contrainte de clé étrangère existe vers la table `marches` sur `marcheId`
- **THEN** la contrainte a `ON DELETE CASCADE` pour suppression en cascade
- **THEN** une contrainte de clé étrangère existe vers la table `users` sur `userId`

#### Scenario: Migration creates indexes
- **WHEN** la migration SQL est examinée
- **THEN** un index est créé sur `dateEcheance`
- **THEN** un index est créé sur `statut`
- **THEN** un index est créé sur `marcheId`
- **THEN** un index unique est créé sur `reference`

#### Scenario: Prisma client is regenerated
- **WHEN** la migration est appliquée
- **THEN** le client Prisma est régénéré automatiquement
- **THEN** les types TypeScript pour `Caution`, `TypeCaution`, `StatutCaution` sont disponibles
- **THEN** les types sont importables depuis `@prisma/client`

### Requirement: System SHALL update seed script for Caution test data

Le système doit étendre le script de seed pour inclure des données de test de cautions.

#### Scenario: Seed script creates cautions for existing marchés
- **WHEN** le script `prisma/seed.ts` est exécuté
- **THEN** au moins 15 cautions sont créées
- **THEN** les cautions sont réparties sur différents marchés existants
- **THEN** tous les types de cautions sont représentés (PROVISOIRE, DEFINITIVE, AVANCE, RETENUE_GARANTIE)

#### Scenario: Seed data covers all caution statuses
- **WHEN** le script seed génère des cautions
- **THEN** des cautions avec statut ACTIVE sont créées (majorité)
- **THEN** des cautions avec statut EXPIREE sont créées (dates passées)
- **THEN** des cautions avec statut LIBEREE sont créées
- **THEN** au moins une caution avec statut APPELEE est créée

#### Scenario: Seed data has realistic dates and amounts
- **WHEN** le script seed génère des cautions
- **THEN** les dateEmission sont dans le passé (derniers 6 mois)
- **THEN** les dateEcheance varient (passées, proches < 30j, futures)
- **THEN** les montants sont cohérents avec les montants des marchés (5-15% du montant marché)
- **THEN** les références suivent un format réaliste (ex: "CAU-2026-001")

#### Scenario: Seed data associates cautions to users
- **WHEN** le script seed crée des cautions
- **THEN** chaque caution est associée à un utilisateur existant via `userId`
- **THEN** les utilisateurs sont variés (différents rôles)

## MODIFIED Requirements

### Requirement: System SHALL define Prisma schema for Marche model

Le système doit créer un schéma Prisma complet pour le modèle `Marche` avec tous les champs métier nécessaires, incluant la relation vers les cautions.

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

#### Scenario: Marche model has cautions relationship
- **WHEN** le modèle `Marche` est examiné
- **THEN** la relation `cautions` est définie comme `Caution[]` (relation un-à-plusieurs)
- **THEN** cette relation permet d'accéder aux cautions associées au marché
- **THEN** la relation est bidirectionnelle (Marche.cautions <-> Caution.marche)
