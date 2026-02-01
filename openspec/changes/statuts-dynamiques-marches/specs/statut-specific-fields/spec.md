## ADDED Requirements

### Requirement: System SHALL provide status-specific fields for OPPORTUNITE_IDENTIFIEE

Le système doit capturer la date d'identification pour les opportunités de marchés.

#### Scenario: OPPORTUNITE_IDENTIFIEE requires dateIdentification
- **WHEN** le statut d'un marché est `OPPORTUNITE_IDENTIFIEE`
- **THEN** le champ `dateIdentification` (DateTime) est disponible
- **THEN** le champ est optionnel dans le modèle Prisma
- **THEN** le champ est affiché dans le formulaire
- **THEN** le champ est validé comme date si fourni

### Requirement: System SHALL provide status-specific fields for DOSSIER_EN_PREPARATION

Le système doit capturer la date de dépôt prévue pour les dossiers en préparation.

#### Scenario: DOSSIER_EN_PREPARATION requires dateDepotPrevue
- **WHEN** le statut d'un marché est `DOSSIER_EN_PREPARATION`
- **THEN** le champ `dateDepotPrevue` (DateTime) est disponible
- **THEN** le champ est optionnel dans le modèle Prisma
- **THEN** le champ est affiché dans le formulaire
- **THEN** le champ est validé comme date si fourni

### Requirement: System SHALL provide status-specific fields for OFFRE_DEPOSEE

Le système doit capturer la date de dépôt effective et le délai de validité de l'offre.

#### Scenario: OFFRE_DEPOSEE requires dateDepotOffre and delaiValiditeOffre
- **WHEN** le statut d'un marché est `OFFRE_DEPOSEE`
- **THEN** le champ `dateDepotOffre` (DateTime) est disponible
- **THEN** le champ `delaiValiditeOffre` (Int, en jours) est disponible
- **THEN** les deux champs sont optionnels dans le modèle Prisma
- **THEN** les deux champs sont affichés dans le formulaire
- **THEN** `dateDepotOffre` est validé comme date si fourni
- **THEN** `delaiValiditeOffre` est validé comme entier positif si fourni

### Requirement: System SHALL provide status-specific fields for ATTRIBUE_PROVISOIREMENT

Le système doit capturer la date d'attribution provisoire.

#### Scenario: ATTRIBUE_PROVISOIREMENT requires dateAttributionProvisoire
- **WHEN** le statut d'un marché est `ATTRIBUE_PROVISOIREMENT`
- **THEN** le champ `dateAttributionProvisoire` (DateTime) est disponible
- **THEN** le champ est optionnel dans le modèle Prisma
- **THEN** le champ est affiché dans le formulaire
- **THEN** le champ est validé comme date si fourni

### Requirement: System SHALL provide status-specific fields for ATTRIBUE_DEFINITIVEMENT

Le système doit capturer la date d'attribution définitive.

#### Scenario: ATTRIBUE_DEFINITIVEMENT requires dateAttributionDefinitive
- **WHEN** le statut d'un marché est `ATTRIBUE_DEFINITIVEMENT`
- **THEN** le champ `dateAttributionDefinitive` (DateTime) est disponible
- **THEN** le champ est optionnel dans le modèle Prisma
- **THEN** le champ est affiché dans le formulaire
- **THEN** le champ est validé comme date si fourni

#### Scenario: Attribution dates must be coherent
- **WHEN** un marché a à la fois `dateAttributionProvisoire` et `dateAttributionDefinitive`
- **THEN** la validation vérifie que `dateAttributionDefinitive >= dateAttributionProvisoire`
- **THEN** un message d'erreur est affiché si l'ordre est incorrect

### Requirement: System SHALL provide status-specific fields for EN_ATTENTE_LIVRAISON_OS

Le système doit capturer la date et la durée prévue de livraison.

#### Scenario: EN_ATTENTE_LIVRAISON_OS requires dateLivraisonPrevue and dureeLivraisonPrevue
- **WHEN** le statut d'un marché est `EN_ATTENTE_LIVRAISON_OS`
- **THEN** le champ `dateLivraisonPrevue` (DateTime) est disponible
- **THEN** le champ `dureeLivraisonPrevue` (Int, en jours) est disponible
- **THEN** les deux champs sont optionnels dans le modèle Prisma
- **THEN** les deux champs sont affichés dans le formulaire
- **THEN** `dateLivraisonPrevue` est validé comme date si fourni
- **THEN** `dureeLivraisonPrevue` est validé comme entier positif si fourni

### Requirement: System SHALL provide status-specific fields for EN_EXECUTION

Le système doit capturer la date prévue pour la réception provisoire.

#### Scenario: EN_EXECUTION requires dateReceptionProvisoirePrevue
- **WHEN** le statut d'un marché est `EN_EXECUTION`
- **THEN** le champ `dateReceptionProvisoirePrevue` (DateTime) est disponible
- **THEN** le champ est optionnel dans le modèle Prisma
- **THEN** le champ est affiché dans le formulaire
- **THEN** le champ est validé comme date si fourni

### Requirement: System SHALL provide status-specific fields for EXECUTE_ATTENTE_GARANTIES

Le système doit capturer l'état de libération des garanties.

#### Scenario: EXECUTE_ATTENTE_GARANTIES requires garantiesLiberees
- **WHEN** le statut d'un marché est `EXECUTE_ATTENTE_GARANTIES`
- **THEN** le champ `garantiesLiberees` (Boolean) est disponible
- **THEN** le champ est optionnel dans le modèle Prisma avec valeur par défaut `false`
- **THEN** le champ est affiché comme checkbox dans le formulaire
- **THEN** le label indique "Garanties libérées"

### Requirement: System SHALL provide status-specific fields for CLOTURE

Le système doit capturer la date de clôture administrative.

#### Scenario: CLOTURE requires dateClotureAdministrative
- **WHEN** le statut d'un marché est `CLOTURE`
- **THEN** le champ `dateClotureAdministrative` (DateTime) est disponible
- **THEN** le champ est optionnel dans le modèle Prisma
- **THEN** le champ est affiché dans le formulaire
- **THEN** le champ est validé comme date si fourni

### Requirement: System SHALL conditionally display status-specific fields in forms

Le formulaire doit afficher uniquement les champs pertinents pour le statut sélectionné.

#### Scenario: Form shows only relevant fields for selected status
- **WHEN** l'utilisateur sélectionne un statut dans le formulaire
- **THEN** seuls les champs communs et les champs spécifiques à ce statut sont affichés
- **THEN** les champs non pertinents sont masqués (pas désactivés)
- **THEN** les valeurs des champs masqués sont conservées en mémoire

#### Scenario: Form preserves values when changing status
- **WHEN** l'utilisateur a saisi des données dans des champs spécifiques
- **WHEN** l'utilisateur change le statut du marché
- **THEN** les valeurs saisies sont conservées même si les champs sont masqués
- **THEN** les valeurs redeviennent visibles si l'utilisateur revient au statut original

#### Scenario: Form shows smooth transitions when toggling fields
- **WHEN** des champs apparaissent ou disparaissent suite à un changement de statut
- **THEN** une animation douce est appliquée (fade in/out)
- **THEN** la hauteur du formulaire s'ajuste progressivement
- **THEN** le focus reste sur un élément visible

### Requirement: System SHALL display status-specific fields in detail view

La page de détail doit afficher les champs spécifiques au statut du marché.

#### Scenario: Detail view shows relevant status fields
- **WHEN** l'utilisateur consulte les détails d'un marché
- **THEN** tous les champs spécifiques au statut actuel sont affichés s'ils ont une valeur
- **THEN** les champs vides ne sont pas affichés
- **THEN** les champs sont regroupés dans une section "Informations spécifiques au statut"

#### Scenario: Detail view formats status-specific dates
- **WHEN** un champ de date spécifique au statut a une valeur
- **THEN** la date est formatée en français (ex: "15 janvier 2024")
- **THEN** le label du champ est explicite (ex: "Date d'identification", "Date de dépôt prévue")

### Requirement: System SHALL validate status-specific fields conditionally

La validation Zod doit appliquer des règles spécifiques selon le statut.

#### Scenario: Optional fields are not validated when status does not match
- **WHEN** un marché a un statut qui ne nécessite pas un champ spécifique
- **THEN** ce champ n'est pas validé même s'il contient une valeur invalide
- **THEN** aucune erreur de validation n'est levée pour ce champ

#### Scenario: Required business logic is enforced for specific statuses
- **WHEN** le statut nécessite un champ avec logique métier (ex: date cohérence)
- **THEN** la validation Zod utilise `.refine()` ou `.superRefine()`
- **THEN** les messages d'erreur sont contextuels au statut
- **THEN** la validation se produit côté client ET côté serveur

### Requirement: System SHALL support bulk operations on status-specific fields

Les opérations CRUD doivent gérer correctement les champs spécifiques.

#### Scenario: Creating a marche with status-specific fields
- **WHEN** un marché est créé avec des champs spécifiques à son statut
- **THEN** tous les champs fournis sont sauvegardés correctement
- **THEN** les champs non fournis sont stockés comme `null`

#### Scenario: Updating a marche preserves unrelated status fields
- **WHEN** un marché est mis à jour avec un changement de statut
- **THEN** les champs spécifiques à l'ancien statut sont conservés en base
- **THEN** les champs spécifiques au nouveau statut peuvent être ajoutés
- **THEN** aucune perte de données historique

#### Scenario: Filtering marches by status-specific fields
- **WHEN** l'utilisateur filtre les marchés par un champ spécifique (ex: dateDepotOffre)
- **THEN** seuls les marchés ayant ce champ rempli sont retournés
- **THEN** le filtre utilise un index SQL si disponible
