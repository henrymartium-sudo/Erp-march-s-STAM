## ADDED Requirements

### Requirement: System SHALL provide a marches list page

Le système doit afficher une page listant tous les marchés avec leurs informations essentielles.

#### Scenario: List page displays all marches
- **WHEN** l'utilisateur accède à `/marches`
- **THEN** tous les marchés sont affichés
- **THEN** chaque marché affiche: numéro, objet, type, montant, statut
- **THEN** les marchés sont triés par date de création (plus récents en premier)

#### Scenario: List page shows empty state when no marches
- **WHEN** aucun marché n'existe dans la base de données
- **THEN** un message "Aucun marché trouvé" est affiché
- **THEN** un bouton "Créer un marché" est visible

#### Scenario: List page has create button
- **WHEN** la page liste est affichée
- **THEN** un bouton "Nouveau marché" est visible en haut de page
- **THEN** le bouton redirige vers `/marches/nouveau`

#### Scenario: List page is responsive
- **WHEN** la page est affichée sur desktop (1920x1080)
- **THEN** les marchés sont affichés en grille 3 colonnes
- **WHEN** la page est affichée sur tablette (768x1024)
- **THEN** les marchés sont affichés en grille 2 colonnes
- **WHEN** la page est affichée sur mobile (375x667)
- **THEN** les marchés sont affichés en liste 1 colonne

### Requirement: System SHALL provide marche card component

Le système doit fournir un composant Card pour afficher un marché dans la liste.

#### Scenario: Card displays essential information
- **WHEN** un marché est affiché dans la liste
- **THEN** le numéro du marché est visible en titre
- **THEN** l'objet du marché est affiché (tronqué si trop long)
- **THEN** le montant est formaté avec séparateur de milliers et "DH"
- **THEN** le type de marché est affiché
- **THEN** le statut est affiché avec un badge coloré

#### Scenario: Card has action buttons
- **WHEN** la card est affichée
- **THEN** un bouton "Voir détails" est visible
- **THEN** un bouton "Modifier" est visible
- **THEN** un bouton "Supprimer" est visible

#### Scenario: Card click navigates to detail page
- **WHEN** l'utilisateur clique sur la card (hors boutons)
- **THEN** l'utilisateur est redirigé vers `/marches/[id]`

### Requirement: System SHALL provide marche creation page

Le système doit fournir une page pour créer un nouveau marché.

#### Scenario: Creation page displays form
- **WHEN** l'utilisateur accède à `/marches/nouveau`
- **THEN** un formulaire vide est affiché
- **THEN** tous les champs requis sont marqués avec *
- **THEN** un bouton "Créer" est visible
- **THEN** un bouton "Annuler" est visible

#### Scenario: Form submits successfully
- **WHEN** l'utilisateur remplit tous les champs requis correctement
- **WHEN** l'utilisateur clique sur "Créer"
- **THEN** le marché est créé dans la base de données
- **THEN** l'utilisateur est redirigé vers `/marches`
- **THEN** un message de succès "Marché créé avec succès" est affiché

#### Scenario: Form shows validation errors
- **WHEN** l'utilisateur soumet le formulaire avec des champs invalides
- **THEN** les erreurs de validation sont affichées sous chaque champ
- **THEN** le formulaire n'est pas soumis
- **THEN** l'utilisateur reste sur la page de création

#### Scenario: Cancel button navigates back
- **WHEN** l'utilisateur clique sur "Annuler"
- **THEN** l'utilisateur est redirigé vers `/marches`
- **THEN** aucune donnée n'est sauvegardée

### Requirement: System SHALL provide marche form component

Le système doit fournir un composant formulaire réutilisable pour création et édition.

#### Scenario: Form has all required fields
- **WHEN** le formulaire est affiché
- **THEN** un champ "Numéro du marché" (input text) est présent
- **THEN** un champ "Objet" (textarea) est présent
- **THEN** un champ "Type" (select) est présent avec les 4 types
- **THEN** un champ "Montant (DH)" (input number) est présent
- **THEN** un champ "Date de notification" (date picker) est présent
- **THEN** un champ "Délai d'exécution (jours)" (input number) est présent
- **THEN** un champ "Nom du fournisseur" (input text) est présent

#### Scenario: Form has optional fields
- **WHEN** le formulaire est affiché
- **THEN** un champ "Date d'ordre de service" (date picker) est présent et optionnel
- **THEN** un champ "Contact fournisseur" (input text) est présent et optionnel
- **THEN** un champ "Email fournisseur" (input email) est présent et optionnel
- **THEN** un champ "Téléphone fournisseur" (input tel) est présent et optionnel

#### Scenario: Form validates in real-time
- **WHEN** l'utilisateur saisit des données
- **THEN** la validation s'exécute à la perte de focus (onBlur)
- **THEN** les erreurs s'affichent immédiatement sous le champ
- **THEN** les champs valides affichent une icône de validation

#### Scenario: Form shows loading state during submission
- **WHEN** le formulaire est en cours de soumission
- **THEN** le bouton submit affiche "Création en cours..." ou "Modification en cours..."
- **THEN** le bouton submit est désactivé
- **THEN** tous les champs sont désactivés
- **THEN** un spinner est visible

### Requirement: System SHALL provide marche detail page

Le système doit fournir une page affichant tous les détails d'un marché.

#### Scenario: Detail page displays all marche information
- **WHEN** l'utilisateur accède à `/marches/[id]`
- **THEN** toutes les informations du marché sont affichées
- **THEN** les dates sont formatées en français (ex: "15 janvier 2024")
- **THEN** le montant est formaté avec séparateur de milliers
- **THEN** le statut est affiché avec un badge coloré

#### Scenario: Detail page has action buttons
- **WHEN** la page détail est affichée
- **THEN** un bouton "Modifier" est visible en haut de page
- **THEN** un bouton "Supprimer" est visible
- **THEN** un bouton "Retour à la liste" est visible

#### Scenario: Detail page handles non-existent marche
- **WHEN** l'utilisateur accède à `/marches/[id]` avec un ID inexistant
- **THEN** un message "Marché introuvable" est affiché
- **THEN** un bouton "Retour à la liste" est visible

#### Scenario: Modify button navigates to edit page
- **WHEN** l'utilisateur clique sur "Modifier"
- **THEN** l'utilisateur est redirigé vers `/marches/[id]/edit`

### Requirement: System SHALL provide marche edit page

Le système doit fournir une page pour modifier un marché existant.

#### Scenario: Edit page displays pre-filled form
- **WHEN** l'utilisateur accède à `/marches/[id]/edit`
- **THEN** le formulaire est affiché avec les données actuelles du marché
- **THEN** tous les champs sont pré-remplis
- **THEN** un bouton "Enregistrer" est visible
- **THEN** un bouton "Annuler" est visible

#### Scenario: Edit form submits successfully
- **WHEN** l'utilisateur modifie des champs et clique sur "Enregistrer"
- **THEN** le marché est mis à jour dans la base de données
- **THEN** l'utilisateur est redirigé vers `/marches/[id]`
- **THEN** un message de succès "Marché modifié avec succès" est affiché

#### Scenario: Edit form validates changes
- **WHEN** l'utilisateur soumet le formulaire avec des données invalides
- **THEN** les erreurs de validation sont affichées
- **THEN** le formulaire n'est pas soumis
- **THEN** l'utilisateur reste sur la page d'édition

### Requirement: System SHALL provide delete confirmation dialog

Le système doit demander confirmation avant de supprimer un marché.

#### Scenario: Delete button triggers confirmation dialog
- **WHEN** l'utilisateur clique sur "Supprimer" (liste ou détail)
- **THEN** une modale de confirmation s'affiche
- **THEN** le message "Êtes-vous sûr de vouloir supprimer ce marché ?" est affiché
- **THEN** le numéro et l'objet du marché sont affichés dans la modale
- **THEN** un bouton "Confirmer" est visible
- **THEN** un bouton "Annuler" est visible

#### Scenario: Confirmed deletion removes marche
- **WHEN** l'utilisateur confirme la suppression
- **THEN** le marché est supprimé de la base de données
- **THEN** la modale se ferme
- **THEN** l'utilisateur est redirigé vers `/marches` (si depuis la page détail)
- **THEN** un message de succès "Marché supprimé avec succès" est affiché

#### Scenario: Cancelled deletion keeps marche
- **WHEN** l'utilisateur annule la suppression
- **THEN** la modale se ferme
- **THEN** le marché n'est pas supprimé
- **THEN** l'utilisateur reste sur la même page

### Requirement: System SHALL provide basic filters for marches list

Le système doit permettre de filtrer la liste des marchés par statut et type.

#### Scenario: Filter by status works
- **WHEN** l'utilisateur sélectionne un statut dans le filtre
- **THEN** seuls les marchés avec ce statut sont affichés
- **THEN** le nombre de résultats est affiché

#### Scenario: Filter by type works
- **WHEN** l'utilisateur sélectionne un type dans le filtre
- **THEN** seuls les marchés de ce type sont affichés
- **THEN** le nombre de résultats est affiché

#### Scenario: Multiple filters combine
- **WHEN** l'utilisateur applique plusieurs filtres (statut ET type)
- **THEN** seuls les marchés correspondant à TOUS les filtres sont affichés

#### Scenario: Clear filters button resets
- **WHEN** l'utilisateur clique sur "Réinitialiser les filtres"
- **THEN** tous les filtres sont effacés
- **THEN** tous les marchés sont à nouveau affichés

### Requirement: System SHALL use shadcn/ui components consistently

Tous les composants d'interface doivent utiliser les composants shadcn/ui.

#### Scenario: Forms use shadcn Form components
- **WHEN** un formulaire est affiché
- **THEN** les champs utilisent `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`
- **THEN** les inputs utilisent le composant `<Input>` de shadcn/ui
- **THEN** les selects utilisent le composant `<Select>` de shadcn/ui

#### Scenario: Buttons use shadcn Button component
- **WHEN** un bouton est affiché
- **THEN** le composant `<Button>` de shadcn/ui est utilisé
- **THEN** les variants appropriés sont utilisés (default, destructive, outline, ghost)

#### Scenario: Cards use shadcn Card component
- **WHEN** une card est affichée
- **THEN** les composants `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>` sont utilisés

#### Scenario: Dialogs use shadcn Dialog component
- **WHEN** une modale est affichée
- **THEN** les composants `<Dialog>`, `<DialogContent>`, `<DialogHeader>`, `<DialogTitle>` sont utilisés

### Requirement: System SHALL be fully responsive on all screen sizes

L'interface doit être fonctionnelle et esthétique sur desktop, tablette et mobile.

#### Scenario: Desktop layout is optimized
- **WHEN** l'application est affichée sur desktop (1920x1080)
- **THEN** la navigation est visible en sidebar
- **THEN** les formulaires utilisent au maximum 800px de largeur
- **THEN** les listes affichent 3 colonnes de cards

#### Scenario: Tablet layout adapts
- **WHEN** l'application est affichée sur tablette (768x1024)
- **THEN** la navigation peut se replier en menu hamburger
- **THEN** les listes affichent 2 colonnes de cards
- **THEN** les formulaires s'adaptent à la largeur disponible

#### Scenario: Mobile layout is usable
- **WHEN** l'application est affichée sur mobile (375x667)
- **THEN** la navigation est dans un menu hamburger
- **THEN** les listes affichent 1 colonne
- **THEN** les formulaires sont empilés verticalement
- **THEN** tous les boutons sont facilement cliquables (touch-friendly)
