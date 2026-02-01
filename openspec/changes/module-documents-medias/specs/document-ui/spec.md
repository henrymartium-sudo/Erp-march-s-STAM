## ADDED Requirements

### Requirement: User SHALL have a drag-and-drop upload interface

Le système doit fournir une interface d'upload intuitive avec support drag-and-drop.

#### Scenario: Drag and drop file upload on desktop
- **WHEN** l'utilisateur glisse-dépose un fichier PDF dans la zone de drop
- **THEN** la zone de drop change visuellement (bordure highlighted)
- **THEN** le système affiche "Déposez le fichier ici"
- **THEN** au relâchement, le fichier est ajouté à la liste d'upload
- **THEN** une barre de progression s'affiche pour ce fichier
- **THEN** après succès, un message "Fichier uploadé" s'affiche avec icône de succès

#### Scenario: Click to select file upload
- **WHEN** l'utilisateur clique sur la zone d'upload
- **THEN** le système ouvre le sélecteur de fichiers natif de l'OS
- **THEN** l'utilisateur sélectionne un ou plusieurs fichiers
- **THEN** les fichiers sélectionnés sont ajoutés à la liste d'upload
- **THEN** l'upload démarre automatiquement

#### Scenario: Multiple file upload progress tracking
- **WHEN** l'utilisateur upload 5 fichiers simultanément
- **THEN** le système affiche une liste des 5 fichiers avec barres de progression individuelles
- **THEN** chaque fichier affiche son nom, taille, et pourcentage de progression
- **THEN** les fichiers uploadés avec succès affichent une icône verte de succès
- **THEN** les fichiers en erreur affichent une icône rouge avec message d'erreur

#### Scenario: Cancel upload in progress
- **WHEN** un fichier est en cours d'upload (progression 45%)
- **THEN** l'utilisateur clique sur le bouton "Annuler" pour ce fichier
- **THEN** le système arrête l'upload immédiatement
- **THEN** le fichier est retiré de la liste
- **THEN** le fichier partiel n'est PAS créé en DB ni dans Storage

#### Scenario: Mobile upload from camera or gallery
- **WHEN** l'utilisateur clique sur la zone d'upload depuis un mobile
- **THEN** le système affiche les options "Prendre une photo" et "Choisir dans la galerie"
- **THEN** l'utilisateur sélectionne une photo depuis la galerie
- **THEN** la photo est uploadée normalement

### Requirement: User SHALL have a searchable and filterable document list

Le système doit fournir une interface de liste avec recherche et filtres avancés.

#### Scenario: Search documents by name
- **WHEN** l'utilisateur tape "facture" dans la barre de recherche
- **THEN** le système filtre la liste en temps réel (debounce 300ms)
- **THEN** seuls les documents contenant "facture" dans le nom ou description s'affichent
- **THEN** le nombre de résultats est affiché : "12 documents trouvés"

#### Scenario: Filter documents by type
- **WHEN** l'utilisateur sélectionne "DAO" dans le filtre type
- **THEN** le système affiche uniquement les documents de type DAO
- **THEN** l'URL est mise à jour : `/documents?type=DAO`
- **THEN** le filtre reste appliqué si l'utilisateur recharge la page

#### Scenario: Filter documents by marché
- **WHEN** l'utilisateur sélectionne le marché "M-2024-001" dans le filtre
- **THEN** le système affiche uniquement les documents associés à ce marché
- **THEN** le nombre de documents est affiché dans le badge du select : "DAO (5)"

#### Scenario: Combined filters
- **WHEN** l'utilisateur applique type=DAO ET marché=M-2024-001 ET période=Janvier 2024
- **THEN** le système affiche uniquement les documents correspondant à TOUS les critères
- **THEN** l'URL reflète tous les filtres : `/documents?type=DAO&marcheId=xxx&dateDebut=2024-01-01&dateFin=2024-01-31`

#### Scenario: Reset all filters
- **WHEN** plusieurs filtres sont appliqués
- **THEN** l'utilisateur clique sur "Réinitialiser les filtres"
- **THEN** tous les filtres sont supprimés
- **THEN** la liste affiche tous les documents
- **THEN** l'URL redevient `/documents` sans paramètres

### Requirement: User SHALL have a responsive document table/cards view

Le système doit adapter l'affichage selon la taille d'écran (table desktop, cards mobile).

#### Scenario: Desktop table view (>= 1024px)
- **WHEN** l'utilisateur accède à la liste depuis un desktop (1920x1080)
- **THEN** le système affiche une table complète avec colonnes : Icône, Nom, Type, Taille, Marché, Date, Actions
- **THEN** chaque colonne est cliquable pour tri (ascendant/descendant)
- **THEN** les actions (preview, download, delete) sont affichées dans une colonne dédiée

#### Scenario: Tablet view (768px - 1024px)
- **WHEN** l'utilisateur accède depuis une tablette (768x1024)
- **THEN** le système affiche une table compacte avec colonnes réduites
- **THEN** certaines colonnes moins importantes sont masquées (ex: uploadeur)
- **THEN** les actions sont dans un menu dropdown

#### Scenario: Mobile card view (< 768px)
- **WHEN** l'utilisateur accède depuis un mobile (375x667)
- **THEN** le système affiche les documents sous forme de cards
- **THEN** chaque card affiche : icône, nom, type (badge), taille, date
- **THEN** les actions sont accessibles via un bouton menu (3 points)
- **THEN** les cards sont empilées verticalement

#### Scenario: Sort documents in table
- **WHEN** l'utilisateur clique sur l'en-tête de colonne "Date"
- **THEN** la table est triée par date décroissante (récents en premier)
- **THEN** un indicateur de tri (flèche ↓) s'affiche
- **WHEN** l'utilisateur clique à nouveau
- **THEN** la table est triée par date croissante (anciens en premier)
- **THEN** l'indicateur devient flèche ↑

### Requirement: User SHALL have a document preview interface

Le système doit fournir une interface de prévisualisation pour PDF et images.

#### Scenario: Preview PDF document
- **WHEN** l'utilisateur clique sur "Prévisualiser" pour un document PDF
- **THEN** le système génère une URL signée Supabase
- **THEN** le système affiche le PDF dans un iframe pleine largeur
- **THEN** le navigateur affiche les contrôles PDF natifs (zoom, pages, recherche)
- **THEN** un bouton "Télécharger" reste visible au-dessus de l'iframe

#### Scenario: Preview image document
- **WHEN** l'utilisateur clique sur "Prévisualiser" pour une image JPG
- **THEN** le système génère une URL signée
- **THEN** le système affiche l'image avec next/image (optimisation automatique)
- **THEN** l'image est responsive et s'adapte à la largeur de l'écran
- **THEN** un bouton "Télécharger" est visible

#### Scenario: Preview not available for DOCX
- **WHEN** l'utilisateur clique sur "Prévisualiser" pour un document DOCX
- **THEN** le système affiche un message "Prévisualisation non disponible pour ce type de fichier"
- **THEN** le système affiche un bouton "Télécharger le fichier"
- **THEN** le système propose "Ouvrir dans Microsoft Word" (si détecté sur l'OS)

#### Scenario: Preview in modal dialog
- **WHEN** l'utilisateur clique sur "Prévisualiser" depuis la liste
- **THEN** le système ouvre une modal dialog plein écran
- **THEN** la modal affiche le document avec métadonnées en sidebar
- **THEN** l'utilisateur peut fermer avec bouton X ou touche Escape
- **THEN** l'utilisateur peut naviguer vers document suivant/précédent (flèches)

#### Scenario: Refresh expired preview URL
- **WHEN** l'utilisateur consulte une preview et l'URL signée expire (> 1h)
- **THEN** l'iframe ou image affiche une erreur de chargement
- **THEN** le système détecte l'erreur et affiche "Le lien a expiré"
- **THEN** un bouton "Recharger" génère une nouvelle URL signée
- **THEN** la preview se recharge automatiquement

### Requirement: User SHALL have a document detail page

Le système doit fournir une page de détail complète pour chaque document.

#### Scenario: View document details
- **WHEN** l'utilisateur clique sur un document dans la liste
- **THEN** le système redirige vers `/documents/[id]`
- **THEN** la page affiche toutes les métadonnées : nom, type (badge), taille, uploadeur, date upload, marché associé, description, tags
- **THEN** la page affiche la prévisualisation si disponible
- **THEN** la page affiche les actions disponibles (download, edit metadata, delete, upload version)

#### Scenario: View associated marché from document
- **WHEN** le document est associé à un marché (marcheId existe)
- **THEN** la page affiche une section "Marché associé"
- **THEN** cette section affiche le numéro et objet du marché
- **THEN** un lien cliquable redirige vers `/marches/[marcheId]`

#### Scenario: View document versions history
- **WHEN** le document possède plusieurs versions (> 1 ou a des versions enfants)
- **THEN** la page affiche une section "Historique des versions"
- **THEN** chaque version est listée avec : numéro, date, uploadeur, taille, actions
- **THEN** la version actuelle est indiquée visuellement (badge "Actuelle")
- **THEN** l'utilisateur peut prévisualiser ou télécharger n'importe quelle version

#### Scenario: Edit document metadata
- **WHEN** l'utilisateur clique sur "Modifier les métadonnées"
- **THEN** les champs éditables deviennent modifiables (nom, description, phase, dateValidite, tags)
- **THEN** les champs non éditables restent en lecture seule (storagePath, nomOriginal, taille)
- **THEN** l'utilisateur modifie et clique "Enregistrer"
- **THEN** le système valide et met à jour
- **THEN** un message "Métadonnées mises à jour" s'affiche

### Requirement: User SHALL have document actions accessible

Le système doit fournir des actions contextuelles pour chaque document.

#### Scenario: Download document action
- **WHEN** l'utilisateur clique sur le bouton "Télécharger"
- **THEN** le système génère une URL signée avec Content-Disposition: attachment
- **THEN** le navigateur démarre le téléchargement du fichier avec nom original
- **THEN** la progression du téléchargement s'affiche dans le navigateur

#### Scenario: Delete document action with confirmation
- **WHEN** l'utilisateur clique sur "Supprimer"
- **THEN** le système affiche une boîte de dialogue de confirmation
- **THEN** la boîte affiche "Êtes-vous sûr de vouloir supprimer ce document ?"
- **THEN** l'utilisateur confirme
- **THEN** le système soft delete le document
- **THEN** un toast "Document supprimé" s'affiche
- **THEN** l'utilisateur est redirigé vers la liste

#### Scenario: Upload new version action
- **WHEN** l'utilisateur clique sur "Uploader une nouvelle version"
- **THEN** le système affiche un dialog d'upload spécifique
- **THEN** l'utilisateur sélectionne un nouveau fichier
- **THEN** le système upload comme version (documentParentId défini)
- **THEN** un toast "Nouvelle version créée (v2)" s'affiche
- **THEN** la page se recharge avec la nouvelle version visible

#### Scenario: Copy document link action
- **WHEN** l'utilisateur clique sur "Copier le lien"
- **THEN** le système copie l'URL de la page détail dans le presse-papier
- **THEN** un toast "Lien copié" s'affiche
- **THEN** l'utilisateur peut partager ce lien avec d'autres utilisateurs authentifiés

### Requirement: User SHALL see documents associated with a marché

Le système doit afficher les documents directement depuis la page détail d'un marché.

#### Scenario: View documents section in marché detail
- **WHEN** l'utilisateur accède à la page `/marches/[id]`
- **THEN** la page affiche une section "Documents associés" après les informations du marché
- **THEN** cette section liste tous les documents liés à ce marché
- **THEN** les documents sont affichés sous forme de cards compactes
- **THEN** chaque card affiche : icône, nom, type (badge), taille, date

#### Scenario: Upload document from marché page
- **WHEN** l'utilisateur clique sur "Ajouter un document" depuis la page marché
- **THEN** le système ouvre un dialog d'upload
- **THEN** le champ marcheId est pré-rempli automatiquement
- **THEN** l'utilisateur upload un fichier
- **THEN** après succès, le document apparaît dans la liste de cette section

#### Scenario: Quick actions on documents in marché page
- **WHEN** l'utilisateur survole une card document dans la section marché
- **THEN** les actions rapides s'affichent : preview, download
- **THEN** cliquer sur preview ouvre la modal de prévisualisation
- **THEN** cliquer sur download démarre le téléchargement

### Requirement: User SHALL have visual indicators for document types

Le système doit fournir des indicateurs visuels clairs pour différencier les types de documents.

#### Scenario: Document type icons
- **WHEN** l'utilisateur consulte une liste de documents
- **THEN** chaque document affiche une icône distinctive selon son type :
  - DAO → FileText icon
  - DRP → FileCheck icon
  - CAUTION_BANCAIRE → Receipt icon
  - COURRIER → Mail icon
  - PV_RECEPTION → ClipboardCheck icon
  - ORDRE_SERVICE → FileSignature icon
  - DOCUMENT_VEHICULE → Car icon
  - AUTRE → File icon

#### Scenario: Document type badges with colors
- **WHEN** l'utilisateur consulte un document
- **THEN** le système affiche un badge coloré pour le type :
  - DAO → Badge bleu
  - DRP → Badge vert
  - CAUTION_BANCAIRE → Badge jaune
  - COURRIER → Badge violet
  - PV_RECEPTION → Badge orange
  - ORDRE_SERVICE → Badge cyan
  - DOCUMENT_VEHICULE → Badge rouge
  - AUTRE → Badge gris

#### Scenario: File size human-readable format
- **WHEN** le système affiche la taille d'un document
- **THEN** la taille est formatée en unité lisible : "2.5 MB", "756 KB", "15 B"
- **THEN** le format utilise 1 décimale maximum

### Requirement: User SHALL have loading states and error handling

Le système doit fournir des états de chargement et une gestion d'erreurs claire.

#### Scenario: Loading state during document list fetch
- **WHEN** l'utilisateur accède à la page de liste des documents
- **THEN** un skeleton loader s'affiche pendant le chargement
- **THEN** le skeleton simule la structure de la table (lignes grises animées)
- **THEN** après chargement, les documents réels remplacent le skeleton

#### Scenario: Empty state for document list
- **WHEN** aucun document n'existe dans le système
- **THEN** le système affiche une illustration d'état vide
- **THEN** un message "Aucun document enregistré" s'affiche
- **THEN** un bouton "Uploader votre premier document" est visible

#### Scenario: Error state for failed document load
- **WHEN** le chargement des documents échoue (erreur réseau, DB)
- **THEN** le système affiche un message d'erreur "Impossible de charger les documents"
- **THEN** un bouton "Réessayer" permet de relancer le chargement
- **THEN** l'erreur technique est loggée côté serveur

#### Scenario: Upload progress feedback
- **WHEN** un fichier est en cours d'upload
- **THEN** une barre de progression affiche le pourcentage (0% → 100%)
- **THEN** le nom du fichier et la taille sont affichés
- **THEN** un spinner animé indique l'activité
- **THEN** après succès, une icône de succès ✓ remplace le spinner

#### Scenario: Toast notifications for actions
- **WHEN** une action réussit (upload, delete, update)
- **THEN** un toast de succès s'affiche en haut à droite : "Action réussie ✓"
- **THEN** le toast disparaît automatiquement après 3 secondes
- **WHEN** une action échoue
- **THEN** un toast d'erreur s'affiche : "Une erreur est survenue ✗"
- **THEN** le toast reste affiché jusqu'à ce que l'utilisateur le ferme
