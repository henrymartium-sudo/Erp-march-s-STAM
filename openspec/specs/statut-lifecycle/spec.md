## ADDED Requirements

### Requirement: System SHALL display statut badge with color coding

Le système doit afficher le statut de chaque marché avec un badge coloré pour identifier rapidement l'étape du cycle de vie.

#### Scenario: Each status has a distinct color
- **WHEN** un marché avec statut OPPORTUNITE_IDENTIFIEE est affiché
- **THEN** le badge est affiché en bleu clair (ou couleur veille)
- **WHEN** un marché avec statut DOSSIER_EN_PREPARATION est affiché
- **THEN** le badge est affiché en orange (ou couleur préparation)
- **WHEN** un marché avec statut OFFRE_DEPOSEE est affiché
- **THEN** le badge est affiché en violet (ou couleur soumission)
- **WHEN** un marché avec statut EN_ATTENTE_ATTRIBUTION est affiché
- **THEN** le badge est affiché en jaune (ou couleur attente)
- **WHEN** un marché avec statut ATTRIBUE_PROVISOIREMENT est affiché
- **THEN** le badge est affiché en vert clair (ou couleur provisoire)
- **WHEN** un marché avec statut ATTRIBUE_DEFINITIVEMENT est affiché
- **THEN** le badge est affiché en vert (ou couleur définitif)
- **WHEN** un marché avec statut EN_ATTENTE_LIVRAISON_OS est affiché
- **THEN** le badge est affiché en cyan (ou couleur attente OS)
- **WHEN** un marché avec statut EN_EXECUTION est affiché
- **THEN** le badge est affiché en bleu (ou couleur exécution)
- **WHEN** un marché avec statut EXECUTE_ATTENTE_GARANTIES est affiché
- **THEN** le badge est affiché en indigo (ou couleur garantie)
- **WHEN** un marché avec statut CLOTURE est affiché
- **THEN** le badge est affiché en gris (ou couleur clôturé)
- **WHEN** un marché avec statut RESILIE_ANNULE_INFRUCTUEUX est affiché
- **THEN** le badge est affiché en rouge (ou couleur échec)

#### Scenario: Badge displays status label in French
- **WHEN** un badge de statut est affiché
- **THEN** le texte du badge est en français
- **THEN** le texte est lisible et clair (ex: "Opportunité identifiée", "En exécution", "Clôturé")

### Requirement: System SHALL provide status selection in forms

Le système doit permettre de sélectionner le statut lors de la création ou modification d'un marché.

#### Scenario: Status select shows all options
- **WHEN** le formulaire de création/édition est affiché
- **THEN** un champ "Statut" de type select est présent
- **THEN** toutes les 11 valeurs de statut sont disponibles dans la liste déroulante
- **THEN** chaque option affiche le label en français

#### Scenario: Default status is set on creation
- **WHEN** l'utilisateur crée un nouveau marché
- **THEN** le statut par défaut est pré-sélectionné (OPPORTUNITE_IDENTIFIEE ou DOSSIER_EN_PREPARATION)
- **THEN** l'utilisateur peut changer le statut avant de soumettre

#### Scenario: Current status is pre-selected on edit
- **WHEN** l'utilisateur modifie un marché existant
- **THEN** le statut actuel du marché est pré-sélectionné dans le formulaire
- **THEN** l'utilisateur peut changer le statut

### Requirement: System SHALL allow status filtering in marches list

Le système doit permettre de filtrer les marchés par statut dans la liste.

#### Scenario: Status filter shows all options
- **WHEN** l'interface de filtrage est affichée
- **THEN** une liste déroulante "Filtrer par statut" est visible
- **THEN** l'option "Tous les statuts" est disponible
- **THEN** toutes les 11 valeurs de statut sont disponibles

#### Scenario: Filtering by status works correctly
- **WHEN** l'utilisateur sélectionne un statut spécifique dans le filtre
- **THEN** seuls les marchés ayant ce statut sont affichés
- **THEN** le nombre de résultats filtrés est affiché (ex: "5 marchés")

#### Scenario: Filter persists during navigation
- **WHEN** l'utilisateur applique un filtre de statut
- **WHEN** l'utilisateur consulte un détail puis revient à la liste
- **THEN** le filtre de statut reste appliqué

### Requirement: System SHALL provide status badge component

Le système doit fournir un composant réutilisable pour afficher les badges de statut.

#### Scenario: Badge component is reusable
- **WHEN** le composant `StatutBadge` est utilisé
- **THEN** il accepte une prop `statut` de type StatutMarche
- **THEN** il affiche automatiquement la bonne couleur
- **THEN** il affiche automatiquement le bon label en français

#### Scenario: Badge component handles all statuses
- **WHEN** n'importe quel statut valide est passé au composant
- **THEN** le badge s'affiche correctement
- **THEN** aucune erreur n'est levée

### Requirement: System SHALL display status consistently across the app

Le statut doit être affiché de manière cohérente dans toutes les vues.

#### Scenario: Status is visible in list view
- **WHEN** la liste des marchés est affichée
- **THEN** chaque card affiche le badge de statut
- **THEN** le badge est bien visible et positionné de manière cohérente

#### Scenario: Status is visible in detail view
- **WHEN** la page détail d'un marché est affichée
- **THEN** le badge de statut est affiché en haut de page
- **THEN** le badge est plus large/plus visible que dans la liste

#### Scenario: Status is editable in form view
- **WHEN** le formulaire de création/édition est affiché
- **THEN** le champ de sélection de statut est clairement visible
- **THEN** le statut actuel (en édition) est affiché avec un badge à côté du select

### Requirement: System SHALL support status-based sorting

Le système doit permettre de trier les marchés par statut.

#### Scenario: Sort option includes status
- **WHEN** l'interface de tri est affichée
- **THEN** une option "Trier par statut" est disponible
- **THEN** l'utilisateur peut choisir ordre croissant ou décroissant

#### Scenario: Status sorting follows lifecycle order
- **WHEN** l'utilisateur trie par statut (ordre croissant)
- **THEN** les marchés sont triés selon l'ordre du cycle de vie (OPPORTUNITE_IDENTIFIEE en premier, CLOTURE/RESILIE en dernier)

### Requirement: System SHALL validate status enum values

Le système doit valider que seules les valeurs de statut valides sont acceptées.

#### Scenario: Zod schema validates status
- **WHEN** le schéma de validation Zod est utilisé
- **THEN** le champ statut accepte uniquement les valeurs de l'enum StatutMarche
- **THEN** toute valeur invalide est rejetée avec un message d'erreur clair

#### Scenario: TypeScript enforces status types
- **WHEN** le code TypeScript manipule un statut
- **THEN** le type `StatutMarche` de Prisma est utilisé
- **THEN** le compilateur TypeScript empêche l'utilisation de valeurs invalides

### Requirement: System SHALL provide status labels mapping

Le système doit fournir un mapping entre les valeurs enum et les labels en français.

#### Scenario: Labels mapping is centralized
- **WHEN** un fichier de constantes/utils est créé (ex: `lib/utils/statut.ts`)
- **THEN** un objet `STATUT_LABELS` mappe chaque valeur enum à son label français
- **THEN** ce mapping est utilisé partout dans l'application

#### Scenario: Labels are consistent
- **WHEN** le même statut est affiché dans différentes parties de l'app
- **THEN** le label affiché est toujours identique
- **THEN** aucune incohérence n'existe

### Requirement: System SHALL provide status colors mapping

Le système doit fournir un mapping entre les valeurs enum et les couleurs des badges.

#### Scenario: Colors mapping is centralized
- **WHEN** un fichier de constantes/utils est créé (ex: `lib/utils/statut.ts`)
- **THEN** un objet `STATUT_COLORS` mappe chaque valeur enum à sa couleur Tailwind
- **THEN** ce mapping est utilisé par le composant StatutBadge

#### Scenario: Colors use Tailwind variants
- **WHEN** les couleurs de badge sont définies
- **THEN** elles utilisent les variants Tailwind (bg-blue-100, text-blue-800, etc.)
- **THEN** les couleurs sont accessibles (contraste suffisant)

### Requirement: System SHALL calculate derived dates based on status

Le système doit calculer certaines dates automatiquement selon le statut et les données saisies.

#### Scenario: Date fin prévue is calculated
- **WHEN** un marché a une dateOrdreService et un delaiExecution
- **THEN** la dateFinPrevue est calculée automatiquement (dateOrdreService + delaiExecution jours)
- **THEN** ce calcul est fait lors de la création/modification

#### Scenario: Calculated dates are displayed
- **WHEN** la page détail d'un marché est affichée
- **THEN** la dateFinPrevue calculée est visible
- **THEN** elle est clairement identifiée comme une date calculée (label ou icône)

### Requirement: System SHALL preserve status history for future features

Le système doit être conçu pour faciliter l'ajout futur d'un historique de statuts.

#### Scenario: Current schema allows for future history
- **WHEN** le modèle Marche est examiné
- **THEN** le champ statut actuel est un enum simple (pas de relation)
- **THEN** la structure permet l'ajout futur d'une table `StatutHistory` sans migration majeure

#### Scenario: Status changes are atomic
- **WHEN** un statut est modifié via Server Action
- **THEN** la modification est atomique (une seule opération DB)
- **THEN** le système est prêt pour l'ajout futur de logs de changement
