## ADDED Requirements

### Requirement: System SHALL display cautions associated with a marché

Le système doit afficher toutes les cautions liées à un marché depuis la page de détail du marché.

#### Scenario: Marché detail page shows cautions section
- **WHEN** l'utilisateur accède à la page de détail d'un marché (`/marches/[id]`)
- **THEN** la page affiche une section "Cautions et Garanties" après les informations principales
- **THEN** la section affiche le nombre total de cautions associées (ex: "3 cautions")
- **THEN** la section affiche un bouton "Ajouter une caution" pour création rapide

#### Scenario: Cautions list for marché shows summary view
- **WHEN** le système affiche les cautions d'un marché
- **THEN** chaque caution affiche : Référence, Type (badge), Statut (badge coloré), Montant, Date d'échéance, Actions
- **THEN** les cautions sont triées par date d'échéance (plus proche en premier)
- **THEN** chaque ligne a un bouton "Voir détails" qui redirige vers `/cautions/[cautionId]`

#### Scenario: Empty cautions list shows helpful message
- **WHEN** un marché n'a aucune caution associée
- **THEN** la section affiche "Aucune caution enregistrée pour ce marché"
- **THEN** la section affiche un bouton "Ajouter la première caution"
- **THEN** un message informatif explique "Les cautions garantissent la bonne exécution du marché"

#### Scenario: Cautions summary statistics are displayed
- **WHEN** un marché a des cautions
- **THEN** la section affiche le montant total des cautions actives
- **THEN** la section affiche le nombre de cautions par statut (ex: "2 actives, 1 libérée")
- **THEN** la section affiche une alerte si des cautions expirent bientôt (< 30j)

### Requirement: User SHALL create a caution from marché detail page

Le système doit permettre la création rapide d'une caution directement depuis un marché.

#### Scenario: Create caution button pre-fills marché reference
- **WHEN** l'utilisateur clique sur "Ajouter une caution" depuis `/marches/[id]`
- **THEN** le système ouvre le formulaire de création de caution
- **THEN** le champ "Marché associé" est pré-rempli avec le marché actuel
- **THEN** le champ "Marché associé" est en lecture seule (non modifiable)
- **THEN** tous les autres champs sont vides et éditables

#### Scenario: Quick create modal for simple caution
- **WHEN** l'utilisateur utilise la création rapide
- **THEN** un modal s'affiche avec les champs essentiels : Référence, Type, Montant, Date d'échéance, Banque
- **THEN** les champs avancés (Contact banque) sont optionnels
- **THEN** le bouton "Créer et retourner au marché" enregistre et ferme le modal
- **THEN** la liste des cautions du marché se met à jour automatiquement

#### Scenario: Redirect after creation from marché
- **WHEN** l'utilisateur crée une caution depuis un marché
- **THEN** après la création, le système affiche un message de succès
- **THEN** le système redirige vers la page de détail du marché
- **THEN** la nouvelle caution apparaît dans la liste des cautions
- **THEN** un scroll automatique amène l'utilisateur à la section cautions

### Requirement: System SHALL validate marché-caution relationship

Le système doit assurer la cohérence de la relation entre marchés et cautions.

#### Scenario: Caution can only be linked to existing marché
- **WHEN** l'utilisateur tente de créer une caution
- **THEN** le sélecteur de marché affiche uniquement les marchés existants
- **THEN** impossible de soumettre le formulaire sans sélectionner un marché
- **THEN** la validation échoue si l'ID du marché n'existe pas en base

#### Scenario: Deleting marché cascades to cautions
- **WHEN** un marché contenant des cautions est supprimé
- **THEN** le système affiche un avertissement "Ce marché contient X caution(s). Elles seront également supprimées."
- **THEN** l'utilisateur doit confirmer explicitement la suppression
- **THEN** après confirmation, toutes les cautions associées sont supprimées (onDelete: Cascade)
- **THEN** les alertes liées aux cautions sont également supprimées

#### Scenario: Changing marché reference updates caution
- **WHEN** l'utilisateur modifie le marché associé à une caution existante
- **THEN** le système met à jour la relation marcheId
- **THEN** la caution disparaît de la liste du marché précédent
- **THEN** la caution apparaît dans la liste du nouveau marché

### Requirement: User SHALL filter cautions by marché in global list

Le système doit permettre le filtrage des cautions par marché depuis la liste globale.

#### Scenario: Marché filter shows searchable dropdown
- **WHEN** l'utilisateur accède au filtre Marché sur `/cautions`
- **THEN** un combobox affiche tous les marchés ayant au moins une caution
- **THEN** chaque option affiche "[Numéro] - [Objet]"
- **THEN** l'utilisateur peut rechercher par numéro ou objet
- **THEN** une option "Tous les marchés" permet de réinitialiser le filtre

#### Scenario: Filtering by marché updates URL
- **WHEN** l'utilisateur sélectionne un marché dans le filtre
- **THEN** l'URL est mise à jour avec le paramètre `?marcheId=xxx`
- **THEN** le tableau affiche uniquement les cautions du marché sélectionné
- **THEN** le nombre de résultats est affiché
- **THEN** le filtre appliqué est visible comme badge cliquable pour suppression

#### Scenario: Direct link to marché cautions
- **WHEN** l'utilisateur accède à `/cautions?marcheId=xxx`
- **THEN** le tableau affiche automatiquement les cautions du marché filtré
- **THEN** le filtre Marché est pré-sélectionné avec le bon marché
- **THEN** un breadcrumb indique "Cautions > Marché [Numéro]"

### Requirement: System SHALL show marché context in caution details

Le système doit afficher clairement le contexte du marché lors de la consultation d'une caution.

#### Scenario: Caution detail shows marché summary
- **WHEN** l'utilisateur consulte une caution
- **THEN** la section "Marché associé" affiche : Numéro, Objet, Type, Statut, Montant total
- **THEN** un lien "Voir le marché" redirige vers `/marches/[id]`
- **THEN** si le marché est clos ou résilié, un badge de statut est affiché

#### Scenario: Caution type relevance to marché status
- **WHEN** une caution PROVISOIRE est affichée et le marché est ATTRIBUE
- **THEN** le système affiche un avertissement "Ce marché est attribué : envisager de libérer la caution de soumission"
- **WHEN** une caution DEFINITIVE est affichée et le marché est CLOTURE
- **THEN** le système affiche "Marché clôturé : vérifier si la caution peut être libérée"

#### Scenario: Marché timeline shows caution milestones
- **WHEN** l'utilisateur consulte la timeline d'un marché
- **THEN** les événements de création/libération de cautions sont affichés
- **THEN** chaque événement montre : Date, Type de caution, Action (créée/libérée/expirée)
- **THEN** les événements sont intégrés chronologiquement avec les autres événements du marché

### Requirement: System SHALL calculate caution coverage for marché

Le système doit calculer la couverture totale des cautions par rapport au montant du marché.

#### Scenario: Coverage percentage is displayed
- **WHEN** un marché a des cautions actives
- **THEN** le système calcule le montant total des cautions ACTIVE
- **THEN** le système calcule le pourcentage par rapport au montant du marché
- **THEN** le système affiche "Couverture : X € (Y% du marché)"

#### Scenario: Coverage warning for insufficient cautions
- **WHEN** le montant total des cautions actives est inférieur à 10% du marché
- **THEN** le système affiche un avertissement "Couverture faible : vérifier les garanties requises"
- **THEN** un badge orange "Attention" est affiché

#### Scenario: Coverage by type is shown
- **WHEN** l'utilisateur consulte les statistiques de cautions d'un marché
- **THEN** le système affiche un tableau de répartition par type
- **THEN** le tableau montre : Type, Montant, Statut, Date d'échéance
- **THEN** le total par type et le total global sont calculés

### Requirement: System SHALL enable bulk operations on marché cautions

Le système doit permettre des opérations groupées sur les cautions d'un marché.

#### Scenario: Mark all eligible cautions as LIBEREE
- **WHEN** un marché est marqué comme CLOTURE
- **THEN** le système affiche un bouton "Libérer toutes les cautions actives"
- **THEN** au clic, une confirmation liste les cautions qui seront libérées
- **THEN** après confirmation, toutes les cautions ACTIVE passent en LIBEREE
- **THEN** un message de succès indique le nombre de cautions libérées

#### Scenario: Export cautions for a marché
- **WHEN** l'utilisateur clique sur "Exporter les cautions" depuis la page marché
- **THEN** le système génère un fichier CSV avec toutes les cautions du marché
- **THEN** le fichier contient : Référence, Type, Montant, Banque, Dates, Statut
- **THEN** le nom du fichier est "cautions_marche_[numero]_[date].csv"
