## Why

Le système de gestion documentaire est absolument critique pour la maîtrise du risque contractuel dans les marchés publics. Actuellement, l'absence de ce module expose l'entreprise à des risques majeurs : perte de documents contractuels (DAO, DRP), absence de traçabilité des versions, difficultés de recherche et de partage, non-conformité lors des audits, et impossibilité de prouver la réception de documents en cas de litige. Ce module MVP permettra la centralisation sécurisée de tous les documents avec versioning, métadonnées, et association aux marchés concernés.

## What Changes

- Ajout d'un module complet de gestion documentaire avec stockage Supabase Storage
- CRUD complet pour les 7 types de documents (DAO, DRP, Caution bancaire, Courriers, PV réception, Ordre de service, Documents véhicules)
- Système de versioning automatique des documents
- Upload multiple de fichiers avec validation (taille, format)
- Prévisualisation intégrée (PDF, images)
- Métadonnées enrichies (phase marché, date validité, type document)
- Recherche et filtrage avancés (par type, marché, phase, période)
- Téléchargement sécurisé avec permissions
- Gestion des droits d'accès selon rôle utilisateur
- Interface responsive pour consultation mobile

## Capabilities

### New Capabilities

- `document-crud`: Gestion CRUD complète des documents (création, lecture, modification, suppression) avec validation et gestion d'erreurs
- `document-storage`: Intégration Supabase Storage pour upload/download sécurisé avec gestion des buckets et URL signées
- `document-versioning`: Système de versioning automatique conservant l'historique des modifications
- `document-preview`: Prévisualisation intégrée des documents PDF et images dans l'interface
- `document-ui`: Interface utilisateur complète pour la gestion documentaire (liste, upload, détails, filtres, recherche)
- `document-marche-relation`: Gestion de la relation entre documents et marchés publics (affichage par marché, upload depuis marché)
- `document-metadata`: Gestion des métadonnées (phase marché, date validité, catégorie, tags personnalisés)

### Modified Capabilities

- `database-schema`: Ajout du modèle Document avec relations vers Marche et User
- `marche-detail`: Modification de la page détail marché pour afficher section documents associés

## Impact

**Base de données**
- Ajout de la table `documents` avec schéma Prisma complet
- Ajout des enums `TypeDocument` et `PhaseMarche`
- Création d'index sur `type`, `marcheId`, `dateValidite`, `createdAt`
- Migration Prisma requise

**Infrastructure externe**
- Configuration Supabase Storage (bucket `marches-documents`)
- Variables d'environnement : NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- Politiques RLS (Row Level Security) sur Supabase pour sécurité
- Configuration CORS pour accès depuis Next.js

**Backend**
- Nouveaux Server Actions dans `lib/actions/documents.ts` (CRUD + Storage)
- Client Supabase dans `lib/supabase/client.ts` et `lib/supabase/server.ts`
- Schémas de validation Zod dans `lib/validations/document.ts`
- Utilitaires upload/download dans `lib/utils/document.ts`
- Gestion des URL signées pour téléchargement sécurisé

**Frontend**
- Nouvelle section `/documents` dans le dashboard
- Composants UI : `document-upload`, `document-list`, `document-preview`, `document-card`, `document-filters`
- Intégration dans la page détail marché (`/marches/[id]`) pour section documents
- Composants shadcn/ui : Table, Dialog, DropZone, Tabs, Badge, Calendar
- Composant de drag-and-drop pour upload multiples

**Dépendances nouvelles**
- `@supabase/supabase-js` : Client Supabase pour Storage
- `react-dropzone` : Upload par drag-and-drop (optionnel, peut utiliser input file natif)
- `react-pdf` : Prévisualisation PDF (optionnel pour MVP, peut utiliser iframe)

**Navigation**
- Ajout d'un item "Documents" dans le menu principal du dashboard
- Breadcrumbs pour navigation `/documents`, `/documents/[id]`
- Action rapide "Ajouter un document" depuis page détail marché

**Sécurité et permissions**
- Vérification des permissions dans Server Actions selon rôle utilisateur
- URL signées temporaires (expiration 1h) pour download sécurisé
- Validation des types MIME côté serveur (prévention upload malware)
- Limite de taille fichier : 10 MB par défaut, configurable
