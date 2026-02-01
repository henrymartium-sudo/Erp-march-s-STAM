## Why

Le système actuel utilise un formulaire unique pour tous les statuts de marché, alors que chaque statut a des exigences métier spécifiques et des informations à collecter différentes. Cette approche générique ne reflète pas la réalité du cycle de vie des marchés publics et empêche la collecte structurée d'informations critiques à chaque étape. De plus, la terminologie "Fournisseur" est incorrecte pour un soumissionnaire : c'est l'autorité contractante qui émet les marchés.

## What Changes

- **Champs dynamiques par statut** : Chaque statut aura ses propres champs obligatoires et optionnels selon les besoins métier
- **OPPORTUNITE_IDENTIFIEE** : Ajout du champ `dateIdentification`
- **DOSSIER_EN_PREPARATION** : Ajout du champ `dateDepotPrevue`
- **OFFRE_DEPOSEE** : Ajout des champs `dateDepotOffre` et `delaiValiditeOffre`
- **ATTRIBUE_PROVISOIREMENT** : Ajout du champ `dateAttributionProvisoire`
- **ATTRIBUE_DEFINITIVEMENT** : Ajout du champ `dateAttributionDefinitive`
- **EN_ATTENTE_LIVRAISON_OS** : Ajout des champs `dateLivraisonPrevue` et `dureeLivraisonPrevue`
- **EN_EXECUTION** : Ajout du champ `dateReceptionProvisoirePrevue`
- **EXECUTE_ATTENTE_GARANTIES** : Ajout de la gestion de libération des garanties
- **CLOTURE** : Ajout du champ `dateClotureAdministrative`
- **RESILIE_ANNULE_INFRUCTUEUX** : Division en 3 sous-statuts distincts avec champs spécifiques :
  - **RESILIE** : `dateResiliation`, `motifsResiliation`
  - **ANNULE** : `dateAnnulation`, `motifsAnnulation`
  - **INFRUCTUEUX** : `dateInfructueux`, `motifsInfructueux`, `concurrentGagnant`, `montantOffreConcurrent`
- **BREAKING** : Renommage de tous les champs `fournisseur*` en `autoriteContractante*` (car dans le contexte soumissionnaire, c'est l'acheteur public, pas le fournisseur)
- **BREAKING** : Division de l'enum `RESILIE_ANNULE_INFRUCTUEUX` en trois statuts distincts

## Capabilities

### New Capabilities
- `statut-specific-fields`: Gestion des champs dynamiques spécifiques à chaque statut de marché avec validation conditionnelle
- `marche-termination-handling`: Gestion des différents types de terminaison de marché (résilié, annulé, infructueux) avec leurs données spécifiques

### Modified Capabilities
- `database-schema`: Modification du schéma Prisma pour ajouter les nouveaux champs spécifiques à chaque statut et renommer les champs fournisseur en autorité contractante
- `marche-crud`: Mise à jour de la validation Zod pour supporter les champs conditionnels selon le statut
- `marche-ui`: Modification du formulaire pour afficher dynamiquement les champs selon le statut sélectionné

## Impact

**Code affecté** :
- `prisma/schema.prisma` : Ajout de ~15 nouveaux champs optionnels, renommage des champs fournisseur, modification de l'enum StatutMarche
- `lib/validations/marche.ts` : Validation conditionnelle selon le statut (Zod refinements)
- `lib/actions/marches.ts` : Gestion des nouveaux champs dans les Server Actions
- `components/marches/marche-form.tsx` : Logique d'affichage conditionnel des champs selon le statut
- `components/marches/marche-detail.tsx` : Affichage conditionnel des informations selon le statut
- Migration de base de données nécessaire

**Données existantes** :
- Migration de données requise pour renommer les colonnes `fournisseur*` → `autoriteContractante*`
- Les marchés existants avec statut `RESILIE_ANNULE_INFRUCTUEUX` devront être migrés vers l'un des trois nouveaux statuts
