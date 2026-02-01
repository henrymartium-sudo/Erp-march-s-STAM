## ADDED Requirements

### Requirement: User SHALL be able to upload a new document

Le système doit permettre l'upload d'un nouveau document avec validation complète des données et stockage sécurisé.

#### Scenario: Successful document upload with all required fields
- **WHEN** l'utilisateur soumet un formulaire d'upload avec un fichier valide et tous les champs requis (nom, type, marcheId optionnel)
- **THEN** le système valide le fichier (taille < 10MB, type MIME autorisé)
- **THEN** le système upload le fichier vers Supabase Storage dans le bucket approprié
- **THEN** le système crée une nouvelle entrée Document dans la base de données avec métadonnées
- **THEN** le système génère un ID unique pour le document
- **THEN** le système enregistre le chemin Storage (storagePath)
- **THEN** le système enregistre l'utilisateur uploadeur (userId)
- **THEN** le système affiche un message de succès "Document uploadé avec succès"
- **THEN** le système redirige vers la page de détail du document

#### Scenario: Validation error on file size exceeds limit
- **WHEN** l'utilisateur tente d'uploader un fichier de taille > 10 MB
- **THEN** le système affiche un message d'erreur "Le fichier est trop volumineux (maximum 10 MB)"
- **THEN** le système ne upload pas le fichier
- **THEN** le système ne crée pas d'entrée en base de données

#### Scenario: Validation error on unsupported file type
- **WHEN** l'utilisateur tente d'uploader un fichier avec type MIME non autorisé (ex: .exe, .zip)
- **THEN** le système affiche un message d'erreur "Type de fichier non autorisé. Formats acceptés : PDF, JPG, PNG, DOCX, XLSX"
- **THEN** le système ne upload pas le fichier

#### Scenario: Multiple file upload
- **WHEN** l'utilisateur sélectionne plusieurs fichiers (3-5 fichiers) via drag-and-drop ou input file
- **THEN** le système affiche une barre de progression pour chaque fichier
- **THEN** le système upload chaque fichier séquentiellement
- **THEN** le système affiche le statut de chaque upload (succès/échec)
- **THEN** le système crée une entrée DB pour chaque fichier uploadé avec succès

#### Scenario: Rollback on database creation failure
- **WHEN** l'upload vers Supabase Storage réussit MAIS la création en DB échoue
- **THEN** le système supprime le fichier de Supabase Storage (rollback)
- **THEN** le système affiche un message d'erreur "Une erreur est survenue lors de l'enregistrement du document"
- **THEN** le système log l'erreur complète dans la console serveur

### Requirement: User SHALL be able to view a single document

Le système doit permettre la consultation détaillée d'un document avec toutes ses métadonnées et prévisualisation.

#### Scenario: Successful document retrieval
- **WHEN** l'utilisateur accède à la page de détail d'un document existant via son ID
- **THEN** le système affiche toutes les métadonnées (nom, type, taille, date upload, uploadeur)
- **THEN** le système affiche les informations du marché associé si marcheId existe
- **THEN** le système génère une URL signée pour accès sécurisé au fichier
- **THEN** le système affiche la prévisualisation si le type le permet (PDF, image)
- **THEN** le système affiche un bouton de téléchargement
- **THEN** le système affiche un badge coloré indiquant le type de document

#### Scenario: Document not found
- **WHEN** l'utilisateur tente d'accéder à un document avec un ID inexistant
- **THEN** le système affiche un message d'erreur "Document introuvable"
- **THEN** le système affiche un lien de retour vers la liste des documents

#### Scenario: Soft deleted document access
- **WHEN** l'utilisateur tente d'accéder à un document soft deleted (deleted: true)
- **THEN** le système affiche un message "Ce document a été supprimé"
- **THEN** le système affiche un bouton "Restaurer" si l'utilisateur est ADMIN
- **THEN** le système ne génère PAS d'URL signée pour preview/download

### Requirement: User SHALL be able to list all documents

Le système doit permettre la consultation de la liste complète des documents avec filtrage et pagination.

#### Scenario: Successful document list retrieval
- **WHEN** l'utilisateur accède à la page de liste des documents
- **THEN** le système affiche tous les documents non supprimés (deleted: false)
- **THEN** les documents sont triés par date de création décroissante
- **THEN** chaque document affiche : icône type, nom, type, taille, marché associé, date upload
- **THEN** le système affiche un badge de type coloré pour chaque document

#### Scenario: Empty document list
- **WHEN** aucun document n'existe dans le système
- **THEN** le système affiche un message "Aucun document enregistré"
- **THEN** le système affiche un bouton "Uploader un document"

#### Scenario: Pagination for large datasets
- **WHEN** plus de 50 documents existent dans le système
- **THEN** le système affiche les documents par pages de 50 éléments
- **THEN** le système affiche des contrôles de pagination (précédent, suivant, numéros de page)

#### Scenario: Filtered document list
- **WHEN** l'utilisateur applique des filtres (type: DAO, marché: M-2024-001)
- **THEN** le système affiche uniquement les documents correspondant aux filtres
- **THEN** le système met à jour les paramètres URL (?type=DAO&marcheId=xxx)
- **THEN** l'URL est bookmarkable et partageable

### Requirement: User SHALL be able to update document metadata

Le système doit permettre la modification des métadonnées d'un document sans modifier le fichier Storage.

#### Scenario: Successful metadata update
- **WHEN** l'utilisateur modifie les métadonnées d'un document (nom, description, phase, dateValidite)
- **THEN** le système valide les nouvelles données
- **THEN** le système met à jour l'entrée Document en base de données
- **THEN** le système met à jour le champ updatedAt
- **THEN** le système affiche un message "Métadonnées mises à jour avec succès"
- **THEN** le fichier dans Supabase Storage reste inchangé

#### Scenario: Cannot update storagePath or file
- **WHEN** l'utilisateur accède au formulaire de modification
- **THEN** les champs storagePath et nomOriginal sont en lecture seule
- **THEN** pour modifier le fichier, l'utilisateur doit uploader une nouvelle version

### Requirement: User SHALL be able to soft delete a document

Le système doit permettre la suppression logique d'un document avec possibilité de restauration.

#### Scenario: Successful soft delete
- **WHEN** l'utilisateur clique sur le bouton de suppression d'un document
- **THEN** le système affiche une boîte de dialogue de confirmation "Êtes-vous sûr de vouloir supprimer ce document ?"
- **THEN** l'utilisateur confirme la suppression
- **THEN** le système met à jour le document : deleted: true, deletedAt: new Date()
- **THEN** le fichier dans Supabase Storage reste intact (pas de suppression physique)
- **THEN** le système affiche un message "Document supprimé avec succès"
- **THEN** le système redirige vers la liste des documents
- **THEN** le document n'apparaît plus dans les listes par défaut

#### Scenario: Cancelled deletion
- **WHEN** l'utilisateur clique sur le bouton de suppression puis annule dans la boîte de dialogue
- **THEN** le système ne modifie pas le document
- **THEN** le système ferme la boîte de dialogue
- **THEN** l'utilisateur reste sur la page courante

#### Scenario: Document restoration by ADMIN
- **WHEN** un utilisateur ADMIN accède à un document soft deleted
- **THEN** le système affiche un bouton "Restaurer"
- **THEN** l'utilisateur clique sur "Restaurer"
- **THEN** le système met à jour : deleted: false, deletedAt: null
- **THEN** le système affiche un message "Document restauré avec succès"
- **THEN** le document réapparaît dans les listes

### Requirement: User SHALL be able to upload a new version of a document

Le système doit permettre le versioning des documents pour conserver l'historique des modifications.

#### Scenario: Successful version upload
- **WHEN** l'utilisateur upload un nouveau fichier comme version d'un document existant
- **THEN** le système récupère le document parent et son numéro de version
- **THEN** le système calcule le nouveau numéro de version (parent.version + 1)
- **THEN** le système upload le nouveau fichier vers Storage avec suffixe _v{version}
- **THEN** le système crée un nouveau Document avec documentParentId pointant vers le parent
- **THEN** le système affiche un message "Nouvelle version créée (v{version})"

#### Scenario: View document versions history
- **WHEN** un document possède plusieurs versions (version > 1 ou a des enfants)
- **THEN** le système affiche une section "Historique des versions"
- **THEN** chaque version affiche : numéro version, date upload, uploadeur, taille
- **THEN** l'utilisateur peut prévisualiser ou télécharger n'importe quelle version
- **THEN** la version actuelle (dernière) est indiquée visuellement

### Requirement: User SHALL be able to download a document

Le système doit permettre le téléchargement sécurisé des documents via URL signée temporaire.

#### Scenario: Successful document download
- **WHEN** l'utilisateur clique sur le bouton "Télécharger" d'un document
- **THEN** le système génère une URL signée Supabase Storage (expiration 1h)
- **THEN** le système déclenche le téléchargement du fichier avec nom original
- **THEN** le navigateur affiche la progression du téléchargement

#### Scenario: Signed URL expiration
- **WHEN** l'utilisateur tente d'utiliser une URL signée expirée (> 1h)
- **THEN** le système affiche un message "Lien expiré"
- **THEN** le système affiche un bouton "Générer un nouveau lien"
- **THEN** l'utilisateur clique et obtient une nouvelle URL signée

### Requirement: User SHALL receive appropriate error messages

Le système doit fournir des messages d'erreur clairs et actionnables pour toutes les opérations.

#### Scenario: Storage connection error
- **WHEN** l'upload vers Supabase Storage échoue (problème réseau, quota dépassé)
- **THEN** le système affiche un message "Impossible d'uploader le fichier. Vérifiez votre connexion ou contactez l'administrateur."
- **THEN** le système log l'erreur complète dans la console serveur

#### Scenario: Database connection error
- **WHEN** une opération DB échoue à cause d'une erreur de connexion
- **THEN** le système affiche un message "Une erreur technique est survenue. Veuillez réessayer."
- **THEN** le système log l'erreur complète dans la console serveur

#### Scenario: Permission error
- **WHEN** un utilisateur sans permissions appropriées tente une opération
- **THEN** le système affiche un message "Vous n'avez pas les permissions nécessaires pour cette action"
- **THEN** le système ne modifie pas les données
