## ADDED Requirements

### Requirement: User SHALL be able to create a new caution

Le système doit permettre la création d'une nouvelle caution bancaire avec validation complète des données.

#### Scenario: Successful caution creation with all required fields
- **WHEN** l'utilisateur soumet un formulaire de création de caution avec tous les champs requis valides (reference, type, montant, dateEmission, dateEcheance, banqueNom, marcheId)
- **THEN** le système crée une nouvelle caution dans la base de données
- **THEN** le système génère un ID unique pour la caution
- **THEN** le statut de la caution est automatiquement défini sur ACTIVE
- **THEN** le système associe la caution au marché spécifié
- **THEN** le système enregistre l'utilisateur créateur (userId)
- **THEN** le système redirige vers la page de détail de la caution créée

#### Scenario: Validation error on missing required fields
- **WHEN** l'utilisateur tente de créer une caution sans remplir tous les champs requis
- **THEN** le système affiche des messages d'erreur spécifiques pour chaque champ manquant
- **THEN** le système ne crée pas la caution dans la base de données
- **THEN** le formulaire conserve les données déjà saisies

#### Scenario: Validation error on duplicate reference
- **WHEN** l'utilisateur tente de créer une caution avec une référence qui existe déjà
- **THEN** le système affiche un message d'erreur indiquant que la référence est déjà utilisée
- **THEN** le système ne crée pas la caution

#### Scenario: Date validation error
- **WHEN** l'utilisateur entre une dateEcheance antérieure à dateEmission
- **THEN** le système affiche un message d'erreur "La date d'échéance doit être postérieure à la date d'émission"
- **THEN** le système ne crée pas la caution

#### Scenario: Amount validation error
- **WHEN** l'utilisateur entre un montant négatif ou nul
- **THEN** le système affiche un message d'erreur "Le montant doit être supérieur à 0"
- **THEN** le système ne crée pas la caution

### Requirement: User SHALL be able to view a single caution

Le système doit permettre la consultation détaillée d'une caution existante avec toutes ses informations.

#### Scenario: Successful caution retrieval
- **WHEN** l'utilisateur accède à la page de détail d'une caution existante via son ID
- **THEN** le système affiche toutes les informations de la caution (référence, type, montant, dates, banque, statut)
- **THEN** le système affiche les informations du marché associé (numéro, objet)
- **THEN** le système affiche la durée de validité restante si la caution est active
- **THEN** le système affiche un badge coloré indiquant le statut de la caution

#### Scenario: Caution not found
- **WHEN** l'utilisateur tente d'accéder à une caution avec un ID inexistant
- **THEN** le système affiche un message d'erreur "Caution introuvable"
- **THEN** le système affiche un lien de retour vers la liste des cautions

### Requirement: User SHALL be able to list all cautions

Le système doit permettre la consultation de la liste complète des cautions avec pagination et tri.

#### Scenario: Successful caution list retrieval
- **WHEN** l'utilisateur accède à la page de liste des cautions
- **THEN** le système affiche toutes les cautions par ordre décroissant de date de création
- **THEN** chaque caution affiche : référence, type, montant, banque, statut, marché associé, date d'échéance
- **THEN** le système affiche un badge de statut coloré pour chaque caution
- **THEN** le système affiche un indicateur visuel pour les cautions proches de l'échéance (< 30 jours)

#### Scenario: Empty caution list
- **WHEN** aucune caution n'existe dans le système
- **THEN** le système affiche un message "Aucune caution enregistrée"
- **THEN** le système affiche un bouton "Créer une caution"

#### Scenario: Pagination for large datasets
- **WHEN** plus de 50 cautions existent dans le système
- **THEN** le système affiche les cautions par pages de 50 éléments
- **THEN** le système affiche des contrôles de pagination (précédent, suivant, numéros de page)

### Requirement: User SHALL be able to update an existing caution

Le système doit permettre la modification des informations d'une caution existante avec validation.

#### Scenario: Successful caution update
- **WHEN** l'utilisateur modifie les informations d'une caution (montant, dateEcheance, banqueContact, etc.)
- **THEN** le système valide les nouvelles données selon les mêmes règles que la création
- **THEN** le système met à jour la caution dans la base de données
- **THEN** le système met à jour le champ updatedAt
- **THEN** le système affiche un message de confirmation "Caution modifiée avec succès"
- **THEN** le système affiche les nouvelles informations à jour

#### Scenario: Validation error on update
- **WHEN** l'utilisateur tente de modifier une caution avec des données invalides
- **THEN** le système affiche les messages d'erreur appropriés
- **THEN** le système ne modifie pas la caution dans la base de données
- **THEN** le formulaire conserve les données précédentes

#### Scenario: Cannot update reference field
- **WHEN** l'utilisateur accède au formulaire de modification
- **THEN** le champ référence est en lecture seule (non modifiable)
- **THEN** le système affiche une indication que la référence ne peut pas être modifiée

### Requirement: User SHALL be able to delete a caution

Le système doit permettre la suppression d'une caution avec confirmation préalable.

#### Scenario: Successful caution deletion
- **WHEN** l'utilisateur clique sur le bouton de suppression d'une caution
- **THEN** le système affiche une boîte de dialogue de confirmation "Êtes-vous sûr de vouloir supprimer cette caution ?"
- **THEN** l'utilisateur confirme la suppression
- **THEN** le système supprime la caution de la base de données
- **THEN** le système affiche un message de confirmation "Caution supprimée avec succès"
- **THEN** le système redirige vers la liste des cautions

#### Scenario: Cancelled deletion
- **WHEN** l'utilisateur clique sur le bouton de suppression puis annule dans la boîte de dialogue
- **THEN** le système ne supprime pas la caution
- **THEN** le système ferme la boîte de dialogue
- **THEN** l'utilisateur reste sur la page courante

#### Scenario: Cascade deletion with marche
- **WHEN** un marché contenant des cautions est supprimé
- **THEN** le système supprime automatiquement toutes les cautions associées (onDelete: Cascade)
- **THEN** le système supprime également les alertes liées à ces cautions

### Requirement: User SHALL receive appropriate error messages

Le système doit fournir des messages d'erreur clairs et actionnables pour toutes les opérations CRUD.

#### Scenario: Database connection error
- **WHEN** une opération CRUD échoue à cause d'une erreur de connexion à la base de données
- **THEN** le système affiche un message "Une erreur technique est survenue. Veuillez réessayer."
- **THEN** le système log l'erreur complète dans la console serveur

#### Scenario: Validation error messages are specific
- **WHEN** des erreurs de validation surviennent
- **THEN** le système affiche un message spécifique pour chaque champ en erreur
- **THEN** chaque message indique clairement ce qui doit être corrigé
- **THEN** les messages sont affichés à proximité du champ concerné

#### Scenario: Permission error
- **WHEN** un utilisateur sans permissions appropriées tente une opération
- **THEN** le système affiche un message "Vous n'avez pas les permissions nécessaires pour cette action"
- **THEN** le système ne modifie pas les données
