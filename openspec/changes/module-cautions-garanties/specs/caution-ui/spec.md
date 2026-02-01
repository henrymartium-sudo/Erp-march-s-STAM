## ADDED Requirements

### Requirement: User SHALL access caution management through dedicated navigation

Le système doit fournir une navigation claire et accessible vers le module de gestion des cautions.

#### Scenario: Cautions menu item is visible in main navigation
- **WHEN** l'utilisateur est connecté au dashboard
- **THEN** le menu principal affiche un item "Cautions" avec une icône représentative
- **THEN** l'item est positionné après "Marchés" dans le menu
- **THEN** l'item est accessible depuis toutes les pages du dashboard

#### Scenario: Navigation to caution list page
- **WHEN** l'utilisateur clique sur l'item "Cautions" dans le menu
- **THEN** le système redirige vers `/cautions`
- **THEN** la page affiche la liste complète des cautions
- **THEN** l'item "Cautions" est visuellement marqué comme actif dans le menu

#### Scenario: Breadcrumb navigation is displayed
- **WHEN** l'utilisateur navigue dans le module cautions
- **THEN** le système affiche un fil d'Ariane (breadcrumb)
- **THEN** pour `/cautions` : "Accueil > Cautions"
- **THEN** pour `/cautions/nouveau` : "Accueil > Cautions > Nouvelle caution"
- **THEN** pour `/cautions/[id]` : "Accueil > Cautions > [Référence]"
- **THEN** chaque niveau est cliquable pour navigation rapide

### Requirement: User SHALL view cautions in a data table with filtering

Le système doit afficher la liste des cautions dans un tableau interactif avec capacités de filtrage.

#### Scenario: Caution list table displays all required columns
- **WHEN** l'utilisateur accède à `/cautions`
- **THEN** le tableau affiche les colonnes : Référence, Type, Marché, Montant, Banque, Date d'échéance, Statut, Actions
- **THEN** chaque ligne représente une caution unique
- **THEN** les montants sont formatés en devise (ex: 50 000,00 €)
- **THEN** les dates sont formatées en français (ex: 15 janv. 2026)

#### Scenario: Table is sortable by columns
- **WHEN** l'utilisateur clique sur l'en-tête d'une colonne
- **THEN** le tableau trie les cautions par cette colonne en ordre croissant
- **THEN** un second clic inverse l'ordre de tri (décroissant)
- **THEN** une icône de tri (↑ ou ↓) indique la colonne et direction active

#### Scenario: Filter by status
- **WHEN** l'utilisateur sélectionne un filtre de statut (ACTIVE, EXPIREE, LIBEREE, APPELEE)
- **THEN** le tableau affiche uniquement les cautions correspondant au statut sélectionné
- **THEN** le nombre de résultats est affiché (ex: "23 cautions actives")
- **THEN** un bouton "Réinitialiser les filtres" permet de tout afficher

#### Scenario: Filter by type
- **WHEN** l'utilisateur sélectionne un filtre de type (PROVISOIRE, DEFINITIVE, AVANCE, RETENUE_GARANTIE)
- **THEN** le tableau affiche uniquement les cautions du type sélectionné
- **THEN** le filtre peut être combiné avec le filtre de statut

#### Scenario: Filter by marché
- **WHEN** l'utilisateur sélectionne un marché depuis un sélecteur
- **THEN** le tableau affiche uniquement les cautions associées à ce marché
- **THEN** le numéro du marché sélectionné est affiché dans la zone de filtres actifs

#### Scenario: Search by reference or banque
- **WHEN** l'utilisateur tape du texte dans le champ de recherche
- **THEN** le tableau filtre en temps réel les cautions dont la référence ou le nom de banque contient le texte
- **THEN** la recherche est insensible à la casse
- **THEN** un indicateur montre le nombre de résultats trouvés

### Requirement: User SHALL create a new caution through a form interface

Le système doit fournir un formulaire de création de caution intuitif et guidé.

#### Scenario: Create caution form displays all required fields
- **WHEN** l'utilisateur accède à `/cautions/nouveau`
- **THEN** le formulaire affiche les champs : Référence (texte), Type (sélection), Montant (nombre), Date d'émission (calendrier), Date d'échéance (calendrier), Banque émettrice (texte), Contact banque (texte optionnel), Marché associé (sélection)
- **THEN** chaque champ requis est marqué d'un astérisque (*)
- **THEN** le formulaire affiche un bouton "Créer la caution"
- **THEN** le formulaire affiche un bouton "Annuler" qui redirige vers `/cautions`

#### Scenario: Type selection uses dropdown with labels
- **WHEN** l'utilisateur clique sur le champ Type
- **THEN** un menu déroulant affiche les 4 types avec leurs libellés complets
- **THEN** PROVISOIRE affiche "Caution de soumission"
- **THEN** DEFINITIVE affiche "Caution de bonne exécution"
- **THEN** AVANCE affiche "Caution d'avance de démarrage"
- **THEN** RETENUE_GARANTIE affiche "Caution de retenue de garantie"

#### Scenario: Marché selection uses searchable combobox
- **WHEN** l'utilisateur clique sur le champ Marché associé
- **THEN** un combobox affiche la liste des marchés avec format "[Numéro] - [Objet]"
- **THEN** l'utilisateur peut taper pour rechercher un marché
- **THEN** la recherche filtre par numéro et objet
- **THEN** seuls les marchés en cours ou attribués sont proposés

#### Scenario: Date fields use calendar picker
- **WHEN** l'utilisateur clique sur un champ de date
- **THEN** un calendrier s'affiche pour sélection visuelle
- **THEN** l'utilisateur peut aussi saisir la date manuellement au format JJ/MM/AAAA
- **THEN** le système valide le format de date saisi

#### Scenario: Amount field formats input as currency
- **WHEN** l'utilisateur saisit un montant
- **THEN** le champ formate automatiquement avec séparateur de milliers
- **THEN** la saisie accepte uniquement des nombres et le séparateur décimal
- **THEN** le symbole € est affiché après le champ

#### Scenario: Real-time validation feedback
- **WHEN** l'utilisateur remplit le formulaire
- **THEN** les erreurs de validation s'affichent en temps réel sous chaque champ
- **THEN** les champs valides affichent une icône de validation verte
- **THEN** le bouton "Créer" reste désactivé tant que le formulaire est invalide

### Requirement: User SHALL view caution details in a dedicated page

Le système doit afficher les détails complets d'une caution dans une page dédiée.

#### Scenario: Caution detail page displays all information
- **WHEN** l'utilisateur accède à `/cautions/[id]`
- **THEN** la page affiche en en-tête : Référence (titre principal), Statut (badge), Type (sous-titre)
- **THEN** la page affiche une section "Informations générales" avec : Montant, Date d'émission, Date d'échéance, Banque émettrice, Contact banque
- **THEN** la page affiche une section "Marché associé" avec : Numéro, Objet, Lien vers la page du marché
- **THEN** la page affiche une section "Validité" avec : Jours restants, Barre de progression, Indicateurs d'alerte

#### Scenario: Action buttons are contextual to status
- **WHEN** une caution ACTIVE est affichée
- **THEN** la page affiche les boutons : "Modifier", "Marquer comme libérée", "Supprimer"
- **WHEN** une caution LIBEREE est affichée
- **THEN** la page affiche uniquement le bouton "Supprimer" (pas de modification possible)
- **WHEN** une caution EXPIREE est affichée
- **THEN** la page affiche un avertissement et les boutons "Marquer comme libérée", "Supprimer"

#### Scenario: Visual progress bar for validity period
- **WHEN** une caution ACTIVE est affichée
- **THEN** une barre de progression montre la période écoulée vs période totale
- **THEN** la barre est verte si > 30 jours restants
- **THEN** la barre est orange si entre 7 et 30 jours restants
- **THEN** la barre est rouge si < 7 jours restants

#### Scenario: Related alerts are displayed
- **WHEN** des alertes existent pour la caution
- **THEN** la page affiche une section "Alertes" avec la liste des alertes générées
- **THEN** chaque alerte affiche : Type, Message, Date de création, Statut (envoyée/en attente)

### Requirement: User SHALL edit caution through update form

Le système doit fournir un formulaire de modification de caution pré-rempli.

#### Scenario: Edit form is pre-filled with current data
- **WHEN** l'utilisateur accède à `/cautions/[id]/edit`
- **THEN** tous les champs sont pré-remplis avec les valeurs actuelles de la caution
- **THEN** le champ Référence est en lecture seule (grisé, non modifiable)
- **THEN** le formulaire affiche "Modifier la caution [Référence]" comme titre
- **THEN** les boutons sont "Enregistrer les modifications" et "Annuler"

#### Scenario: Save changes updates caution
- **WHEN** l'utilisateur modifie des champs et clique sur "Enregistrer"
- **THEN** le système valide les modifications
- **THEN** le système met à jour la caution dans la base de données
- **THEN** le système affiche un message de succès "Caution modifiée avec succès"
- **THEN** le système redirige vers la page de détail de la caution

#### Scenario: Cancel discards changes
- **WHEN** l'utilisateur clique sur "Annuler"
- **THEN** le système affiche une confirmation "Les modifications non enregistrées seront perdues"
- **THEN** après confirmation, le système redirige vers la page de détail sans sauvegarder

### Requirement: User SHALL see responsive design on all devices

Le système doit adapter l'interface aux différentes tailles d'écran.

#### Scenario: Desktop view (≥1920px)
- **WHEN** l'utilisateur accède au module sur desktop
- **THEN** le tableau affiche toutes les colonnes côte à côte
- **THEN** le formulaire affiche les champs sur 2 colonnes
- **THEN** la page de détail affiche les sections côte à côte

#### Scenario: Tablet view (768-1024px)
- **WHEN** l'utilisateur accède au module sur tablette
- **THEN** le tableau reste horizontal avec scroll horizontal si nécessaire
- **THEN** le formulaire affiche les champs sur 1 colonne
- **THEN** les boutons d'action restent accessibles

#### Scenario: Mobile view (375-667px)
- **WHEN** l'utilisateur accède au module sur mobile
- **THEN** le tableau affiche une vue carte (card) par caution
- **THEN** chaque carte affiche : Référence, Type, Statut, Montant, Échéance
- **THEN** un bouton "Voir détails" permet d'accéder à la page complète
- **THEN** le formulaire affiche tous les champs empilés verticalement
