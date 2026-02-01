## Context

Le module Documents & Médias s'intègre dans l'architecture Next.js 15 full-stack existante de l'ERP Marchés Publics. Le projet utilise déjà Prisma pour la gestion de la base de données PostgreSQL (Supabase), NextAuth pour l'authentification, et shadcn/ui pour les composants UI.

**État actuel :**
- Le modèle `Marche` existe déjà avec CRUD complet fonctionnel
- L'infrastructure Prisma est configurée avec le pattern singleton
- Le schéma de navigation et le dashboard principal sont en place
- Les Server Actions sont utilisées pour toutes les mutations
- Supabase est déjà utilisé pour PostgreSQL (même provider pour Storage)

**Contraintes :**
- Utiliser Supabase Storage (même fournisseur que la BDD pour cohérence)
- Limite de taille fichier : 10 MB par fichier (Supabase Free tier : 1 GB total)
- Formats autorisés : PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX
- Suivre le pattern existant des Server Actions avec validation Zod
- Maintenir la cohérence avec les modules Marchés et Cautions
- Interface responsive obligatoire (desktop, tablette, mobile)
- Sécurité maximale : validation type MIME côté serveur, URL signées

**Stakeholders :**
- Équipe de soumissionnaires (utilisateurs principaux - upload quotidien)
- Direction (consultation documents contractuels)
- Service juridique (accès rapide aux DAO, courriers, PV)
- Auditeurs externes (traçabilité complète)

## Goals / Non-Goals

**Goals:**
- Implémenter un système complet de gestion documentaire avec stockage sécurisé
- Fournir un versioning automatique pour historique des modifications
- Offrir une recherche et un filtrage performants (type, marché, phase, période)
- Permettre l'upload multiple de fichiers (drag-and-drop)
- Assurer la traçabilité complète des documents (création, modification, téléchargement)
- Prévisualisation intégrée des PDF et images
- Association bidirectionnelle Documents ↔ Marchés
- Téléchargement sécurisé avec URL signées temporaires

**Non-Goals:**
- Édition en ligne des documents (Google Docs-like) - hors scope
- OCR ou extraction automatique de données des PDF - V2
- Signature électronique des documents - V2
- Collaboration temps réel sur documents - V2
- Conversion automatique de formats (Word → PDF) - V2
- Chiffrement côté client des documents - Supabase Storage gère déjà le chiffrement
- Workflow d'approbation multi-niveaux pour validation documents - V1
- Intégration avec systèmes de GED externes - hors scope

## Decisions

### 1. Choix du Système de Stockage

**Décision :** Utiliser Supabase Storage avec buckets dédiés par type de document.

**Rationale :**
- **Pour :** Même fournisseur que PostgreSQL (cohérence infrastructure), pricing avantageux (1 GB gratuit), API simple, gestion automatique du chiffrement, CDN intégré, URL signées natives
- **Contre :** Vendor lock-in Supabase (mais acceptable pour MVP)
- **Alternative considérée :** AWS S3 → Rejeté car complexité configuration, coût plus élevé pour petits volumes
- **Alternative considérée :** Stockage filesystem local → Rejeté car non scalable, impossible avec Vercel

**Structure des buckets :**
```
marches-documents/
├── dao/              (Dossiers d'Appel d'Offres)
├── drp/              (Dossiers de Réponse)
├── cautions/         (Cautions bancaires)
├── courriers/        (Courriers administratifs)
├── pv-reception/     (PV réception provisoire/définitive)
├── ordres-service/   (Ordres de service)
└── vehicules/        (Documents véhicules - carte grise, etc.)
```

**Implémentation :**
- Un seul bucket `marches-documents` avec préfixes de dossiers par type
- Politiques RLS (Row Level Security) configurées sur Supabase
- URL signées avec expiration 1h pour download sécurisé
- Upload via `supabase.storage.from('marches-documents').upload()`

### 2. Architecture de Base de Données

**Décision :** Modèle Document avec versioning intégré et soft delete.

**Rationale :**
- **Pour :** Historique des modifications conservé, récupération possible après suppression, audit trail complet
- **Contre :** Complexité accrue du schéma, requêtes légèrement plus complexes (filtrer deleted)
- **Alternative considérée :** Table séparée `document_versions` → Rejeté car over-engineering pour MVP

**Implémentation :**
```prisma
model Document {
  id                String         @id @default(cuid())
  nom               String
  nomOriginal       String         // Nom fichier uploadé
  type              TypeDocument
  phase             PhaseMarche?   // Phase du marché (optionnel)
  taille            Int            // En bytes
  mimeType          String
  storagePath       String         // Chemin dans Supabase Storage
  storageUrl        String?        // URL publique (si applicable)

  // Métadonnées
  description       String?        @db.Text
  dateValidite      DateTime?      // Pour cautions, certifications
  tags              String[]       @default([])

  // Versioning
  version           Int            @default(1)
  documentParentId  String?        // Si c'est une version d'un doc existant
  documentParent    Document?      @relation("DocumentVersions", fields: [documentParentId], references: [id], onDelete: SetNull)
  versions          Document[]     @relation("DocumentVersions")

  // Soft delete
  deleted           Boolean        @default(false)
  deletedAt         DateTime?

  // Relations
  marcheId          String?
  marche            Marche?        @relation(fields: [marcheId], references: [id], onDelete: Cascade)

  userId            String
  user              User           @relation(fields: [userId], references: [id])

  // Timestamps
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  // Index pour performance
  @@index([type])
  @@index([marcheId])
  @@index([deleted])
  @@index([dateValidite])
  @@index([createdAt])
  @@map("documents")
}

enum TypeDocument {
  DAO
  DRP
  CAUTION_BANCAIRE
  COURRIER
  PV_RECEPTION
  ORDRE_SERVICE
  DOCUMENT_VEHICULE
  AUTRE
}

enum PhaseMarche {
  PREPARATION
  SOUMISSION
  ATTRIBUTION
  EXECUTION
  CLOTURE
}
```

### 3. Stratégie de Versioning

**Décision :** Versioning incrémental avec relation parent-enfant, conservation de toutes les versions.

**Rationale :**
- **Pour :** Historique complet, possibilité de rollback, traçabilité audit
- **Contre :** Stockage accru (mais fichiers < 10MB acceptable)
- **Alternative considérée :** Écraser le fichier existant → Rejeté car perte d'historique

**Workflow de versioning :**
1. Upload nouveau fichier avec même nom → Détection d'un document existant
2. Création d'un nouveau Document avec `version = parent.version + 1`
3. `documentParentId` pointe vers le document original
4. Document parent conserve `version = 1`, versions enfants ont `version = 2, 3, 4...`
5. Liste affiche par défaut la dernière version, option "Voir historique" pour toutes versions

**Implémentation :**
```typescript
async function uploadDocumentVersion(marcheId: string, file: File, parentDocId: string) {
  const parent = await prisma.document.findUnique({ where: { id: parentDocId } })
  const newVersion = parent.version + 1

  // Upload vers Supabase Storage avec suffixe _v{version}
  const storagePath = `${type}/${marcheId}/${fileName}_v${newVersion}.${ext}`

  // Créer nouveau Document
  const newDoc = await prisma.document.create({
    data: {
      ...baseData,
      version: newVersion,
      documentParentId: parent.id,
    }
  })
}
```

### 4. Gestion de la Sécurité et Permissions

**Décision :** Validation MIME type côté serveur + URL signées temporaires + permissions RBAC.

**Rationale :**
- **Pour :** Prévention upload malware, download sécurisé, contrôle d'accès granulaire
- **Contre :** Complexité accrue Server Actions
- **Alternative considérée :** Fichiers publics → Rejeté car risque sécurité

**Matrice de permissions :**
- ADMIN : Toutes opérations (CRUD complet, tous types)
- AVANCE : CRUD complet, tous types
- EXPLOITATION : Upload et lecture uniquement, types limités (PV_RECEPTION, DOCUMENT_VEHICULE)
- VISITEUR : Lecture seule uniquement

**Validation upload :**
```typescript
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

async function validateFile(file: File) {
  // Vérification MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Type de fichier non autorisé')
  }

  // Vérification taille
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Fichier trop volumineux (max 10 MB)')
  }

  // Vérification extension (double vérification)
  const ext = file.name.split('.').pop()?.toLowerCase()
  const allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx']
  if (!ext || !allowedExts.includes(ext)) {
    throw new Error('Extension de fichier non autorisée')
  }
}
```

**URL signées pour download :**
```typescript
// Génération URL signée valide 1h
const { data, error } = await supabase.storage
  .from('marches-documents')
  .createSignedUrl(storagePath, 3600) // 3600s = 1h

return data.signedUrl
```

### 5. Upload de Fichiers - UX

**Décision :** Upload multiple avec drag-and-drop natif HTML5, sans dépendance react-dropzone.

**Rationale :**
- **Pour :** Pas de dépendance supplémentaire, API native performante, contrôle total
- **Contre :** Légèrement plus de code custom
- **Alternative considérée :** Utiliser react-dropzone → Rejeté car inutile pour cas d'usage simple

**Implémentation :**
```typescript
'use client'

export function DocumentUpload({ marcheId }: { marcheId?: string }) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('marcheId', marcheId || '')

      const result = await uploadDocument(formData)
      // Afficher progress, success/error
    }
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed rounded-lg p-8 text-center"
    >
      <input type="file" multiple onChange={...} />
      Glissez vos fichiers ici ou cliquez pour sélectionner
    </div>
  )
}
```

### 6. Prévisualisation des Documents

**Décision :** Prévisualisation PDF via iframe natif, images via next/image, pas de bibliothèque tierce.

**Rationale :**
- **Pour :** Pas de dépendance, support navigateur natif PDF excellent, performance
- **Contre :** Fonctionnalités limitées (pas de zoom avancé, annotations)
- **Alternative considérée :** react-pdf → Rejeté car over-engineering pour MVP

**Implémentation :**
```typescript
export function DocumentPreview({ document }: { document: Document }) {
  const signedUrl = await getSignedUrlForDocument(document.id)

  if (document.mimeType === 'application/pdf') {
    return (
      <iframe
        src={signedUrl}
        className="w-full h-[600px] border rounded"
        title={document.nom}
      />
    )
  }

  if (document.mimeType.startsWith('image/')) {
    return (
      <Image
        src={signedUrl}
        alt={document.nom}
        width={800}
        height={600}
        className="rounded"
      />
    )
  }

  return <div>Prévisualisation non disponible. <DownloadButton /></div>
}
```

### 7. Architecture Frontend - Routes et Navigation

**Décision :** Structure de routes Next.js App Router avec Server Components par défaut.

**Rationale :**
- **Pour :** Performance optimale, cohérent avec modules existants
- **Contre :** Nécessite compréhension RSC boundary
- **Alternative considérée :** Tout en Client Components → Rejeté

**Structure de routes :**
```
app/
├── (dashboard)/
│   ├── documents/
│   │   ├── page.tsx                 → Liste (RSC)
│   │   ├── upload/
│   │   │   └── page.tsx             → Upload (RSC avec Client form)
│   │   └── [id]/
│   │       └── page.tsx             → Détail + Preview (RSC)
│   └── marches/
│       └── [id]/
│           └── page.tsx             → Modifié pour section documents
```

**Composants :**
- `document-list.tsx` (Server Component) → Récupère données
- `document-table.tsx` (Client Component) → Interactivité (tri, filtres)
- `document-upload.tsx` (Client Component) → Drag-and-drop
- `document-preview.tsx` (Server Component) → Affichage document
- `document-card.tsx` (Server Component) → Carte résumé
- `document-filters.tsx` (Client Component) → Filtres interactifs

### 8. Recherche et Filtrage

**Décision :** Filtres côté serveur avec paramètres URL, recherche full-text sur nom et description.

**Rationale :**
- **Pour :** URLs partageables, performance, filtres persistés
- **Contre :** Requiert rechargement page (acceptable avec RSC)
- **Alternative considérée :** Filtres côté client → Rejeté car pas de persistance

**Implémentation :**
```typescript
// Server Action avec filtres dynamiques
export async function getAllDocuments(filters: {
  type?: TypeDocument
  marcheId?: string
  phase?: PhaseMarche
  search?: string
  dateDebut?: Date
  dateFin?: Date
}) {
  const where: Prisma.DocumentWhereInput = {
    deleted: false, // Exclure soft deleted
  }

  if (filters.type) where.type = filters.type
  if (filters.marcheId) where.marcheId = filters.marcheId
  if (filters.phase) where.phase = filters.phase

  if (filters.search) {
    where.OR = [
      { nom: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { nomOriginal: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  if (filters.dateDebut || filters.dateFin) {
    where.createdAt = {
      gte: filters.dateDebut,
      lte: filters.dateFin,
    }
  }

  return prisma.document.findMany({
    where,
    include: {
      marche: { select: { numero: true, objet: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}
```

### 9. Gestion du Soft Delete

**Décision :** Soft delete avec flag `deleted` et `deletedAt`, possibilité de restauration.

**Rationale :**
- **Pour :** Récupération possible, audit trail complet, sécurité
- **Contre :** Complexité requêtes (filtrer deleted partout)
- **Alternative considérée :** Hard delete → Rejeté car perte définitive risquée

**Workflow soft delete :**
```typescript
export async function deleteDocument(id: string) {
  // Soft delete en DB
  await prisma.document.update({
    where: { id },
    data: {
      deleted: true,
      deletedAt: new Date(),
    },
  })

  // Ne PAS supprimer de Supabase Storage (permet restauration)
  // Hard delete Storage sera fait par un cron job mensuel pour fichiers deleted > 90j
}

export async function restoreDocument(id: string) {
  await prisma.document.update({
    where: { id },
    data: {
      deleted: false,
      deletedAt: null,
    },
  })
}
```

### 10. Responsive Design

**Décision :** Mobile-first avec transformation table → cards, upload simplifié sur mobile.

**Rationale :**
- **Pour :** UX optimale tous devices, pattern éprouvé
- **Contre :** Duplication markup
- **Alternative considérée :** Table scroll horizontal → Rejeté car mauvaise UX

**Breakpoints :**
- Mobile (< 768px) → Vue cards, bouton upload ouvre camera ou galerie
- Tablet (768-1024px) → Table compacte, drag-and-drop disponible
- Desktop (≥ 1024px) → Table complète, drag-and-drop, preview inline

## Risks / Trade-offs

### Risque 1 : Dépassement quota Supabase Storage (1 GB gratuit)

**Description :** Si trop de documents uploadés, dépassement quota gratuit Supabase.

**Mitigation :**
- Monitoring de l'usage dans dashboard Supabase
- Alerte à 80% du quota (800 MB)
- Limite stricte 10 MB par fichier
- Documentation utilisateur : privilégier PDF compressés
- Option upgrade plan Supabase si nécessaire (~$25/mois pour 100 GB)

### Risque 2 : Upload de fichiers malveillants

**Description :** Risque d'upload de malware déguisé en PDF/DOC.

**Mitigation :**
- Validation MIME type côté serveur (obligatoire)
- Validation extension fichier
- Limite de taille stricte (10 MB)
- Scan antivirus en V1 si budget (ClamAV ou service cloud)
- Documents stockés hors du serveur applicatif (Supabase isolé)

### Risque 3 : Synchronisation DB ↔ Storage

**Description :** Incohérence si document en DB mais pas dans Storage (ou inverse).

**Mitigation :**
- Transaction atomique : upload Storage → insert DB (dans cet ordre)
- Si insert DB échoue, supprimer de Storage dans le catch
- Cron job hebdomadaire : vérifier cohérence DB/Storage, nettoyer orphelins
- Logging de toutes les opérations Storage

### Risque 4 : Performance avec grand nombre de documents

**Description :** Liste de documents lente avec > 5000 entrées.

**Mitigation :**
- Index Prisma sur `type`, `marcheId`, `deleted`, `createdAt`
- Pagination serveur à 50 éléments par page
- Lazy loading des previews (ne charger URL signée qu'au clic)
- Pas de préchargement de tous les fichiers

### Risque 5 : Expiration URL signées pendant consultation

**Description :** URL signée expire après 1h, utilisateur perd accès au document.

**Mitigation :**
- Message clair "Lien expiré, cliquez pour recharger"
- Bouton refresh générant nouvelle URL signée
- En V1 : augmenter durée à 24h pour documents consultés fréquemment
- Considérer cache côté client pour previews

### Trade-off 1 : Pas de prévisualisation avancée (annotations, zoom)

**Justification :** Features avancées nécessitent react-pdf ou PDF.js (lourd).

**Impact :** Utilisateurs doivent télécharger pour annotations.

**Compensation :** Bouton download visible, ouverture dans nouvel onglet pour outils natifs.

### Trade-off 2 : Pas de conversion automatique de formats

**Justification :** Conversion Word → PDF nécessite service externe (LibreOffice headless, Pandoc).

**Impact :** Utilisateurs doivent uploader PDF directement.

**Compensation :** Documentation claire sur formats acceptés, message d'erreur explicite.

### Trade-off 3 : Soft delete uniquement en DB, pas dans Storage (MVP)

**Justification :** Simplification workflow, permet restauration facile.

**Impact :** Fichiers restent dans Storage même après soft delete.

**Compensation :** Cron job mensuel (V1) pour hard delete Storage si deleted > 90j.

## Migration Plan

### Étape 1 : Configuration Supabase Storage

1. Créer bucket `marches-documents` dans Supabase Dashboard
2. Configurer RLS policies pour sécurité
3. Configurer CORS pour autoriser requêtes depuis Next.js
4. Tester upload/download via Supabase API

**Script SQL RLS policies :**
```sql
-- Politique lecture : Utilisateurs authentifiés uniquement
CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'marches-documents' AND auth.role() = 'authenticated');

-- Politique upload : ADMIN et AVANCE uniquement
CREATE POLICY "ADMIN and AVANCE can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'marches-documents'
  AND auth.role() IN ('ADMIN', 'AVANCE')
);

-- Politique suppression : ADMIN uniquement
CREATE POLICY "ADMIN can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'marches-documents'
  AND auth.role() = 'ADMIN'
);
```

### Étape 2 : Préparation Base de Données

1. Ajouter modèle Document et enums au schéma Prisma
2. Créer migration : `npx prisma migrate dev --name add_document_model`
3. Vérifier création des index sur type, marcheId, deleted, createdAt
4. Vérifier contraintes FK vers marches et users
5. Régénérer Prisma Client : `npx prisma generate`

### Étape 3 : Configuration Variables d'Environnement

Ajouter à `.env` et `.env.production` :
```env
# Supabase Storage (public)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Supabase Storage (privé - Server Actions)
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

### Étape 4 : Backend (Clients Supabase + Server Actions)

1. Créer `lib/supabase/client.ts` (client-side) et `lib/supabase/server.ts` (server-side)
2. Créer `lib/validations/document.ts` avec schémas Zod
3. Créer `lib/actions/documents.ts` avec CRUD + Storage
4. Créer `lib/utils/document.ts` avec fonctions helpers (formatTaille, getIconByType, etc.)
5. Tester chaque Server Action manuellement

### Étape 5 : Frontend - Composants UI

1. Créer `components/documents/document-upload.tsx` (Client Component)
2. Créer `components/documents/document-table.tsx` (Client Component)
3. Créer `components/documents/document-card.tsx` (Server Component)
4. Créer `components/documents/document-filters.tsx` (Client Component)
5. Créer `components/documents/document-preview.tsx` (Server Component)
6. Créer `components/documents/document-version-list.tsx` (Server Component)

### Étape 6 : Frontend - Pages et Routes

1. Créer `app/(dashboard)/documents/page.tsx` (liste)
2. Créer `app/(dashboard)/documents/upload/page.tsx` (upload)
3. Créer `app/(dashboard)/documents/[id]/page.tsx` (détail + preview)
4. Modifier `app/(dashboard)/marches/[id]/page.tsx` pour section documents
5. Ajouter item "Documents" au menu dashboard (`components/layout/nav.tsx`)

### Étape 7 : Tests Playwright

1. Tester upload fichier PDF (drag-and-drop + input file)
2. Tester upload fichier image (JPG, PNG)
3. Tester upload multiple (3-5 fichiers simultanés)
4. Tester validation erreur (fichier > 10MB, type non autorisé)
5. Tester prévisualisation PDF et image
6. Tester téléchargement fichier (URL signée)
7. Tester filtres (par type, marché, période)
8. Tester recherche texte
9. Tester soft delete et restauration
10. Tester versioning (upload nouvelle version)
11. Tester responsive (desktop 1920x1080, tablet 768x1024, mobile 375x667)
12. Tester permissions (ADMIN, AVANCE, EXPLOITATION, VISITEUR)

### Étape 8 : Déploiement

1. Commit et push sur branche `feat/module-documents`
2. Vérification build Next.js : `npm run build`
3. Configurer variables d'environnement Vercel (Supabase keys)
4. Merge vers `main` après review
5. Migration Prisma en production : `npx prisma migrate deploy`
6. Configurer bucket Supabase Storage en production
7. Vérification déploiement Vercel
8. Smoke test sur environnement de production (upload, download, preview)

### Rollback Strategy

En cas de problème critique en production :
1. Revert du commit sur `main`
2. Redéploiement automatique Vercel
3. Si migration DB déjà appliquée : laisser table `documents` (pas de régression)
4. Bucket Supabase Storage conservé (pas de suppression)
5. Alternative : Désactiver menu "Documents" temporairement

## Open Questions

### Question 1 : Faut-il compresser automatiquement les images uploadées ?

**Contexte :** Images haute résolution (photos prises par smartphone) peuvent être lourdes (5-10 MB).

**Options :**
- A) Compression automatique côté serveur (Sharp.js) → résolution maximale 1920x1080
- B) Pas de compression, laisser utilisateur uploader tel quel

**Recommandation :** Option B pour MVP (simplicité), Option A en V1 si besoin identifié.

### Question 2 : Archivage automatique des vieilles versions de documents ?

**Contexte :** Si un document a 20 versions, affichage de toutes les versions peut être lourd.

**Options :**
- A) Afficher toutes les versions sans limite
- B) Archiver automatiquement versions > 1 an dans table séparée

**Recommandation :** Option A pour MVP, Option B en V2 si volumétrie importante.

### Question 3 : Scan antivirus des fichiers uploadés ?

**Contexte :** Risque d'upload malware (rare mais possible).

**Options :**
- A) Pas de scan antivirus pour MVP (validation MIME type suffit)
- B) Intégrer ClamAV ou service cloud (VirusTotal API)

**Recommandation :** Option A pour MVP (coût/complexité), Option B en V1 si budget.

### Question 4 : Export ZIP de tous les documents d'un marché ?

**Contexte :** Besoin de télécharger tous les documents d'un marché en un clic.

**Options :**
- A) Téléchargement fichier par fichier uniquement
- B) Génération ZIP dynamique côté serveur (JSZip ou Archiver.js)

**Recommandation :** Option A pour MVP, Option B en V1 si demande utilisateur forte.

### Question 5 : Notification lors de l'upload d'un nouveau document ?

**Contexte :** Alerter les utilisateurs concernés quand un document important est ajouté.

**Options :**
- A) Pas de notification pour MVP
- B) Notification email via Nodemailer (nécessite système d'alertes déjà en place)

**Recommandation :** Option A pour MVP, Option B en V1 avec module Alertes.

### Question 6 : Gestion des documents partagés entre plusieurs marchés ?

**Contexte :** Un même document (ex: agrément technique) peut concerner plusieurs marchés.

**Options :**
- A) Duplication du document pour chaque marché (simple)
- B) Relation many-to-many Document ↔ Marche (table pivot)

**Recommandation :** Option A pour MVP (duplication acceptable), Option B en V1 si besoin exprimé.
