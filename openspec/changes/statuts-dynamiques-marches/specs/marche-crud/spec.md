## ADDED Requirements

### Requirement: System SHALL validate status-specific fields conditionally with Zod

Le système doit valider les champs spécifiques uniquement quand le statut correspond.

#### Scenario: Zod schema validates OPPORTUNITE_IDENTIFIEE fields
- **WHEN** le schéma de validation est utilisé avec statut `OPPORTUNITE_IDENTIFIEE`
- **THEN** le champ `dateIdentification` est accepté s'il est fourni
- **THEN** le champ est validé comme date valide si présent

#### Scenario: Zod schema validates OFFRE_DEPOSEE fields
- **WHEN** le schéma de validation est utilisé avec statut `OFFRE_DEPOSEE`
- **THEN** le champ `dateDepotOffre` est accepté s'il est fourni
- **THEN** le champ `delaiValiditeOffre` est validé comme entier positif si présent

#### Scenario: Zod schema validates termination fields
- **WHEN** le schéma de validation est utilisé avec statut `RESILIE`
- **THEN** le champ `dateResiliation` est accepté s'il est fourni
- **THEN** le champ `motifsResiliation` est validé avec minimum 10 caractères si présent
- **WHEN** le schéma de validation est utilisé avec statut `ANNULE`
- **THEN** les champs `dateAnnulation` et `motifsAnnulation` sont validés similairement
- **WHEN** le schéma de validation est utilisé avec statut `INFRUCTUEUX`
- **THEN** les champs `dateInfructueux`, `motifsInfructueux`, `concurrentGagnant`, `montantOffreConcurrent` sont validés

#### Scenario: Zod schema uses superRefine for conditional validation
- **WHEN** le fichier `lib/validations/marche.ts` est examiné
- **THEN** le schéma utilise `.superRefine()` pour les validations conditionnelles
- **THEN** chaque validation de statut vérifie d'abord `if (data.statut === 'XXX')`
- **THEN** les messages d'erreur sont spécifiques au statut

#### Scenario: Zod schema validates date coherence
- **WHEN** un marché a `dateAttributionProvisoire` et `dateAttributionDefinitive`
- **THEN** la validation vérifie que `dateAttributionDefinitive >= dateAttributionProvisoire`
- **THEN** un message d'erreur explicite est retourné si l'ordre est incorrect

### Requirement: System SHALL accept autoriteContractante fields in Server Actions

Les Server Actions doivent accepter et traiter les nouveaux champs `autoriteContractante*`.

#### Scenario: createMarche accepts autoriteContractante fields
- **WHEN** la fonction `createMarche` est appelée
- **THEN** le champ `autoriteContractanteNom` est requis
- **THEN** les champs `autoriteContractanteContact`, `autoriteContractanteEmail`, `autoriteContractanteTel` sont optionnels
- **THEN** aucun champ `fournisseur*` n'est accepté

#### Scenario: updateMarche accepts autoriteContractante fields
- **WHEN** la fonction `updateMarche` est appelée
- **THEN** les champs `autoriteContractante*` peuvent être mis à jour
- **THEN** aucun champ `fournisseur*` n'est accepté

### Requirement: System SHALL persist status-specific fields in Server Actions

Les Server Actions doivent sauvegarder correctement tous les champs spécifiques.

#### Scenario: createMarche saves all provided status-specific fields
- **WHEN** un marché est créé avec des champs spécifiques au statut
- **THEN** tous les champs fournis sont sauvegardés dans la base de données
- **THEN** les champs non fournis sont stockés comme `null`
- **THEN** aucune erreur n'est levée pour les champs spécifiques d'autres statuts

#### Scenario: updateMarche preserves unrelated status fields
- **WHEN** un marché est mis à jour avec changement de statut
- **THEN** les champs spécifiques à l'ancien statut sont conservés en base
- **THEN** les nouveaux champs spécifiques peuvent être ajoutés
- **THEN** aucune perte de données historiques

## MODIFIED Requirements

### Requirement: System SHALL provide Zod validation schema for Marche

Le système doit définir un schéma de validation Zod pour toutes les opérations sur les marchés, incluant les champs conditionnels et l'autorité contractante.

#### Scenario: Zod schema validates all required fields
- **WHEN** le fichier `lib/validations/marche.ts` est examiné
- **THEN** le schéma `marcheSchema` existe
- **THEN** le champ `numero` est requis (string, min 1 caractère)
- **THEN** le champ `objet` est requis (string, min 10 caractères)
- **THEN** le champ `type` est validé comme enum TypeMarche
- **THEN** le champ `montant` est validé comme number positif
- **THEN** le champ `dateNotification` est validé comme date
- **THEN** le champ `delaiExecution` est validé comme entier positif
- **THEN** le champ `autoriteContractanteNom` est requis (string)

#### Scenario: Zod schema validates optional fields
- **WHEN** le schéma de validation est examiné
- **THEN** le champ `dateOrdreService` est optionnel (date)
- **THEN** le champ `dateReception` est optionnel (date)
- **THEN** les champs autorité contractante contact/email/tel sont optionnels
- **THEN** tous les champs spécifiques aux statuts sont optionnels

#### Scenario: Zod schema provides type inference
- **WHEN** le fichier de validation est examiné
- **THEN** le type `MarcheInput` est inféré depuis le schéma Zod
- **THEN** le type inclut tous les champs `autoriteContractante*`
- **THEN** le type inclut tous les champs spécifiques aux statuts
- **THEN** le type est exporté pour utilisation dans les composants

### Requirement: System SHALL implement getAllMarches Server Action

Le système doit fournir une Server Action pour récupérer la liste de tous les marchés, incluant les nouveaux statuts.

#### Scenario: Server Action retrieves all marches
- **WHEN** la fonction `getAllMarches` est appelée sans filtres
- **THEN** tous les marchés sont retournés
- **THEN** les marchés sont triés par date de création (plus récents en premier)
- **THEN** les marchés avec statuts RESILIE, ANNULE, INFRUCTUEUX sont inclus

#### Scenario: Server Action supports filtering by status
- **WHEN** la fonction est appelée avec un filtre de statut
- **THEN** seuls les marchés avec ce statut sont retournés
- **THEN** les statuts RESILIE, ANNULE, INFRUCTUEUX sont filtrables individuellement

#### Scenario: Server Action supports filtering by type
- **WHEN** la fonction est appelée avec un filtre de type
- **THEN** seuls les marchés de ce type sont retournés

#### Scenario: Server Action supports combined filters
- **WHEN** la fonction est appelée avec plusieurs filtres (statut ET type)
- **THEN** seuls les marchés correspondant à TOUS les filtres sont retournés

## REMOVED Requirements

### Requirement: Zod schema validates supplier information fields

**Reason**: Les champs `fournisseur*` sont remplacés par `autoriteContractante*` pour refléter la réalité métier du soumissionnaire.

**Migration**:
- Mettre à jour le schéma Zod pour accepter `autoriteContractante*` au lieu de `fournisseur*`
- Les Server Actions doivent rejeter les anciens champs `fournisseur*` si fournis
- Les formulaires doivent utiliser les nouveaux champs uniquement
