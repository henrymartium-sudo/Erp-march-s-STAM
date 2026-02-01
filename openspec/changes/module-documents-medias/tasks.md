## Tasks

### Phase 1 : Configuration Infrastructure (2-3 heures)

- [ ] Créer bucket `marches-documents` dans Supabase Dashboard
- [ ] Configurer RLS policies pour sécurité Storage
- [ ] Configurer CORS pour autoriser requêtes Next.js
- [ ] Tester upload/download basique via Supabase API
- [ ] Ajouter variables d'environnement (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Installer dépendance : `npm install @supabase/supabase-js`

### Phase 2 : Base de Données (1-2 heures)

- [ ] Ajouter modèle `Document` au schéma Prisma avec tous les champs
- [ ] Ajouter enums `TypeDocument` et `PhaseMarche`
- [ ] Ajouter relation `Document` → `Marche` (optional, cascade delete)
- [ ] Ajouter relation `Document` → `User`
- [ ] Ajouter auto-relation `Document` → `Document` pour versioning (parent/versions)
- [ ] Ajouter index sur `type`, `marcheId`, `deleted`, `createdAt`, `dateValidite`
- [ ] Créer migration : `npx prisma migrate dev --name add_document_model`
- [ ] Régénérer Prisma Client : `npx prisma generate`
- [ ] Vérifier migration appliquée en DB

### Phase 3 : Backend - Supabase Clients (1 heure)

- [ ] Créer `lib/supabase/client.ts` (client-side Supabase client)
- [ ] Créer `lib/supabase/server.ts` (server-side Supabase client avec service role)
- [ ] Tester connexion Supabase Storage depuis Server Action
- [ ] Tester génération URL signée

### Phase 4 : Backend - Validations Zod (1-2 heures)

- [ ] Créer `lib/validations/document.ts`
- [ ] Définir `documentBaseSchema` avec tous les champs requis
- [ ] Définir `createDocumentSchema` (extension du base)
- [ ] Définir `updateDocumentSchema` avec validation conditionnelle
- [ ] Définir `uploadFileSchema` pour validation fichier (taille, type MIME)
- [ ] Ajouter validation custom pour dateValidite (optionnelle mais doit être future)
- [ ] Tester schémas avec données valides et invalides

### Phase 5 : Backend - Utilitaires (2-3 heures)

- [ ] Créer `lib/utils/document.ts`
- [ ] Implémenter `formatTaille(bytes: number): string` (ex: "2.5 MB")
- [ ] Implémenter `getIconByType(type: TypeDocument): IconComponent`
- [ ] Implémenter `getColorByType(type: TypeDocument): string`
- [ ] Implémenter `generateStoragePath(marcheId: string, type: TypeDocument, fileName: string): string`
- [ ] Implémenter `extractFileExtension(fileName: string): string`
- [ ] Implémenter `validateMimeType(mimeType: string): boolean`
- [ ] Implémenter `isImageFile(mimeType: string): boolean`
- [ ] Implémenter `isPdfFile(mimeType: string): boolean`

### Phase 6 : Backend - Server Actions CRUD (4-6 heures)

- [ ] Créer `lib/actions/documents.ts`
- [ ] Implémenter `uploadDocument(formData: FormData)` avec :
  - Validation fichier (taille, MIME type)
  - Vérification permissions
  - Upload vers Supabase Storage
  - Création entrée DB
  - Gestion erreurs (rollback Storage si échec DB)
- [ ] Implémenter `uploadDocumentVersion(documentId: string, formData: FormData)` avec :
  - Récupération document parent
  - Calcul nouvelle version
  - Upload Storage avec suffixe version
  - Création nouveau Document avec `documentParentId`
- [ ] Implémenter `getDocumentById(id: string)` avec :
  - Vérification permissions
  - Include marche et user
  - Génération URL signée
- [ ] Implémenter `getAllDocuments(filters?)` avec :
  - Filtres dynamiques (type, marché, phase, search, dates)
  - Pagination
  - Exclusion soft deleted
  - Include marche et user
- [ ] Implémenter `getDocumentsByMarche(marcheId: string)` avec :
  - Filtrage par marcheId
  - Tri par type puis date
- [ ] Implémenter `updateDocument(id: string, data: unknown)` avec :
  - Validation Zod
  - Vérification permissions
  - Update DB uniquement (pas de modification fichier Storage)
- [ ] Implémenter `deleteDocument(id: string)` (soft delete) avec :
  - Vérification permissions
  - Update `deleted: true, deletedAt: new Date()`
  - Ne PAS supprimer de Storage
- [ ] Implémenter `restoreDocument(id: string)` avec :
  - Vérification permissions ADMIN
  - Update `deleted: false, deletedAt: null`
- [ ] Implémenter `getSignedUrlForDocument(id: string)` avec :
  - Vérification permissions
  - Génération URL signée (expiration 1h)
- [ ] Implémenter `getDocumentVersions(documentId: string)` avec :
  - Récupération de toutes les versions (parent + enfants)
  - Tri par version DESC
- [ ] Tester toutes les Server Actions manuellement

### Phase 7 : Frontend - Composants UI Basiques (3-4 heures)

- [ ] Créer `components/documents/document-card.tsx` (Server Component) avec :
  - Affichage icône selon type
  - Nom document
  - Taille formatée
  - Date upload
  - Badge type
  - Boutons actions (preview, download, delete)
- [ ] Créer `components/documents/document-badge.tsx` avec :
  - Couleurs par type de document
  - Labels français
- [ ] Créer `components/documents/document-icon.tsx` avec :
  - Icône dynamique selon type (FileText, Image, FileSpreadsheet, etc.)
- [ ] Créer `components/documents/document-actions.tsx` (Client Component) avec :
  - Bouton télécharger
  - Bouton supprimer (avec confirmation)
  - Bouton restaurer (si soft deleted)
  - Dropdown menu pour actions secondaires

### Phase 8 : Frontend - Upload Component (3-4 heures)

- [ ] Créer `components/documents/document-upload.tsx` (Client Component) avec :
  - Zone drag-and-drop HTML5 native
  - Input file multiple
  - États : idle, dragging, uploading, success, error
  - Progress bar pour chaque fichier
  - Liste des fichiers en cours d'upload
  - Validation côté client (taille, extension)
  - Gestion des erreurs avec messages clairs
  - Support mobile (caméra + galerie)
- [ ] Créer `components/documents/upload-progress.tsx` pour affichage progress
- [ ] Tester upload multiple (5 fichiers simultanés)
- [ ] Tester drag-and-drop sur desktop
- [ ] Tester input file sur mobile

### Phase 9 : Frontend - Table et Filtres (3-4 heures)

- [ ] Créer `components/documents/document-table.tsx` (Client Component) avec :
  - Colonnes : Icône, Nom, Type, Taille, Marché, Date upload, Actions
  - Tri par colonne (client-side)
  - Pagination côté client (50 éléments/page)
  - Responsive (cards sur mobile)
- [ ] Créer `components/documents/document-filters.tsx` (Client Component) avec :
  - Select type de document (tous, DAO, DRP, etc.)
  - Select marché (tous, ou liste marchés)
  - Select phase (toutes, PREPARATION, SOUMISSION, etc.)
  - Input recherche texte (nom, description)
  - Date range picker (période upload)
  - Bouton "Réinitialiser filtres"
  - Update URL searchParams lors du changement
- [ ] Créer `components/documents/document-search.tsx` pour barre recherche
- [ ] Tester filtres combinés
- [ ] Tester reset filtres
- [ ] Vérifier URL bookmarkability

### Phase 10 : Frontend - Prévisualisation (2-3 heures)

- [ ] Créer `components/documents/document-preview.tsx` (Server Component) avec :
  - Iframe pour PDF
  - next/image pour images
  - Message "Prévisualisation non disponible" pour autres types
  - Bouton download visible
  - Bouton "Ouvrir dans nouvel onglet"
- [ ] Créer `components/documents/document-preview-dialog.tsx` (Client Component) pour modal preview
- [ ] Gérer expiration URL signée (message + bouton refresh)
- [ ] Tester preview PDF
- [ ] Tester preview image (JPG, PNG)
- [ ] Tester preview DOCX (afficher message download)

### Phase 11 : Frontend - Versioning (2 heures)

- [ ] Créer `components/documents/document-version-list.tsx` (Server Component) avec :
  - Liste toutes versions d'un document
  - Indication version actuelle
  - Actions par version (preview, download, restaurer)
  - Timeline visuelle
- [ ] Créer `components/documents/upload-new-version-button.tsx` (Client Component)
- [ ] Tester upload nouvelle version
- [ ] Tester affichage historique versions
- [ ] Tester restauration version antérieure (download)

### Phase 12 : Frontend - Pages (3-4 heures)

- [ ] Créer `app/(dashboard)/documents/page.tsx` (liste) avec :
  - Titre et description
  - Bouton "Uploader un document"
  - Composant filters
  - Composant table
  - Gestion states (loading, empty, error)
- [ ] Créer `app/(dashboard)/documents/upload/page.tsx` avec :
  - Formulaire métadonnées (nom, type, phase, marché, description, dateValidite)
  - Composant upload
  - Validation client + serveur
  - Redirection après succès
- [ ] Créer `app/(dashboard)/documents/[id]/page.tsx` (détail) avec :
  - Breadcrumbs
  - Métadonnées document
  - Prévisualisation
  - Actions (download, delete, upload version)
  - Section "Versions" (si versions multiples)
  - Section "Marché associé" (si marcheId)
- [ ] Modifier `app/(dashboard)/marches/[id]/page.tsx` pour ajouter :
  - Section "Documents associés"
  - Bouton "Ajouter un document"
  - Liste documents du marché (cards)
- [ ] Ajouter item "Documents" dans `components/layout/nav.tsx`
- [ ] Vérifier navigation breadcrumbs
- [ ] Vérifier responsive toutes pages

### Phase 13 : Tests Playwright (4-5 heures)

- [ ] Tester upload fichier PDF via drag-and-drop
- [ ] Tester upload fichier image (JPG) via input file
- [ ] Tester upload multiple (3 fichiers simultanés)
- [ ] Tester validation erreur : fichier > 10MB
- [ ] Tester validation erreur : type MIME non autorisé (.exe, .zip)
- [ ] Tester validation erreur : champs requis manquants
- [ ] Tester prévisualisation PDF (iframe visible)
- [ ] Tester prévisualisation image (image chargée)
- [ ] Tester téléchargement fichier (URL signée fonctionne)
- [ ] Tester filtre par type de document
- [ ] Tester filtre par marché
- [ ] Tester recherche texte (nom document)
- [ ] Tester soft delete document
- [ ] Tester restauration document supprimé
- [ ] Tester upload nouvelle version
- [ ] Tester affichage historique versions
- [ ] Tester responsive desktop (1920x1080)
- [ ] Tester responsive tablet (768x1024)
- [ ] Tester responsive mobile (375x667)
- [ ] Tester permissions ADMIN (CRUD complet)
- [ ] Tester permissions AVANCE (CRUD complet)
- [ ] Tester permissions EXPLOITATION (lecture + upload limité)
- [ ] Tester permissions VISITEUR (lecture seule)

### Phase 14 : Documentation et Déploiement (2 heures)

- [ ] Mettre à jour `CHANGELOG.md` avec nouvelle feature
- [ ] Mettre à jour `SESSION.md` : marquer "Documents & Médias" comme terminé
- [ ] Ajouter commentaires JSDoc pour fonctions publiques
- [ ] Vérifier aucun `any` TypeScript
- [ ] Run `npm run build` et corriger warnings
- [ ] Commit avec message : `feat(documents): implement complete document management with Supabase Storage`
- [ ] Push vers branche `feat/module-documents`
- [ ] Configurer variables d'environnement Vercel (production)
- [ ] Configurer bucket Supabase Storage (production)
- [ ] Exécuter migration Prisma production : `npx prisma migrate deploy`
- [ ] Merge vers `main` après review
- [ ] Smoke test production (upload, preview, download)

### Phase 15 : Améliorations Post-MVP (Optionnel - V1)

- [ ] Compression automatique images (Sharp.js)
- [ ] Scan antivirus fichiers uploadés (ClamAV ou VirusTotal API)
- [ ] Export ZIP tous documents d'un marché (JSZip)
- [ ] Notification email lors upload document important
- [ ] Relation many-to-many Document ↔ Marche (documents partagés)
- [ ] Cron job nettoyage Storage (hard delete fichiers soft deleted > 90j)

## Estimation Totale

**MVP Complet** : ~30-40 heures (3-5 jours de développement)

**Répartition** :
- Configuration infrastructure : 3h
- Base de données : 2h
- Backend (clients, validations, actions) : 10h
- Frontend (composants, pages) : 15h
- Tests Playwright : 5h
- Documentation et déploiement : 2h

**Développement recommandé** : 1 semaine à temps plein ou 2 semaines à mi-temps
