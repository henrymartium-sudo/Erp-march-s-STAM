## ADDED Requirements

### Requirement: System SHALL configure Supabase Storage with secure policies

Le système doit configurer correctement le bucket Supabase Storage avec des politiques de sécurité RLS.

#### Scenario: Bucket creation and configuration
- **WHEN** le module Documents est déployé pour la première fois
- **THEN** un bucket `marches-documents` est créé dans Supabase Storage
- **THEN** le bucket est configuré comme privé (public: false)
- **THEN** des politiques RLS sont appliquées pour contrôler l'accès
- **THEN** la politique de lecture autorise uniquement les utilisateurs authentifiés
- **THEN** la politique d'upload autorise uniquement ADMIN et AVANCE
- **THEN** la politique de suppression autorise uniquement ADMIN

#### Scenario: CORS configuration
- **WHEN** l'application Next.js tente d'accéder au Storage depuis le domaine
- **THEN** Supabase Storage accepte les requêtes cross-origin depuis le domaine autorisé
- **THEN** les headers CORS appropriés sont configurés (Access-Control-Allow-Origin)

### Requirement: System SHALL upload files securely to Supabase Storage

Le système doit gérer l'upload de fichiers vers Supabase Storage de manière sécurisée et performante.

#### Scenario: Successful file upload to Storage
- **WHEN** un document valide est uploadé via Server Action
- **THEN** le système génère un chemin de stockage structuré : `{type}/{marcheId}/{fileName}_{timestamp}.{ext}`
- **THEN** le système utilise le client Supabase server-side avec service role key
- **THEN** le système upload le fichier vers le bucket `marches-documents`
- **THEN** le système vérifie que l'upload a réussi (pas d'erreur retournée)
- **THEN** le système récupère le chemin du fichier uploadé (storagePath)

#### Scenario: Storage quota exceeded
- **WHEN** l'upload d'un fichier dépasse le quota Supabase (1 GB en Free tier)
- **THEN** Supabase Storage retourne une erreur de quota
- **THEN** le système affiche un message "Espace de stockage insuffisant. Contactez l'administrateur."
- **THEN** le système log l'erreur avec détails du quota

#### Scenario: Network failure during upload
- **WHEN** la connexion réseau échoue pendant l'upload vers Storage
- **THEN** Supabase client retourne une erreur de timeout/network
- **THEN** le système retry l'upload automatiquement (max 2 tentatives)
- **THEN** si échec après retry, le système affiche "Échec de l'upload. Vérifiez votre connexion."

#### Scenario: File name sanitization
- **WHEN** un fichier avec caractères spéciaux dans le nom est uploadé (ex: "Facture #123 & Co.pdf")
- **THEN** le système sanitize le nom de fichier (remplace caractères spéciaux par _)
- **THEN** le nom final devient : "Facture_123_Co_{timestamp}.pdf"
- **THEN** le nom original est conservé dans la DB (nomOriginal)

### Requirement: System SHALL generate signed URLs for secure download

Le système doit générer des URL signées temporaires pour le téléchargement sécurisé des documents.

#### Scenario: Generate signed URL for authenticated user
- **WHEN** un utilisateur authentifié demande l'accès à un document
- **THEN** le système vérifie les permissions de l'utilisateur (rôle, propriété document)
- **THEN** le système génère une URL signée Supabase avec expiration 1 heure (3600s)
- **THEN** l'URL signée contient un token d'accès unique et temporaire
- **THEN** l'URL signée permet l'accès au fichier sans authentification supplémentaire
- **THEN** l'URL est retournée au client pour preview ou download

#### Scenario: Signed URL expiration handling
- **WHEN** une URL signée générée il y a > 1 heure est utilisée
- **THEN** Supabase Storage retourne une erreur 403 Forbidden
- **THEN** le système affiche un message "Le lien a expiré"
- **THEN** le système propose un bouton "Générer un nouveau lien"
- **THEN** cliquer génère une nouvelle URL signée valide

#### Scenario: Signed URL for preview vs download
- **WHEN** l'utilisateur demande une prévisualisation (PDF, image)
- **THEN** le système génère une URL signée avec header `Content-Disposition: inline`
- **THEN** le fichier s'affiche dans le navigateur (pas de téléchargement)
- **WHEN** l'utilisateur demande un téléchargement
- **THEN** le système génère une URL signée avec header `Content-Disposition: attachment`
- **THEN** le fichier est téléchargé avec nom original

### Requirement: System SHALL delete files from Storage when hard delete is triggered

Le système doit gérer la suppression physique des fichiers de Storage lors des hard deletes (cron job).

#### Scenario: Soft delete does not remove from Storage
- **WHEN** un document est soft deleted (deleted: true)
- **THEN** l'entrée DB est marquée comme supprimée
- **THEN** le fichier dans Supabase Storage reste intact
- **THEN** l'utilisateur ne peut plus accéder au document via l'interface
- **THEN** un ADMIN peut restaurer le document et retrouver le fichier

#### Scenario: Hard delete removes from Storage (V1 - Cron job)
- **WHEN** un cron job mensuel est exécuté pour nettoyer les fichiers
- **THEN** le système identifie tous les documents soft deleted depuis > 90 jours
- **THEN** pour chaque document, le système supprime le fichier de Supabase Storage
- **THEN** le système supprime définitivement l'entrée DB (hard delete)
- **THEN** le système log chaque suppression pour audit

#### Scenario: Manual hard delete by ADMIN (immediate)
- **WHEN** un ADMIN demande la suppression définitive d'un document
- **THEN** le système affiche une confirmation "Attention : suppression définitive et irréversible"
- **THEN** l'ADMIN confirme
- **THEN** le système supprime le fichier de Supabase Storage immédiatement
- **THEN** le système supprime l'entrée DB
- **THEN** le système affiche "Document supprimé définitivement"

### Requirement: System SHALL handle Storage versioning for document updates

Le système doit gérer le stockage de multiples versions d'un même document.

#### Scenario: Upload new version to Storage
- **WHEN** une nouvelle version d'un document est uploadée
- **THEN** le système génère un nouveau chemin avec suffixe version : `{type}/{marcheId}/{fileName}_v{version}.{ext}`
- **THEN** le système upload le nouveau fichier (ne remplace PAS l'ancien)
- **THEN** toutes les versions restent disponibles dans Storage
- **THEN** chaque version a un storagePath unique en DB

#### Scenario: Delete specific version
- **WHEN** l'utilisateur supprime une version spécifique (pas la dernière)
- **THEN** le système soft delete uniquement cette version en DB
- **THEN** les autres versions restent accessibles
- **THEN** le fichier de cette version reste dans Storage (pour restauration possible)

### Requirement: System SHALL validate file integrity during upload

Le système doit valider l'intégrité des fichiers avant et après upload.

#### Scenario: File MIME type validation
- **WHEN** un fichier est uploadé
- **THEN** le système vérifie le MIME type côté serveur (pas seulement l'extension)
- **THEN** les MIME types autorisés sont : application/pdf, image/jpeg, image/png, application/vnd.openxmlformats-officedocument.*
- **THEN** si MIME type non autorisé, le système rejette l'upload
- **THEN** le système affiche "Type de fichier non autorisé"

#### Scenario: File size validation before upload
- **WHEN** un fichier de taille > 10 MB est sélectionné
- **THEN** le système vérifie la taille côté client (feedback immédiat)
- **THEN** le système affiche "Fichier trop volumineux (max 10 MB)"
- **THEN** le fichier n'est pas envoyé au serveur
- **THEN** le système vérifie à nouveau côté serveur (sécurité)

#### Scenario: Checksum validation (V1 - optionnel)
- **WHEN** un fichier est uploadé vers Storage
- **THEN** le système calcule un hash MD5 ou SHA256 du fichier
- **THEN** le hash est stocké en DB (champ checksum)
- **THEN** lors du download, le système peut vérifier l'intégrité
- **THEN** si corruption détectée, le système alerte l'utilisateur

### Requirement: System SHALL manage Storage paths consistently

Le système doit gérer les chemins de stockage de manière cohérente et structurée.

#### Scenario: Consistent path generation
- **WHEN** un document de type DAO pour marché M-2024-001 est uploadé
- **THEN** le chemin généré suit le pattern : `dao/M-2024-001/nom-fichier_{timestamp}.pdf`
- **THEN** le timestamp est au format ISO 8601
- **THEN** les espaces dans le nom sont remplacés par des underscores
- **THEN** les caractères spéciaux sont supprimés ou remplacés

#### Scenario: Handle documents without marché association
- **WHEN** un document sans marcheId est uploadé (type AUTRE)
- **THEN** le chemin généré utilise "general" comme dossier : `autre/general/nom-fichier_{timestamp}.pdf`
- **THEN** le document reste accessible normalement

#### Scenario: Prevent path traversal attacks
- **WHEN** un utilisateur malveillant tente d'uploader avec un nom contenant "../"
- **THEN** le système sanitize complètement le nom de fichier
- **THEN** tous les "../" et "./" sont supprimés
- **THEN** le chemin final ne permet aucune sortie du bucket autorisé

### Requirement: System SHALL monitor Storage usage and alert on quota

Le système doit surveiller l'utilisation du stockage et alerter avant dépassement de quota.

#### Scenario: Storage usage tracking
- **WHEN** l'administrateur accède au dashboard de monitoring
- **THEN** le système affiche l'utilisation actuelle du Storage (ex: 750 MB / 1 GB)
- **THEN** le système affiche un indicateur visuel de progression (barre, pourcentage)
- **THEN** le système affiche le nombre total de documents stockés

#### Scenario: Alert at 80% quota usage
- **WHEN** l'utilisation du Storage atteint 80% du quota (800 MB / 1 GB)
- **THEN** le système génère une alerte pour ADMIN
- **THEN** l'alerte affiche "Attention : espace de stockage à 80%"
- **THEN** l'alerte suggère des actions (supprimer vieux documents, upgrade plan)

#### Scenario: Block upload at 95% quota usage
- **WHEN** l'utilisation du Storage atteint 95% du quota
- **THEN** le système bloque tout nouvel upload
- **THEN** le système affiche "Espace de stockage presque plein. Contactez l'administrateur."
- **THEN** seule la suppression de documents est autorisée
