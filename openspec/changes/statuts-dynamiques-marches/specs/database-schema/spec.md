## ADDED Requirements

### Requirement: System SHALL add status-specific fields to Marche model

Le système doit ajouter tous les champs spécifiques à chaque statut dans le modèle Prisma.

#### Scenario: Marche model has OPPORTUNITE_IDENTIFIEE fields
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `dateIdentification` (DateTime, optionnel) est présent

#### Scenario: Marche model has DOSSIER_EN_PREPARATION fields
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `dateDepotPrevue` (DateTime, optionnel) est présent

#### Scenario: Marche model has OFFRE_DEPOSEE fields
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `dateDepotOffre` (DateTime, optionnel) est présent
- **THEN** le champ `delaiValiditeOffre` (Int, optionnel) est présent

#### Scenario: Marche model has ATTRIBUE_PROVISOIREMENT fields
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `dateAttributionProvisoire` (DateTime, optionnel) est présent

#### Scenario: Marche model has ATTRIBUE_DEFINITIVEMENT fields
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `dateAttributionDefinitive` (DateTime, optionnel) est présent

#### Scenario: Marche model has EN_ATTENTE_LIVRAISON_OS fields
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `dateLivraisonPrevue` (DateTime, optionnel) est présent
- **THEN** le champ `dureeLivraisonPrevue` (Int, optionnel) est présent

#### Scenario: Marche model has EN_EXECUTION fields
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `dateReceptionProvisoirePrevue` (DateTime, optionnel) est présent

#### Scenario: Marche model has EXECUTE_ATTENTE_GARANTIES fields
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `garantiesLiberees` (Boolean, optionnel, @default(false)) est présent

#### Scenario: Marche model has CLOTURE fields
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `dateClotureAdministrative` (DateTime, optionnel) est présent

#### Scenario: Marche model has RESILIE fields
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `dateResiliation` (DateTime, optionnel) est présent
- **THEN** le champ `motifsResiliation` (String, optionnel) est présent

#### Scenario: Marche model has ANNULE fields
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `dateAnnulation` (DateTime, optionnel) est présent
- **THEN** le champ `motifsAnnulation` (String, optionnel) est présent

#### Scenario: Marche model has INFRUCTUEUX fields
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `dateInfructueux` (DateTime, optionnel) est présent
- **THEN** le champ `motifsInfructueux` (String, optionnel) est présent
- **THEN** le champ `concurrentGagnant` (String, optionnel) est présent
- **THEN** le champ `montantOffreConcurrent` (Decimal, @db.Decimal(15, 2), optionnel) est présent

## MODIFIED Requirements

### Requirement: System SHALL define StatutMarche enum with 11 lifecycle stages

Le système doit définir un enum `StatutMarche` avec les 13 statuts du cycle de vie (split de RESILIE_ANNULE_INFRUCTUEUX en 3).

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
- **THEN** l'enum contient `RESILIE`
- **THEN** l'enum contient `ANNULE`
- **THEN** l'enum contient `INFRUCTUEUX`
- **THEN** l'enum NE contient PAS `RESILIE_ANNULE_INFRUCTUEUX`

#### Scenario: Default status is set
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `statut` a une valeur par défaut définie
- **THEN** la valeur par défaut est un statut initial approprié (OPPORTUNITE_IDENTIFIEE ou DOSSIER_EN_PREPARATION)

### Requirement: System SHALL define Prisma schema for Marche model

Le système doit créer un schéma Prisma complet pour le modèle `Marche` avec tous les champs métier nécessaires, y compris l'autorité contractante.

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

#### Scenario: Marche model has autorite contractante information fields
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `autoriteContractanteNom` (String) est présent
- **THEN** le champ `autoriteContractanteContact` (String, optionnel) est présent
- **THEN** le champ `autoriteContractanteEmail` (String, optionnel) est présent
- **THEN** le champ `autoriteContractanteTel` (String, optionnel) est présent
- **THEN** les champs `fournisseur*` N'EXISTENT PLUS

#### Scenario: Marche model has timestamps
- **WHEN** le modèle `Marche` est examiné
- **THEN** le champ `createdAt` (DateTime, @default(now())) est présent
- **THEN** le champ `updatedAt` (DateTime, @updatedAt) est présent

### Requirement: System SHALL create seed script with test data

Le système doit fournir un script de seed avec des données de test couvrant tous les statuts, y compris les nouveaux.

#### Scenario: Seed script exists
- **WHEN** le fichier `prisma/seed.ts` est examiné
- **THEN** le fichier existe et est exécutable
- **THEN** le script est référencé dans `package.json` sous `prisma.seed`

#### Scenario: Seed data covers all statuses
- **WHEN** le script seed est exécuté
- **THEN** au moins 13 marchés sont créés (un par statut minimum)
- **THEN** tous les 13 statuts sont représentés dans les données
- **THEN** les statuts RESILIE, ANNULE, et INFRUCTUEUX ont leurs champs spécifiques remplis
- **THEN** les marchés ont des dates variées (passées, présentes, futures)
- **THEN** différents types de marchés sont inclus
- **THEN** les données utilisent les champs `autoriteContractante*` (pas `fournisseur*`)

## REMOVED Requirements

### Requirement: Marche model has supplier information fields

**Reason**: Terminologie incorrecte pour un soumissionnaire. Les champs "fournisseur" sont remplacés par "autoriteContractante" car dans le contexte d'un soumissionnaire, c'est l'acheteur public (le donneur d'ordre) qui est référencé, pas le fournisseur.

**Migration**: Renommer les colonnes en base de données :
- `fournisseur_nom` → `autorite_contractante_nom`
- `fournisseur_contact` → `autorite_contractante_contact`
- `fournisseur_email` → `autorite_contractante_email`
- `fournisseur_tel` → `autorite_contractante_tel`

Migration Prisma à créer pour effectuer le renommage sans perte de données.
