## ADDED Requirements

### Requirement: System SHALL display status-specific fields in marche form

Le formulaire doit afficher dynamiquement les champs pertinents selon le statut sélectionné.

#### Scenario: Form shows OPPORTUNITE_IDENTIFIEE fields
- **WHEN** le statut `OPPORTUNITE_IDENTIFIEE` est sélectionné
- **THEN** le champ "Date d'identification" est affiché
- **THEN** le champ utilise un date picker

#### Scenario: Form shows OFFRE_DEPOSEE fields
- **WHEN** le statut `OFFRE_DEPOSEE` est sélectionné
- **THEN** le champ "Date de dépôt de l'offre" est affiché
- **THEN** le champ "Délai de validité de l'offre (jours)" est affiché
- **THEN** les deux champs sont regroupés visuellement

#### Scenario: Form shows termination fields for RESILIE
- **WHEN** le statut `RESILIE` est sélectionné
- **THEN** le champ "Date de résiliation" (date picker) est affiché
- **THEN** le champ "Motifs de la résiliation" (textarea) est affiché
- **THEN** une indication visuelle signale qu'il s'agit d'une terminaison

#### Scenario: Form shows termination fields for ANNULE
- **WHEN** le statut `ANNULE` est sélectionné
- **THEN** le champ "Date d'annulation" (date picker) est affiché
- **THEN** le champ "Motifs de l'annulation" (textarea) est affiché

#### Scenario: Form shows competitive context for INFRUCTUEUX
- **WHEN** le statut `INFRUCTUEUX` est sélectionné
- **THEN** le champ "Date de l'appel d'offres infructueux" est affiché
- **THEN** le champ "Motifs (pourquoi l'offre n'a pas été retenue)" (textarea) est affiché
- **THEN** le champ "Concurrent gagnant" est affiché
- **THEN** le champ "Montant de l'offre du concurrent (DH)" est affiché
- **THEN** les 4 champs sont visuellement groupés

#### Scenario: Form transitions smoothly between status fields
- **WHEN** l'utilisateur change le statut dans le formulaire
- **THEN** les champs spécifiques disparaissent avec une animation fade-out
- **THEN** les nouveaux champs apparaissent avec une animation fade-in
- **THEN** la transition dure maximum 300ms
- **THEN** le layout s'ajuste sans saut visuel brusque

#### Scenario: Form preserves status field values when toggling
- **WHEN** l'utilisateur saisit des valeurs dans des champs spécifiques
- **WHEN** l'utilisateur change de statut puis revient au statut original
- **THEN** les valeurs précédemment saisies sont toujours présentes
- **THEN** aucune donnée n'est perdue pendant la navigation

### Requirement: System SHALL display status-specific fields in detail view

La page de détail doit afficher les informations spécifiques au statut du marché.

#### Scenario: Detail view groups status-specific information
- **WHEN** l'utilisateur consulte les détails d'un marché
- **THEN** une section "Informations spécifiques au statut" existe
- **THEN** seuls les champs ayant une valeur sont affichés
- **THEN** les champs vides ne créent pas d'espace visuel

#### Scenario: Detail view shows termination information prominently
- **WHEN** un marché a le statut RESILIE, ANNULE, ou INFRUCTUEUX
- **THEN** les informations de terminaison sont affichées dans une card distincte
- **THEN** la card utilise une couleur de fond appropriée (rouge pâle pour RESILIE, gris pour ANNULE, orange pâle pour INFRUCTUEUX)
- **THEN** les motifs sont affichés en texte complet (pas tronqués)

#### Scenario: Detail view shows competitive context for INFRUCTUEUX
- **WHEN** un marché infructueux est affiché
- **THEN** le nom du concurrent gagnant est visible
- **THEN** le montant de son offre est formaté avec séparateur de milliers + "DH"
- **THEN** une comparaison visuelle avec notre montant peut être affichée

### Requirement: System SHALL update status badge colors for new statuses

Les badges de statut doivent refléter visuellement les trois types de terminaison.

#### Scenario: RESILIE badge uses destructive styling
- **WHEN** un badge est affiché pour le statut `RESILIE`
- **THEN** le badge utilise la variante "destructive" (rouge)
- **THEN** le label affiché est "Résilié"

#### Scenario: ANNULE badge uses neutral styling
- **WHEN** un badge est affiché pour le statut `ANNULE`
- **THEN** le badge utilise la variante "secondary" (gris)
- **THEN** le label affiché est "Annulé"

#### Scenario: INFRUCTUEUX badge uses warning styling
- **WHEN** un badge est affiché pour le statut `INFRUCTUEUX`
- **THEN** le badge utilise une couleur orange (warning)
- **THEN** le label affiché est "Infructueux"

## MODIFIED Requirements

### Requirement: System SHALL provide marche form component

Le système doit fournir un composant formulaire réutilisable pour création et édition, avec champs dynamiques et autorité contractante.

#### Scenario: Form has all required fields
- **WHEN** le formulaire est affiché
- **THEN** un champ "Numéro du marché" (input text) est présent
- **THEN** un champ "Objet" (textarea) est présent
- **THEN** un champ "Type" (select) est présent avec les 4 types
- **THEN** un champ "Montant (DH)" (input number) est présent
- **THEN** un champ "Date de notification" (date picker) est présent
- **THEN** un champ "Délai d'exécution (jours)" (input number) est présent
- **THEN** un champ "Nom de l'autorité contractante" (input text) est présent
- **THEN** un champ "Statut" (select) avec les 13 statuts est présent

#### Scenario: Form has optional autoriteContractante fields
- **WHEN** le formulaire est affiché
- **THEN** un champ "Date d'ordre de service" (date picker) est présent et optionnel
- **THEN** un champ "Contact autorité contractante" (input text) est présent et optionnel
- **THEN** un champ "Email autorité contractante" (input email) est présent et optionnel
- **THEN** un champ "Téléphone autorité contractante" (input tel) est présent et optionnel
- **THEN** aucun champ "fournisseur" n'est présent

#### Scenario: Form validates in real-time
- **WHEN** l'utilisateur saisit des données
- **THEN** la validation s'exécute à la perte de focus (onBlur)
- **THEN** les erreurs s'affichent immédiatement sous le champ
- **THEN** les champs valides affichent une icône de validation
- **THEN** les champs spécifiques au statut sont validés conditionnellement

#### Scenario: Form shows loading state during submission
- **WHEN** le formulaire est en cours de soumission
- **THEN** le bouton submit affiche "Création en cours..." ou "Modification en cours..."
- **THEN** le bouton submit est désactivé
- **THEN** tous les champs sont désactivés
- **THEN** un spinner est visible

### Requirement: System SHALL provide basic filters for marches list

Le système doit permettre de filtrer la liste des marchés par statut et type, incluant les nouveaux statuts.

#### Scenario: Filter by status works
- **WHEN** l'utilisateur sélectionne un statut dans le filtre
- **THEN** seuls les marchés avec ce statut sont affichés
- **THEN** le nombre de résultats est affiché
- **THEN** les statuts RESILIE, ANNULE, INFRUCTUEUX sont disponibles séparément

#### Scenario: Termination statuses are grouped in filter
- **WHEN** le filtre de statut est ouvert
- **THEN** les statuts RESILIE, ANNULE, INFRUCTUEUX sont dans un optgroup "Terminés"
- **THEN** chaque option affiche le label complet et explicite

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

### Requirement: System SHALL provide marche detail page

Le système doit fournir une page affichant tous les détails d'un marché, incluant les champs spécifiques et l'autorité contractante.

#### Scenario: Detail page displays all marche information
- **WHEN** l'utilisateur accède à `/marches/[id]`
- **THEN** toutes les informations du marché sont affichées
- **THEN** les dates sont formatées en français (ex: "15 janvier 2024")
- **THEN** le montant est formaté avec séparateur de milliers
- **THEN** le statut est affiché avec un badge coloré
- **THEN** les informations de l'autorité contractante sont affichées (pas "fournisseur")
- **THEN** les champs spécifiques au statut actuel sont affichés s'ils ont une valeur

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

## REMOVED Requirements

### Requirement: Form has fournisseur fields

**Reason**: Terminologie incorrecte remplacée par "autorité contractante".

**Migration**:
- Remplacer tous les labels "Fournisseur" par "Autorité contractante" dans l'UI
- Mettre à jour les placeholders des champs
- Mettre à jour les messages d'erreur de validation
- Aucune migration de données UI nécessaire (uniquement backend)
