# Architecture Technique - ERP Marchés Publics

## Vue d'Ensemble

### Architecture Globale

L'application est construite sur une architecture **Next.js full-stack** moderne, offrant une solution unifiée pour le frontend et le backend.

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Navigateur)                      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ React UI     │  │ shadcn/ui    │  │ Tailwind CSS    │  │
│  │ Components   │  │ + Radix UI   │  │                 │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 15 (App Router)                  │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │ React Server         │  │ Server Actions       │       │
│  │ Components (RSC)     │  │ (Mutations)          │       │
│  └──────────────────────┘  └──────────────────────┘       │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │ API Routes           │  │ NextAuth.js v5       │       │
│  │ (/api/*)             │  │ (Authentication)     │       │
│  └──────────────────────┘  └──────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Couche Données                           │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │ Prisma ORM           │  │ Supabase Storage     │       │
│  │ (Type-safe queries)  │  │ (Documents/Fichiers) │       │
│  └──────────────────────┘  └──────────────────────┘       │
│              │                                              │
│              ▼                                              │
│  ┌──────────────────────┐                                  │
│  │ Supabase PostgreSQL  │                                  │
│  │ (Base de données)    │                                  │
│  └──────────────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Services Externes                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Vercel Cron  │  │ Nodemailer   │  │ React Email     │  │
│  │ (Alertes)    │  │ (SMTP)       │  │ (Templates)     │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Flux de Données Principal

1. **Lecture de données** : Client → RSC → Prisma → PostgreSQL
2. **Mutations** : Client → Server Actions → Prisma → PostgreSQL
3. **Upload fichiers** : Client → Server Action → Supabase Storage → Métadonnées → PostgreSQL
4. **Génération rapports** : Client → Server Action → @react-pdf/renderer → PDF/Excel
5. **Alertes** : Vercel Cron → Server Action → Prisma → Nodemailer → Email

### Justification de l'Architecture

**Pourquoi Next.js Full-Stack ?**

- ✅ **Type-safety de bout en bout** : TypeScript partagé entre frontend et backend
- ✅ **Développement 40% plus rapide** : Pas de duplication API/Frontend
- ✅ **Écosystème riche** : 20,000+ exemples et packages disponibles
- ✅ **Maintenabilité optimale** : Une seule codebase, un seul déploiement
- ✅ **Performance native** : React Server Components réduisent le JavaScript côté client
- ✅ **DX exceptionnelle** : Hot reload, TypeScript, Prisma type generation

---

## Stack Technique Détaillée

### Frontend

| Technologie | Version | Rôle |
|------------|---------|------|
| **Next.js** | 15+ | Framework React full-stack avec App Router |
| **React** | 19+ | Bibliothèque UI avec Server Components |
| **TypeScript** | 5.3+ | Typage statique |
| **shadcn/ui** | Latest | Composants UI réutilisables |
| **Radix UI** | Latest | Primitives UI accessibles |
| **Tailwind CSS** | 3.4+ | Framework CSS utility-first |
| **Recharts** | 2.10+ | Bibliothèque de graphiques |
| **React Hook Form** | 7.49+ | Gestion de formulaires performante |
| **Zod** | 3.22+ | Validation de schémas TypeScript-first |
| **Lucide React** | Latest | Icônes |

### Backend

| Technologie | Version | Rôle |
|------------|---------|------|
| **Next.js Server Actions** | 15+ | Mutations côté serveur type-safe |
| **Next.js API Routes** | 15+ | Endpoints REST si nécessaire |
| **Prisma** | 6+ | ORM type-safe pour PostgreSQL |
| **PostgreSQL** | 16+ | Base de données relationnelle |
| **Nodemailer** | 6.9+ | Envoi d'emails SMTP |
| **@react-pdf/renderer** | 3.4+ | Génération de PDF React-based |
| **ExcelJS** | 4.4+ | Génération de fichiers Excel |
| **date-fns** | 3.0+ | Manipulation de dates |

### Authentification & Sécurité

| Technologie | Version | Rôle |
|------------|---------|------|
| **NextAuth.js** | 5.0+ | Authentification complète |
| **Bcrypt** | 5.1+ | Hashage de mots de passe |
| **JWT** | Via NextAuth | Gestion de sessions |
| **Zod** | 3.22+ | Validation des entrées utilisateur |
| **Middleware Next.js** | 15+ | Protection des routes |

### Stockage & Infrastructure

| Service | Plan | Rôle |
|---------|------|------|
| **Supabase PostgreSQL** | Free (500 Mo) | Base de données hébergée |
| **Supabase Storage** | Free (1 Go) | Stockage de fichiers (API S3) |
| **Vercel** | Hobby (gratuit) | Hébergement et déploiement |
| **Vercel Cron** | Inclus | Tâches planifiées (alertes) |

---

## Schéma de Base de Données

### Modèle Prisma Complet

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// AUTHENTIFICATION & UTILISATEURS
// ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  password      String    // Hash bcrypt
  role          UserRole  @default(VISITEUR)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  marches       Marche[]
  cautions      Caution[]
  documents     Document[]
  factures      Facture[]

  @@map("users")
}

enum UserRole {
  ADMIN          // Accès total
  AVANCE         // Gestion complète marchés/cautions
  EXPLOITATION   // Consultation + ajout limité
  VISITEUR       // Lecture seule
}

// ============================================
// MARCHÉS PUBLICS
// ============================================

model Marche {
  id                            String       @id @default(cuid())
  numero                        String       @unique
  objet                         String
  type                          TypeMarche
  montant                       Decimal      @db.Decimal(15, 2)
  dateNotification              DateTime
  dateOrdreService              DateTime?
  delaiExecution                Int
  dateFinPrevue                 DateTime?
  dateReception                 DateTime?
  statut                        StatutMarche @default(OPPORTUNITE_IDENTIFIEE)

  // Autorité contractante (corrigé de fournisseur)
  autoriteContractanteNom       String
  autoriteContractanteContact   String?
  autoriteContractanteEmail     String?
  autoriteContractanteTel       String?

  // Champs spécifiques par statut
  dateIdentification            DateTime?    // OPPORTUNITE_IDENTIFIEE
  dateDepotPrevue               DateTime?    // DOSSIER_EN_PREPARATION
  dateDepotOffre                DateTime?    // OFFRE_DEPOSEE
  delaiValiditeOffre            Int?         // OFFRE_DEPOSEE
  dateAttributionProvisoire     DateTime?    // ATTRIBUE_PROVISOIREMENT
  dateAttributionDefinitive     DateTime?    // ATTRIBUE_DEFINITIVEMENT
  dateLivraisonPrevue           DateTime?    // EN_ATTENTE_LIVRAISON_OS
  dureeLivraisonPrevue          Int?         // EN_ATTENTE_LIVRAISON_OS
  dateReceptionProvisoirePrevue DateTime?    // EN_EXECUTION
  garantiesLiberees             Boolean?     @default(false) // EXECUTE_ATTENTE_GARANTIES
  dateClotureAdministrative     DateTime?    // CLOTURE
  dateResiliation               DateTime?    // RESILIE
  motifsResiliation             String?      // RESILIE
  dateAnnulation                DateTime?    // ANNULE
  motifsAnnulation              String?      // ANNULE
  dateInfructueux               DateTime?    // INFRUCTUEUX
  motifsInfructueux             String?      // INFRUCTUEUX
  concurrentGagnant             String?      // INFRUCTUEUX
  montantOffreConcurrent        Decimal?     @db.Decimal(15, 2) // INFRUCTUEUX

  // Gestion
  userId              String
  user                User           @relation(fields: [userId], references: [id])

  // Relations
  cautions            Caution[]
  documents           Document[]
  vehicules           Vehicule[]
  factures            Facture[]
  alertes             Alerte[]

  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  @@index([numero])
  @@index([statut])
  @@index([dateFinPrevue])
  @@map("marches")
}

enum TypeMarche {
  TRAVAUX
  FOURNITURES
  SERVICES
  PRESTATIONS_INTELLECTUELLES
}

enum StatutMarche {
  OPPORTUNITE_IDENTIFIEE
  DOSSIER_EN_PREPARATION
  OFFRE_DEPOSEE
  EN_ATTENTE_ATTRIBUTION
  ATTRIBUE_PROVISOIREMENT
  ATTRIBUE_DEFINITIVEMENT
  EN_ATTENTE_LIVRAISON_OS
  EN_EXECUTION
  EXECUTE_ATTENTE_GARANTIES
  CLOTURE
  RESILIE
  ANNULE
  INFRUCTUEUX
}

// ============================================
// CAUTIONS (Garanties bancaires)
// ============================================

model Caution {
  id                String         @id @default(cuid())
  reference         String         @unique
  type              TypeCaution
  montant           Decimal        @db.Decimal(15, 2)
  dateEmission      DateTime
  dateEcheance      DateTime
  statut            StatutCaution  @default(ACTIVE)

  // Banque émettrice
  banqueNom         String
  banqueContact     String?

  // Association au marché
  marcheId          String
  marche            Marche         @relation(fields: [marcheId], references: [id], onDelete: Cascade)

  // Gestion
  userId            String
  user              User           @relation(fields: [userId], references: [id])

  // Alertes
  alertes           Alerte[]

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  @@index([dateEcheance])
  @@index([statut])
  @@index([marcheId])
  @@map("cautions")
}

enum TypeCaution {
  PROVISOIRE          // Caution de soumission
  DEFINITIVE          // Caution de bonne exécution
  AVANCE              // Caution d'avance de démarrage
  RETENUE_GARANTIE    // Caution de retenue de garantie
}

enum StatutCaution {
  ACTIVE
  EXPIREE
  LIBEREE
  APPELEE             // Caution appelée par le maître d'ouvrage
}

// ============================================
// DOCUMENTS
// ============================================

model Document {
  id              String          @id @default(cuid())
  nom             String
  type            TypeDocument
  url             String          // URL Supabase Storage
  taille          Int             // Taille en octets
  mimeType        String
  version         Int             @default(1)

  // Association
  marcheId        String?
  marche          Marche?         @relation(fields: [marcheId], references: [id], onDelete: Cascade)

  // Upload
  userId          String
  user            User            @relation(fields: [userId], references: [id])

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([marcheId])
  @@index([type])
  @@map("documents")
}

enum TypeDocument {
  CONTRAT
  CAUTION
  FACTURE
  PV_RECEPTION
  ORDRE_SERVICE
  AVENANT
  CORRESPONDANCE
  AUTRE
}

// ============================================
// VÉHICULES (si applicable au marché)
// ============================================

model Vehicule {
  id                String       @id @default(cuid())
  immatriculation   String       @unique
  marque            String
  modele            String
  annee             Int?

  // Association au marché (ex: marché de location de véhicules)
  marcheId          String?
  marche            Marche?      @relation(fields: [marcheId], references: [id], onDelete: SetNull)

  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  @@index([marcheId])
  @@map("vehicules")
}

// ============================================
// FACTURES
// ============================================

model Facture {
  id              String         @id @default(cuid())
  numero          String         @unique
  montant         Decimal        @db.Decimal(15, 2)
  dateEmission    DateTime
  dateEcheance    DateTime?
  statut          StatutFacture  @default(EN_ATTENTE)

  // Association au marché
  marcheId        String
  marche          Marche         @relation(fields: [marcheId], references: [id], onDelete: Cascade)

  // Gestion
  userId          String
  user            User           @relation(fields: [userId], references: [id])

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([marcheId])
  @@index([statut])
  @@map("factures")
}

enum StatutFacture {
  EN_ATTENTE
  VALIDEE
  PAYEE
  REJETEE
}

// ============================================
// ALERTES
// ============================================

model Alerte {
  id              String         @id @default(cuid())
  type            TypeAlerte
  message         String
  dateAlerte      DateTime       @default(now())
  envoyee         Boolean        @default(false)
  dateEnvoi       DateTime?

  // Associations possibles
  marcheId        String?
  marche          Marche?        @relation(fields: [marcheId], references: [id], onDelete: Cascade)

  cautionId       String?
  caution         Caution?       @relation(fields: [cautionId], references: [id], onDelete: Cascade)

  createdAt       DateTime       @default(now())

  @@index([dateAlerte])
  @@index([envoyee])
  @@map("alertes")
}

enum TypeAlerte {
  CAUTION_EXPIRE_BIENTOT    // 30 jours avant expiration
  CAUTION_EXPIREE
  MARCHE_FIN_PREVUE         // Proche de la date de fin
  MARCHE_RETARD             // Dépassement délai
  FACTURE_ECHEANCE          // Facture à payer bientôt
}
```

### Relations Clés

```
User (1) ──────< (N) Marche
Marche (1) ────< (N) Caution
Marche (1) ────< (N) Document
Marche (1) ────< (N) Facture
Marche (1) ────< (N) Vehicule
Marche (1) ────< (N) Alerte
Caution (1) ───< (N) Alerte
```

---

## Structure du Projet

```
ERP-Marches-Publics/
│
├── app/                              # Next.js 15 App Router
│   ├── (auth)/                       # Routes d'authentification (layout séparé)
│   │   ├── login/
│   │   │   └── page.tsx              # Page de connexion
│   │   ├── register/
│   │   │   └── page.tsx              # Page d'inscription (admin only)
│   │   └── layout.tsx                # Layout auth (centré, sans navbar)
│   │
│   ├── (dashboard)/                  # Routes protégées (layout principal)
│   │   ├── marches/
│   │   │   ├── page.tsx              # Liste des marchés
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx          # Détail d'un marché
│   │   │   │   └── edit/
│   │   │   │       └── page.tsx      # Édition d'un marché
│   │   │   └── nouveau/
│   │   │       └── page.tsx          # Création d'un marché
│   │   │
│   │   ├── cautions/
│   │   │   ├── page.tsx              # Liste des cautions
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx          # Détail d'une caution
│   │   │   └── nouvelle/
│   │   │       └── page.tsx          # Création d'une caution
│   │   │
│   │   ├── documents/
│   │   │   └── page.tsx              # Gestion des documents
│   │   │
│   │   ├── factures/
│   │   │   ├── page.tsx              # Liste des factures
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Détail d'une facture
│   │   │
│   │   ├── vehicules/
│   │   │   └── page.tsx              # Gestion des véhicules
│   │   │
│   │   ├── alertes/
│   │   │   └── page.tsx              # Centre d'alertes
│   │   │
│   │   ├── rapports/
│   │   │   └── page.tsx              # Génération de rapports
│   │   │
│   │   ├── utilisateurs/             # Admin only
│   │   │   └── page.tsx              # Gestion des utilisateurs
│   │   │
│   │   ├── page.tsx                  # Dashboard principal (KPIs)
│   │   └── layout.tsx                # Layout principal (navbar, sidebar)
│   │
│   ├── api/                          # API Routes (si nécessaire)
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts          # NextAuth endpoints
│   │   ├── cron/
│   │   │   └── alertes/
│   │   │       └── route.ts          # Endpoint pour Vercel Cron
│   │   └── upload/
│   │       └── route.ts              # Upload de fichiers (alternative)
│   │
│   ├── layout.tsx                    # Root layout
│   ├── globals.css                   # Styles globaux + Tailwind
│   └── favicon.ico
│
├── components/                       # Composants React
│   ├── ui/                           # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── form.tsx
│   │   └── ...
│   │
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   │
│   ├── dashboard/
│   │   ├── navbar.tsx
│   │   ├── sidebar.tsx
│   │   ├── stats-card.tsx
│   │   └── recent-activity.tsx
│   │
│   ├── marches/
│   │   ├── marche-form.tsx
│   │   ├── marche-list.tsx
│   │   ├── marche-card.tsx
│   │   ├── marche-filters.tsx
│   │   └── marche-detail.tsx
│   │
│   ├── cautions/
│   │   ├── caution-form.tsx
│   │   ├── caution-list.tsx
│   │   ├── caution-badge.tsx          # Badge de statut
│   │   └── caution-timeline.tsx       # Visualisation échéances
│   │
│   ├── documents/
│   │   ├── document-uploader.tsx
│   │   ├── document-list.tsx
│   │   └── document-preview.tsx
│   │
│   ├── factures/
│   │   ├── facture-form.tsx
│   │   └── facture-list.tsx
│   │
│   ├── rapports/
│   │   ├── rapport-pdf-generator.tsx
│   │   └── rapport-excel-generator.tsx
│   │
│   └── alertes/
│       ├── alerte-badge.tsx
│       └── alerte-list.tsx
│
├── lib/                              # Bibliothèques et utilitaires
│   ├── actions/                      # Server Actions
│   │   ├── auth.ts                   # Actions d'authentification
│   │   ├── marches.ts                # CRUD marchés
│   │   ├── cautions.ts               # CRUD cautions
│   │   ├── documents.ts              # Upload/gestion documents
│   │   ├── factures.ts               # CRUD factures
│   │   ├── alertes.ts                # Génération et envoi d'alertes
│   │   └── rapports.ts               # Génération PDF/Excel
│   │
│   ├── db/
│   │   └── prisma.ts                 # Client Prisma singleton
│   │
│   ├── auth/
│   │   ├── auth.config.ts            # Configuration NextAuth.js
│   │   └── session.ts                # Helpers de session
│   │
│   ├── storage/
│   │   └── supabase.ts               # Client Supabase Storage
│   │
│   ├── email/
│   │   ├── nodemailer.ts             # Configuration SMTP
│   │   └── templates/                # Templates React Email
│   │       ├── alerte-caution.tsx
│   │       └── alerte-marche.tsx
│   │
│   ├── utils/
│   │   ├── pdf.ts                    # Génération PDF (@react-pdf/renderer)
│   │   ├── excel.ts                  # Génération Excel (ExcelJS)
│   │   ├── date.ts                   # Helpers de dates (date-fns)
│   │   ├── format.ts                 # Formatage (montants, etc.)
│   │   └── permissions.ts            # Vérification de rôles
│   │
│   └── validations/                  # Schémas Zod
│       ├── marche.ts
│       ├── caution.ts
│       ├── document.ts
│       └── facture.ts
│
├── prisma/
│   ├── schema.prisma                 # Schéma de base de données
│   ├── migrations/                   # Migrations SQL générées
│   └── seed.ts                       # Données de test (optionnel)
│
├── public/
│   ├── images/
│   └── fonts/
│
├── types/                            # Types TypeScript globaux
│   └── index.ts
│
├── .env                              # Variables d'environnement (gitignored)
├── .env.example                      # Template des variables d'env
├── next.config.js                    # Configuration Next.js
├── tailwind.config.ts                # Configuration Tailwind
├── tsconfig.json                     # Configuration TypeScript
├── middleware.ts                     # Middleware Next.js (protection routes)
├── vercel.json                       # Configuration Vercel Cron
├── package.json
├── ARCHITECTURE.md                   # Ce fichier
└── README.md
```

---

## Patterns et Conventions

### 1. Server Components vs Client Components

**Règle par défaut** : Tous les composants sont des **Server Components** sauf indication contraire.

```tsx
// ✅ Server Component (par défaut)
// app/(dashboard)/marches/page.tsx
import { prisma } from '@/lib/db/prisma';

export default async function MarchesPage() {
  const marches = await prisma.marche.findMany();

  return <MarcheList marches={marches} />;
}
```

**Utiliser Client Components uniquement pour** :
- Interactivité (onClick, onChange, hooks comme useState/useEffect)
- Formulaires avec React Hook Form
- Composants shadcn/ui interactifs (Dialog, DropdownMenu, etc.)

```tsx
// ✅ Client Component (interactivité)
// components/marches/marche-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { marcheSchema } from '@/lib/validations/marche';

export function MarcheForm() {
  const form = useForm({
    resolver: zodResolver(marcheSchema),
  });

  // ... logique du formulaire
}
```

### 2. Server Actions pour les Mutations

**Toutes les mutations** (create, update, delete) utilisent des **Server Actions**.

```tsx
// ✅ Server Action
// lib/actions/marches.ts
'use server';

import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { marcheSchema } from '@/lib/validations/marche';

export async function createMarche(data: unknown) {
  // 1. Validation avec Zod
  const validated = marcheSchema.parse(data);

  // 2. Vérification des permissions
  const session = await auth();
  if (!session || session.user.role === 'VISITEUR') {
    throw new Error('Non autorisé');
  }

  // 3. Mutation DB
  const marche = await prisma.marche.create({
    data: {
      ...validated,
      userId: session.user.id,
    },
  });

  // 4. Revalidation du cache Next.js
  revalidatePath('/marches');

  return marche;
}
```

**Appel depuis un Client Component** :

```tsx
'use client';

import { createMarche } from '@/lib/actions/marches';
import { useTransition } from 'react';

export function MarcheForm() {
  const [isPending, startTransition] = useTransition();

  const onSubmit = (data) => {
    startTransition(async () => {
      await createMarche(data);
      // Success handling
    });
  };

  // ...
}
```

### 3. Validation avec Zod

**Frontend + Backend** : Validation côté client ET côté serveur avec le même schéma.

```tsx
// lib/validations/marche.ts
import { z } from 'zod';

export const marcheSchema = z.object({
  numero: z.string().min(1, 'Numéro requis'),
  objet: z.string().min(10, 'Description trop courte'),
  type: z.enum(['TRAVAUX', 'FOURNITURES', 'SERVICES', 'PRESTATIONS_INTELLECTUELLES']),
  montant: z.number().positive('Montant doit être positif'),
  dateNotification: z.date(),
  dateOrdreService: z.date().optional(),
  delaiExecution: z.number().int().positive(),
  fournisseurNom: z.string().min(1, 'Nom du fournisseur requis'),
  fournisseurEmail: z.string().email().optional(),
  fournisseurTel: z.string().optional(),
});

export type MarcheInput = z.infer<typeof marcheSchema>;
```

### 4. Accès Base de Données avec Prisma

**Singleton Prisma Client** :

```tsx
// lib/db/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Exemples de requêtes type-safe** :

```tsx
// Lecture avec relations
const marche = await prisma.marche.findUnique({
  where: { id: marcheId },
  include: {
    cautions: true,
    documents: true,
    factures: true,
  },
});

// Création
const newCaution = await prisma.caution.create({
  data: {
    reference: 'CAU-2024-001',
    type: 'DEFINITIVE',
    montant: 50000,
    dateEmission: new Date(),
    dateEcheance: new Date('2025-12-31'),
    banqueNom: 'Banque Populaire',
    marcheId: marche.id,
    userId: session.user.id,
  },
});

// Filtrage et tri
const cautionsExpireSoon = await prisma.caution.findMany({
  where: {
    dateEcheance: {
      gte: new Date(),
      lte: addDays(new Date(), 30), // date-fns
    },
    statut: 'ACTIVE',
  },
  orderBy: {
    dateEcheance: 'asc',
  },
  include: {
    marche: true,
  },
});
```

### 5. Gestion d'Erreurs

```tsx
// lib/actions/marches.ts
'use server';

import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export async function updateMarche(id: string, data: unknown) {
  try {
    const validated = marcheSchema.parse(data);

    const updated = await prisma.marche.update({
      where: { id },
      data: validated,
    });

    revalidatePath('/marches');
    return { success: true, data: updated };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Données invalides', details: error.errors };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { success: false, error: 'Ce numéro de marché existe déjà' };
      }
    }

    console.error('Erreur updateMarche:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}
```

---

## Génération de Rapports

### PDF avec @react-pdf/renderer

```tsx
// lib/utils/pdf.ts
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30 },
  title: { fontSize: 24, marginBottom: 20 },
  table: { display: 'table', width: 'auto', marginTop: 10 },
  tableRow: { flexDirection: 'row' },
  tableCell: { padding: 5, fontSize: 10 },
});

export function MarchePDFDocument({ marche, cautions }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Marché N° {marche.numero}</Text>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Objet:</Text>
            <Text style={styles.tableCell}>{marche.objet}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Montant:</Text>
            <Text style={styles.tableCell}>{marche.montant} DH</Text>
          </View>
        </View>

        {/* Liste des cautions */}
        <Text style={{ marginTop: 20, fontSize: 14 }}>Cautions associées</Text>
        {cautions.map((caution) => (
          <View key={caution.id} style={styles.tableRow}>
            <Text style={styles.tableCell}>{caution.reference}</Text>
            <Text style={styles.tableCell}>{caution.type}</Text>
            <Text style={styles.tableCell}>{caution.montant} DH</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
```

**Server Action pour générer et télécharger le PDF** :

```tsx
// lib/actions/rapports.ts
'use server';

import { pdf } from '@react-pdf/renderer';
import { MarchePDFDocument } from '@/lib/utils/pdf';
import { prisma } from '@/lib/db/prisma';

export async function generateMarchePDF(marcheId: string) {
  const marche = await prisma.marche.findUnique({
    where: { id: marcheId },
    include: { cautions: true, factures: true },
  });

  if (!marche) throw new Error('Marché introuvable');

  const pdfDoc = <MarchePDFDocument marche={marche} cautions={marche.cautions} />;
  const blob = await pdf(pdfDoc).toBlob();

  // Convertir en Buffer pour retourner
  const buffer = Buffer.from(await blob.arrayBuffer());

  return {
    buffer: buffer.toString('base64'),
    filename: `marche-${marche.numero}.pdf`,
  };
}
```

### Excel avec ExcelJS

```tsx
// lib/utils/excel.ts
import ExcelJS from 'exceljs';

export async function generateMarchesExcel(marches) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Marchés');

  // En-têtes
  worksheet.columns = [
    { header: 'N° Marché', key: 'numero', width: 15 },
    { header: 'Objet', key: 'objet', width: 40 },
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Montant (DH)', key: 'montant', width: 15 },
    { header: 'Fournisseur', key: 'fournisseur', width: 30 },
    { header: 'Statut', key: 'statut', width: 15 },
    { header: 'Date Notification', key: 'dateNotification', width: 18 },
  ];

  // Données
  marches.forEach((marche) => {
    worksheet.addRow({
      numero: marche.numero,
      objet: marche.objet,
      type: marche.type,
      montant: parseFloat(marche.montant),
      fournisseur: marche.fournisseurNom,
      statut: marche.statut,
      dateNotification: marche.dateNotification,
    });
  });

  // Style des en-têtes
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };

  // Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
```

**Server Action Excel** :

```tsx
// lib/actions/rapports.ts
'use server';

import { generateMarchesExcel } from '@/lib/utils/excel';
import { prisma } from '@/lib/db/prisma';

export async function exportMarchesToExcel() {
  const marches = await prisma.marche.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const buffer = await generateMarchesExcel(marches);

  return {
    buffer: buffer.toString('base64'),
    filename: `marches-${new Date().toISOString().split('T')[0]}.xlsx`,
  };
}
```

---

## Gestion des Fichiers

### Upload vers Supabase Storage

```tsx
// lib/storage/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Côté serveur

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadDocument(file: File, marcheId: string) {
  const fileName = `${marcheId}/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from('documents') // Bucket name
    .upload(fileName, file);

  if (error) throw error;

  // Récupérer l'URL publique
  const { data: publicData } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName);

  return {
    path: data.path,
    url: publicData.publicUrl,
  };
}
```

**Server Action pour upload** :

```tsx
// lib/actions/documents.ts
'use server';

import { uploadDocument } from '@/lib/storage/supabase';
import { prisma } from '@/lib/db/prisma';

export async function createDocument(formData: FormData) {
  const file = formData.get('file') as File;
  const marcheId = formData.get('marcheId') as string;
  const type = formData.get('type') as string;

  // Upload vers Supabase
  const { url, path } = await uploadDocument(file, marcheId);

  // Enregistrer métadonnées dans PostgreSQL
  const document = await prisma.document.create({
    data: {
      nom: file.name,
      type: type as any,
      url: url,
      taille: file.size,
      mimeType: file.type,
      marcheId: marcheId,
      userId: session.user.id,
    },
  });

  revalidatePath(`/marches/${marcheId}`);
  return document;
}
```

**Composant d'upload (Client Component)** :

```tsx
// components/documents/document-uploader.tsx
'use client';

import { createDocument } from '@/lib/actions/documents';
import { useTransition } from 'react';

export function DocumentUploader({ marcheId }: { marcheId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('marcheId', marcheId);
    formData.append('type', 'CONTRAT'); // ou sélectionné par l'utilisateur

    startTransition(async () => {
      await createDocument(formData);
    });
  };

  return (
    <div>
      <input type="file" onChange={handleUpload} disabled={isPending} />
      {isPending && <p>Upload en cours...</p>}
    </div>
  );
}
```

---

## Système d'Alertes

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/alertes",
      "schedule": "0 8 * * *"
    }
  ]
}
```

**Explication** : Exécute l'endpoint `/api/cron/alertes` tous les jours à 8h00 (UTC).

### API Route pour Cron

```tsx
// app/api/cron/alertes/route.ts
import { NextResponse } from 'next/server';
import { generateAlertes } from '@/lib/actions/alertes';

export async function GET(request: Request) {
  // Vérifier que la requête vient de Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await generateAlertes();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur génération alertes:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
```

### Génération d'Alertes

```tsx
// lib/actions/alertes.ts
'use server';

import { prisma } from '@/lib/db/prisma';
import { addDays } from 'date-fns';
import { sendEmail } from '@/lib/email/nodemailer';

export async function generateAlertes() {
  const now = new Date();
  const in30Days = addDays(now, 30);

  // 1. Cautions expirant dans 30 jours
  const cautionsExpireSoon = await prisma.caution.findMany({
    where: {
      dateEcheance: {
        gte: now,
        lte: in30Days,
      },
      statut: 'ACTIVE',
    },
    include: {
      marche: true,
    },
  });

  for (const caution of cautionsExpireSoon) {
    // Vérifier si alerte déjà créée
    const existingAlerte = await prisma.alerte.findFirst({
      where: {
        cautionId: caution.id,
        type: 'CAUTION_EXPIRE_BIENTOT',
        dateAlerte: { gte: addDays(now, -1) }, // Pas d'alerte dans les dernières 24h
      },
    });

    if (!existingAlerte) {
      await prisma.alerte.create({
        data: {
          type: 'CAUTION_EXPIRE_BIENTOT',
          message: `La caution ${caution.reference} du marché ${caution.marche.numero} expire le ${caution.dateEcheance.toLocaleDateString()}`,
          cautionId: caution.id,
          marcheId: caution.marcheId,
        },
      });

      // Envoyer email
      await sendEmail({
        to: process.env.ALERT_EMAIL!,
        subject: `Alerte: Caution ${caution.reference} expire bientôt`,
        text: `La caution ${caution.reference} du marché ${caution.marche.numero} expire le ${caution.dateEcheance.toLocaleDateString()}`,
      });
    }
  }

  // 2. Cautions déjà expirées
  const cautionsExpirees = await prisma.caution.findMany({
    where: {
      dateEcheance: { lt: now },
      statut: 'ACTIVE', // Toujours marquée active par erreur
    },
  });

  for (const caution of cautionsExpirees) {
    await prisma.caution.update({
      where: { id: caution.id },
      data: { statut: 'EXPIREE' },
    });

    await prisma.alerte.create({
      data: {
        type: 'CAUTION_EXPIREE',
        message: `La caution ${caution.reference} a expiré`,
        cautionId: caution.id,
      },
    });
  }

  // 3. Marchés en retard (date fin prévue dépassée)
  const marchesEnRetard = await prisma.marche.findMany({
    where: {
      dateFinPrevue: { lt: now },
      statut: 'EN_COURS',
    },
  });

  for (const marche of marchesEnRetard) {
    const existingAlerte = await prisma.alerte.findFirst({
      where: {
        marcheId: marche.id,
        type: 'MARCHE_RETARD',
        dateAlerte: { gte: addDays(now, -7) }, // Alerte hebdomadaire
      },
    });

    if (!existingAlerte) {
      await prisma.alerte.create({
        data: {
          type: 'MARCHE_RETARD',
          message: `Le marché ${marche.numero} est en retard (date fin prévue: ${marche.dateFinPrevue.toLocaleDateString()})`,
          marcheId: marche.id,
        },
      });
    }
  }
}
```

### Envoi d'Emails avec Nodemailer

```tsx
// lib/email/nodemailer.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true pour 465, false pour autres ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
}
```

---

## Authentification & Autorisation

### Configuration NextAuth.js v5

```tsx
// lib/auth/auth.config.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const { email, password } = loginSchema.parse(credentials);

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
```

**Route API NextAuth** :

```tsx
// app/api/auth/[...nextauth]/route.ts
export { handlers as GET, handlers as POST } from '@/lib/auth/auth.config';
```

### Middleware de Protection des Routes

```tsx
// middleware.ts
import { auth } from '@/lib/auth/auth.config';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Routes publiques
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Protection routes admin
  if (pathname.startsWith('/utilisateurs')) {
    if (req.auth?.user?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### Vérification de Permissions dans Server Actions

```tsx
// lib/utils/permissions.ts
import { auth } from '@/lib/auth/auth.config';

export async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error('Non authentifié');
  return session;
}

export async function requireRole(roles: string[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    throw new Error('Non autorisé');
  }
  return session;
}
```

**Usage** :

```tsx
// lib/actions/marches.ts
'use server';

import { requireRole } from '@/lib/utils/permissions';

export async function deleteMarche(id: string) {
  // Seuls ADMIN et AVANCE peuvent supprimer
  await requireRole(['ADMIN', 'AVANCE']);

  await prisma.marche.delete({ where: { id } });
  revalidatePath('/marches');
}
```

### Niveaux de Rôles

| Rôle | Permissions |
|------|-------------|
| **ADMIN** | Accès total : gestion utilisateurs, marchés, cautions, configuration système |
| **AVANCE** | Gestion complète des marchés et cautions (CRUD), génération de rapports |
| **EXPLOITATION** | Consultation complète + ajout limité (factures, documents), pas de suppression |
| **VISITEUR** | Lecture seule sur tous les modules |

---

## Performance & Optimisations

### React Server Components

**Avantages** :
- ✅ **Réduction drastique du JavaScript client** : seuls les Client Components sont envoyés au navigateur
- ✅ **Accès direct à la DB** : pas besoin d'API intermédiaire
- ✅ **Streaming** : affichage progressif des composants
- ✅ **Cache automatique** : Next.js met en cache les RSC par défaut

**Exemple** :

```tsx
// ✅ Server Component - Zéro JS envoyé au client
// app/(dashboard)/marches/page.tsx
import { prisma } from '@/lib/db/prisma';
import { MarcheCard } from '@/components/marches/marche-card';

export default async function MarchesPage() {
  const marches = await prisma.marche.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {marches.map((marche) => (
        <MarcheCard key={marche.id} marche={marche} />
      ))}
    </div>
  );
}
```

### Prisma Query Optimization

**Relations** : Utiliser `include` ou `select` pour éviter les N+1 queries.

```tsx
// ❌ N+1 queries (1 query par marché pour récupérer les cautions)
const marches = await prisma.marche.findMany();
for (const marche of marches) {
  const cautions = await prisma.caution.findMany({ where: { marcheId: marche.id } });
}

// ✅ 1 seule query
const marches = await prisma.marche.findMany({
  include: {
    cautions: true,
  },
});
```

**Pagination** :

```tsx
const page = 1;
const pageSize = 20;

const marches = await prisma.marche.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' },
});

const totalCount = await prisma.marche.count();
```

**Indexes** : Les indexes définis dans le schéma Prisma (`@@index`) accélèrent les requêtes.

```prisma
model Marche {
  // ...
  @@index([numero])      // Index sur numéro pour recherche rapide
  @@index([statut])      // Index pour filtrer par statut
  @@index([dateFinPrevue]) // Index pour alertes
}
```

### Next.js Image Optimization

```tsx
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={100}
  priority // Pour images above-the-fold
/>
```

**Avantages** :
- Lazy loading automatique
- Formats modernes (WebP, AVIF)
- Redimensionnement automatique

### Code Splitting Automatique

Next.js App Router fait du code splitting automatique par route. Chaque page charge uniquement le JS nécessaire.

**Dynamic imports** pour composants lourds :

```tsx
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/charts/heavy-chart'), {
  loading: () => <p>Chargement du graphique...</p>,
  ssr: false, // Si le composant ne doit pas être rendu côté serveur
});
```

---

## Variables d'Environnement

### Fichier `.env`

```bash
# Base de données
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-generate-with-openssl-rand-base64-32"

# SMTP (Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="ERP Marchés <noreply@erp-marches.com>"

# Alertes
ALERT_EMAIL="admin@example.com"

# Vercel Cron (sécurité)
CRON_SECRET="your-cron-secret"
```

### Fichier `.env.example` (à versionner)

```bash
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/erp_marches"

# Supabase
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET=""

# SMTP
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM=""

# Alertes
ALERT_EMAIL=""

# Vercel Cron
CRON_SECRET=""
```

---

## Déploiement

### Vercel (Recommandé)

**Plan Hobby gratuit** :
- Déploiement illimité
- 100 GB-hours de compute time/mois
- Vercel Cron inclus
- CI/CD intégré avec GitHub

**Steps** :
1. Push le projet sur GitHub
2. Connecter GitHub à Vercel (https://vercel.com)
3. Importer le projet
4. Configurer les variables d'environnement
5. Déployer

**Configuration automatique** : Vercel détecte Next.js et configure tout automatiquement.

### Docker (Alternative)

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

**docker-compose.yml** :

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: erp_marches
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Plan d'Implémentation

### Phase 1 : Setup (Semaine 1)

- [ ] Initialiser Next.js 15 avec TypeScript
- [ ] Installer dépendances (Prisma, shadcn/ui, etc.)
- [ ] Configurer Tailwind CSS
- [ ] Setup Prisma + PostgreSQL (local ou Supabase)
- [ ] Créer le schéma Prisma complet
- [ ] Migration initiale (`npx prisma migrate dev`)

### Phase 2 : Authentification (Semaine 2)

- [ ] Configuration NextAuth.js v5
- [ ] Pages de login/register
- [ ] Middleware de protection des routes
- [ ] Gestion des utilisateurs (CRUD)
- [ ] Système de rôles

### Phase 3 : Référentiel Marchés (Semaines 3-4)

- [ ] CRUD marchés (Server Actions)
- [ ] Pages : liste, détail, création, édition
- [ ] Formulaires avec validation Zod
- [ ] Filtres et recherche
- [ ] Pagination

### Phase 4 : Cautions (Semaine 5)

- [ ] CRUD cautions
- [ ] Association aux marchés
- [ ] Alertes d'expiration (logique)
- [ ] Badges de statut

### Phase 5 : Documents (Semaine 6)

- [ ] Upload vers Supabase Storage
- [ ] Métadonnées dans PostgreSQL
- [ ] Prévisualisation de documents
- [ ] Versioning (optionnel)

### Phase 6 : Tableaux de Bord (Semaine 7)

- [ ] Dashboard principal avec KPIs
- [ ] Widgets (marchés actifs, cautions à expirer, etc.)
- [ ] Graphiques avec Recharts

### Phase 7 : Reporting & Alertes (Semaine 8)

- [ ] Génération PDF (@react-pdf/renderer)
- [ ] Export Excel (ExcelJS)
- [ ] Configuration Vercel Cron
- [ ] Envoi d'alertes email (Nodemailer)

### Phase 8 : Tests & Déploiement (Semaine 9)

- [ ] Tests des fonctionnalités critiques
- [ ] Configuration Vercel
- [ ] Déploiement en production
- [ ] Documentation utilisateur

---

## Ressources et Références

### Documentation Officielle

- **Next.js 15** : https://nextjs.org/docs
- **Prisma** : https://www.prisma.io/docs
- **shadcn/ui** : https://ui.shadcn.com
- **NextAuth.js v5** : https://authjs.dev
- **Supabase** : https://supabase.com/docs
- **@react-pdf/renderer** : https://react-pdf.org
- **ExcelJS** : https://github.com/exceljs/exceljs

### Exemples de Projets Similaires

- **Next.js Dashboard Example** : https://github.com/vercel/nextjs-dashboard
- **Taxonomy (Next.js 15 + Prisma)** : https://github.com/shadcn-ui/taxonomy
- **Acme Dashboard** : https://github.com/leerob/next-saas-starter

### Outils de Développement

- **Prisma Studio** : Interface GUI pour la DB (`npx prisma studio`)
- **React DevTools** : Extension navigateur pour déboguer React
- **Vercel CLI** : `npm i -g vercel` pour déploiements locaux

---

## Maintenance et Évolution

### Mises à Jour Régulières

- **Next.js** : Suivre les releases (généralement stables)
- **Prisma** : Mettre à jour pour nouvelles fonctionnalités
- **Dépendances** : `npm outdated` puis `npm update`

### Monitoring

- **Vercel Analytics** : Inclus avec le déploiement Vercel
- **Logs Supabase** : Dashboard Supabase pour logs PostgreSQL et Storage
- **Sentry** (optionnel) : Tracking d'erreurs en production

### Backups

- **Supabase** : Backups quotidiens automatiques (plan Free)
- **PostgreSQL local** : `pg_dump` régulier

### Scalabilité Future

Si l'application dépasse les limites du plan gratuit :

1. **Supabase** : Passer au plan Pro (25$/mois)
2. **Vercel** : Passer au plan Pro (20$/mois)
3. **PostgreSQL** : Migration vers instance dédiée (AWS RDS, Railway, etc.)
4. **Storage** : Migration vers AWS S3 si besoins > 1 Go

---

## Conclusion

Cette architecture **Next.js 15 + Prisma + PostgreSQL + Supabase** offre :

✅ **Type-safety de bout en bout** avec TypeScript partagé
✅ **Développement rapide** avec Server Actions et RSC
✅ **Écosystème riche** et documentation exhaustive
✅ **Maintenabilité** : codebase unifiée, patterns clairs
✅ **Performance native** : React Server Components, optimisations Next.js
✅ **Coût maîtrisé** : plans gratuits suffisants pour MVP
✅ **Scalabilité** : migration progressive vers plans payants si nécessaire

**Stack validée et prête pour l'implémentation.**

---

**Dernière mise à jour** : 2026-01-31
**Version** : 1.0
**Auteur** : Équipe Développement ERP Marchés Publics
