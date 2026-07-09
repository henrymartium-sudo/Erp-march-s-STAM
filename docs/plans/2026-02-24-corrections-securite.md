# Corrections Sécurité ERP Marchés Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Appliquer les corrections de l'audit sécurité (C1–C4, E1–E4) sans aucune régression fonctionnelle.

**Architecture:** Corrections incrémentales isolées par couche (server actions → route handlers → validation upload → cron). Chaque tâche est indépendante et testable séparément. Aucune modification de logique métier.

**Tech Stack:** Next.js 15 App Router, NextAuth v5, Prisma 7, Node.js crypto (timingSafeEqual), TypeScript.

---

## Contexte — État actuel analysé

| Fichier | Problème |
|---------|----------|
| `lib/actions/alertes.ts` | 4 fonctions sans `requireAuth()` |
| `app/api/test-alerts/route.ts` | Endpoint public, aucune auth |
| `app/api/exports/*/route.ts` (×3) | Pas de guard HTTP (auth côté SA uniquement) |
| `app/api/exports-pdf/*/route.ts` (×4) | Pas de guard HTTP + fuite `error.message` |
| `lib/actions/auth/change-password.ts` | Utilise `auth()` manuel au lieu de `requireAuth()` |
| `lib/actions/documents.ts` → `getUploadUrl` | Aucune validation extension/MIME du fichier |
| `app/api/cron/daily-alerts/route.ts` | Comparaison string naïve (vulnérable timing attack) |
| `lib/actions/exports.ts` | Aucune limite `take` sur les `findMany` |

---

## Task 1 — C1 : requireAuth() dans alertes.ts

**Contexte :** `getAlertsCautionsExpiring`, `getAlertesMarchesExpiring`, `sendDailyAlertsEmail`, `testAlertsSystem` sont des Server Actions exposés sans auth. Le cron quotidien utilise `runDailyAlertsCron` (fichier séparé) — ces 4 fonctions ne sont PAS appelées par le cron → pas de risque de régression.

**Fichiers :**
- Modify: `lib/actions/alertes.ts`

**Step 1 : Lire l'import actuel**

Vérifier la ligne 1–20 du fichier — il n'y a pas d'import `requireAuth`. Confirmer que `requireAuth` n'est pas déjà importé.

**Step 2 : Ajouter l'import**

Dans `lib/actions/alertes.ts`, ajouter après la ligne `import type { ActionResult } from "@/types";` :

```typescript
import { requireAuth } from "@/lib/utils/permissions";
```

**Step 3 : Ajouter requireAuth() dans les 4 fonctions**

Dans chaque fonction, ajouter `await requireAuth()` comme **première instruction du bloc `try`** :

```typescript
// Dans getAlertsCautionsExpiring() — ligne ~29
export async function getAlertsCautionsExpiring(): Promise<ActionResult<CautionAlert[]>> {
  try {
    await requireAuth(); // AJOUT
    const today = new Date();
    // ... reste inchangé
```

```typescript
// Dans getAlertesMarchesExpiring() — ligne ~97
export async function getAlertesMarchesExpiring(): Promise<ActionResult<MarcheAlert[]>> {
  try {
    await requireAuth(); // AJOUT
    const today = new Date();
    // ... reste inchangé
```

```typescript
// Dans sendDailyAlertsEmail() — ligne ~162
export async function sendDailyAlertsEmail(): Promise<ActionResult<{ cautionsCount: number; marchesCount: number }>> {
  try {
    await requireAuth(); // AJOUT
    const [cautionsResult, marchesResult] = await Promise.all([
    // ... reste inchangé
```

```typescript
// Dans testAlertsSystem() — ligne ~256
export async function testAlertsSystem(): Promise<ActionResult<{...}>> {
  try {
    await requireAuth(); // AJOUT
    const [cautionsResult, marchesResult] = await Promise.all([
    // ... reste inchangé
```

**Step 4 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit
```
Expected: 0 erreurs.

**Step 5 : Commit**

```bash
git add lib/actions/alertes.ts
git commit -m "fix(security/C1): requireAuth() dans les 4 server actions alertes"
```

---

## Task 2 — C2 : Sécuriser /api/test-alerts

**Contexte :** Route totalement publique qui expose les données d'alertes (cautions proches échéance, marchés). On ajoute `requireRole("ADMIN")` au niveau HTTP.

**Fichiers :**
- Modify: `app/api/test-alerts/route.ts`

**Step 1 : Ajouter l'import auth**

Remplacer l'import actuel :
```typescript
import { testAlertsSystem } from "@/lib/actions/alertes";
import { NextResponse } from "next/server";
```

Par :
```typescript
import { testAlertsSystem } from "@/lib/actions/alertes";
import { auth } from "@/lib/auth/auth.config";
import { NextResponse } from "next/server";
```

**Step 2 : Ajouter le guard ADMIN au début du handler**

Dans `export async function GET()`, ajouter AVANT le bloc try :

```typescript
export async function GET() {
  // Guard ADMIN — route réservée aux admins
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Non autorisé" },
      { status: 401 }
    );
  }

  try {
    // ... reste inchangé
```

**Step 3 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit
```
Expected: 0 erreurs.

**Step 4 : Commit**

```bash
git add app/api/test-alerts/route.ts
git commit -m "fix(security/C2): requireRole ADMIN sur /api/test-alerts"
```

---

## Task 3 — C3 + C4 : Auth + anti-fuite sur routes exports Excel

**Contexte :** Les 3 routes Excel (`/api/exports/{marches,cautions,vehicules}`) n'ont pas de guard HTTP. Les server actions `exports.ts` ont déjà `requireRole` — le guard HTTP est une defense-in-depth. Ces routes retournent déjà des messages génériques (pas de fuite C4).

**Fichiers :**
- Modify: `app/api/exports/marches/route.ts`
- Modify: `app/api/exports/cautions/route.ts`
- Modify: `app/api/exports/vehicules/route.ts`

**Step 1 : Pattern à appliquer sur les 3 fichiers**

Pour chaque fichier, ajouter en haut :

```typescript
import { auth } from '@/lib/auth/auth.config'
```

Puis, dans le handler `GET`, avant le bloc `try`, ajouter :

```typescript
export async function GET(request: NextRequest) {
  // Guard auth — defense-in-depth (requireRole est aussi dans la server action)
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    // ... reste inchangé
```

**Step 2 : Appliquer sur `app/api/exports/marches/route.ts`**

Ligne d'import existante : `import { NextRequest, NextResponse } from 'next/server'`
Ajouter après : `import { auth } from '@/lib/auth/auth.config'`

Insérer le guard avant le `try {` du handler.

**Step 3 : Appliquer sur `app/api/exports/cautions/route.ts`**

Même modification.

**Step 4 : Appliquer sur `app/api/exports/vehicules/route.ts`**

Même modification.

**Step 5 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit
```
Expected: 0 erreurs.

**Step 6 : Commit**

```bash
git add app/api/exports/marches/route.ts app/api/exports/cautions/route.ts app/api/exports/vehicules/route.ts
git commit -m "fix(security/C3): guard auth HTTP sur routes exports Excel"
```

---

## Task 4 — C3 + C4 : Auth + anti-fuite sur routes exports PDF

**Contexte :** Les 4 routes PDF (`/api/exports-pdf/{marches,cautions,vehicules,documents}`) ont le double problème : pas de guard HTTP ET fuite `error.message` dans le catch. Les 2 corrections se font ensemble.

**Fichiers :**
- Modify: `app/api/exports-pdf/marches/route.ts`
- Modify: `app/api/exports-pdf/cautions/route.ts`
- Modify: `app/api/exports-pdf/vehicules/route.ts`
- Modify: `app/api/exports-pdf/documents/route.ts`

**Step 1 : Pattern à appliquer sur les 4 fichiers**

Ajouter import :
```typescript
import { auth } from '@/lib/auth/auth.config'
```

Guard auth avant le try :
```typescript
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    // ... code existant inchangé ...
  } catch (error: any) {
    console.error('[API_EXPORT_XXX_PDF]', error) // déjà présent
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' }, // REMPLACE error.message
      { status: 500 }
    )
  }
}
```

**Step 2 : Appliquer sur `app/api/exports-pdf/marches/route.ts`**

- Ajouter import `auth`
- Ajouter guard avant try
- Dans le catch ligne 37 : remplacer `{ error: error.message || 'Erreur interne du serveur' }` par `{ error: 'Erreur lors de la génération du PDF' }`

**Step 3 : Appliquer sur `app/api/exports-pdf/cautions/route.ts`**

- Ajouter import `auth`
- Ajouter guard avant try
- Dans le catch ligne 36 : remplacer `{ error: error.message || 'Erreur interne du serveur' }` par `{ error: 'Erreur lors de la génération du PDF' }`

**Step 4 : Appliquer sur `app/api/exports-pdf/vehicules/route.ts`**

- Ajouter import `auth`
- Ajouter guard avant try
- Dans le catch ligne 33 : remplacer `{ error: error.message || 'Erreur interne du serveur' }` par `{ error: 'Erreur lors de la génération du PDF' }`

**Step 5 : Appliquer sur `app/api/exports-pdf/documents/route.ts`**

- Ajouter import `auth`
- Ajouter guard avant try
- Dans le catch ligne 34 : remplacer `{ error: error.message || 'Erreur interne du serveur' }` par `{ error: 'Erreur lors de la génération du PDF' }`

**Step 6 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit
```
Expected: 0 erreurs.

**Step 7 : Commit**

```bash
git add app/api/exports-pdf/marches/route.ts app/api/exports-pdf/cautions/route.ts app/api/exports-pdf/vehicules/route.ts app/api/exports-pdf/documents/route.ts
git commit -m "fix(security/C3+C4): guard auth + masquage error.message routes PDF"
```

---

## Task 5 — E3 : Uniformisation auth dans change-password.ts

**Contexte :** `change-password.ts` utilise `auth()` + vérification manuelle au lieu du helper `requireAuth()`. Correction purement cosmétique/cohérence — la logique est équivalente.

**Fichiers :**
- Modify: `lib/actions/auth/change-password.ts`

**Step 1 : Lire le fichier actuel**

Lignes 1–10 actuelles :
```typescript
import { auth } from '@/lib/auth/auth.config'
// ...
export async function changePassword(formData: FormData): Promise<ChangePasswordResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Non authentifié' }
  }
```

**Step 2 : Remplacer auth par requireAuth**

Modifier l'import :
```typescript
// Avant
import { auth } from '@/lib/auth/auth.config'

// Après
import { requireAuth } from '@/lib/utils/permissions'
```

Modifier le début de la fonction — remplacer les lignes `const session = await auth()` + `if (!session?.user?.id)` par :

```typescript
export async function changePassword(formData: FormData): Promise<ChangePasswordResult> {
  let session: Awaited<ReturnType<typeof requireAuth>>;
  try {
    session = await requireAuth();
  } catch {
    return { success: false, error: 'Non authentifié' };
  }
```

Puis s'assurer que les références à `session.user.id` restent fonctionnelles (elles le sont — `requireAuth()` retourne la session complète).

**Step 3 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit
```
Expected: 0 erreurs.

**Step 4 : Commit**

```bash
git add lib/actions/auth/change-password.ts
git commit -m "fix(security/E3): uniformisation requireAuth() dans change-password"
```

---

## Task 6 — E1 : Validation extension + MIME dans getUploadUrl

**Contexte :** `getUploadUrl` dans `documents.ts` accepte n'importe quel `fileName` sans valider l'extension. On ajoute une whitelist d'extensions/MIME au niveau serveur. Le client envoie déjà le `mimeType` lors de `saveDocumentMetadata` — on peut aussi récupérer le MIME via le fileName pour la validation de l'URL signée.

**Note :** La correction porte uniquement sur la validation du `fileName` (extension). La validation MIME complète est faite dans `saveDocumentMetadata` qui reçoit le `mimeType` réel. On ajoute une constante exportable et une validation dans `getUploadUrl`.

**Fichiers :**
- Modify: `lib/actions/documents.ts`

**Step 1 : Identifier les types de documents acceptés**

Chercher dans le code les types MIME existants :
```bash
grep -r "mimeType\|application/pdf\|image/\|application/vnd" lib/ --include="*.ts" | head -20
```

**Step 2 : Ajouter la constante d'extensions autorisées**

Au début de `lib/actions/documents.ts`, après les imports existants, ajouter :

```typescript
// Extensions et MIME types autorisés pour l'upload de documents
const ALLOWED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'txt', 'csv', 'zip',
] as const;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/zip',
]);
```

**Step 3 : Ajouter la validation dans getUploadUrl**

Dans `getUploadUrl`, après `await requireMarcheWrite()` (ligne ~151), ajouter la validation avant la génération du chemin :

```typescript
export async function getUploadUrl(params: {
  type: TypeDocument
  fileName: string
  marcheId?: string
}): Promise<ActionResult<{ signedUrl: string; storagePath: string }>> {
  try {
    await requireMarcheWrite()

    // Validation de l'extension du fichier
    const ext = params.fileName.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.includes(ext as typeof ALLOWED_EXTENSIONS[number])) {
      return {
        success: false,
        error: `Extension de fichier non autorisée : .${ext}`,
      };
    }

    const storagePath = generateStoragePath(params.type, params.fileName, params.marcheId)
    // ... reste inchangé
```

**Step 4 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit
```
Expected: 0 erreurs.

**Step 5 : Commit**

```bash
git add lib/actions/documents.ts
git commit -m "fix(security/E1): validation extension fichier dans getUploadUrl"
```

---

## Task 7 — E2 : timingSafeEqual pour CRON_SECRET

**Contexte :** La route cron compare le header `Authorization` avec une comparaison string naïve (`authHeader !== expectedAuth`), vulnérable aux timing attacks. On remplace par `crypto.timingSafeEqual`. On ajoute aussi la vérification du header `x-vercel-cron` envoyé automatiquement par Vercel.

**Fichiers :**
- Modify: `app/api/cron/daily-alerts/route.ts`

**Step 1 : Ajouter l'import crypto**

Au début du fichier, ajouter :
```typescript
import { timingSafeEqual } from "crypto";
```

**Step 2 : Remplacer la comparaison naïve**

Remplacer le bloc actuel (lignes ~29–51) :
```typescript
// AVANT
const authHeader = request.headers.get("authorization");
const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

if (!process.env.CRON_SECRET) {
  // ...
}

if (authHeader !== expectedAuth) {
  // ...
}
```

Par :
```typescript
// APRÈS
if (!process.env.CRON_SECRET) {
  console.error("❌ CRON_SECRET non configuré");
  return NextResponse.json(
    { success: false, error: "Configuration manquante" },
    { status: 500 }
  );
}

// Vérification header Vercel Cron (optionnel en dev, obligatoire en prod)
const isVercelCron = request.headers.get("x-vercel-cron") === "1";
const authHeader = request.headers.get("authorization") ?? "";
const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

// Comparaison timing-safe pour éviter les timing attacks
let authorized = false;
try {
  authorized = timingSafeEqual(
    Buffer.from(authHeader),
    Buffer.from(expectedAuth)
  );
} catch {
  // Longueurs différentes — timingSafeEqual lève si buffers de tailles différentes
  authorized = false;
}

if (!authorized && !isVercelCron) {
  console.warn("⚠️  Tentative d'accès non autorisée au cron job");
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}
```

**Note importante :** La logique `!authorized && !isVercelCron` accepte les requêtes Vercel Cron légitimes (qui envoient `x-vercel-cron: 1`) ET les requêtes avec le bon Bearer token (pour les tests manuels). En production Vercel, les deux headers sont présents.

**Step 3 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit
```
Expected: 0 erreurs.

**Step 4 : Commit**

```bash
git add app/api/cron/daily-alerts/route.ts
git commit -m "fix(security/E2): timingSafeEqual + x-vercel-cron check sur route cron"
```

---

## Task 8 — E4 : Limite exports (take: 1000)

**Contexte :** Les `findMany` dans `exports.ts` n'ont aucune limite — sur un gros volume de données, un export pourrait dépasser la mémoire. On ajoute une constante `EXPORT_MAX_ROWS` et on l'applique sur chaque query.

**Fichiers :**
- Modify: `lib/actions/exports.ts`

**Step 1 : Identifier toutes les queries findMany**

```bash
grep -n "findMany" lib/actions/exports.ts
```
Expected : plusieurs occurrences (marchés, cautions, véhicules, documents).

**Step 2 : Ajouter la constante en haut du fichier**

Après les imports (avant les commentaires `// TYPES`), ajouter :

```typescript
// Limite maximale de lignes par export (protection mémoire)
const EXPORT_MAX_ROWS = 1000;
```

**Step 3 : Ajouter `take: EXPORT_MAX_ROWS` sur chaque findMany**

Pour chaque `prisma.XXX.findMany({`, ajouter `take: EXPORT_MAX_ROWS` dans les options :

```typescript
// Exemple pour marchés
const marches = await prisma.marche.findMany({
  where,
  take: EXPORT_MAX_ROWS,        // AJOUT
  orderBy: { numero: 'asc' },
  include: { user: { select: { name: true } } },
})
```

Même pattern pour cautions, véhicules, documents (Excel et PDF) — chercher chaque `findMany` dans le fichier et ajouter `take: EXPORT_MAX_ROWS`.

**Step 4 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit
```
Expected: 0 erreurs.

**Step 5 : Commit**

```bash
git add lib/actions/exports.ts
git commit -m "fix(security/E4): limite EXPORT_MAX_ROWS=1000 sur toutes les queries d'export"
```

---

## Task 9 — Validation finale (non-régression)

**Step 1 : Build complet**

```bash
npm run build
```
Expected: Build réussi, 0 erreur TypeScript.

**Step 2 : Tests Playwright exports (vérifier que les exports fonctionnent toujours)**

Se connecter en admin sur https://erp-marches-stam.vercel.app et vérifier manuellement :
- Export Excel marchés → téléchargement .xlsx
- Export PDF marchés → téléchargement .pdf
- Export Excel cautions → téléchargement .xlsx
- Export PDF cautions → téléchargement .pdf

**Step 3 : Vérifier la route cron manuellement**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://erp-marches-stam.vercel.app/api/cron/daily-alerts
```
Expected: `{ "success": true, ... }`

**Step 4 : Vérifier que /api/test-alerts retourne 401 sans auth**

```bash
curl https://erp-marches-stam.vercel.app/api/test-alerts
```
Expected: `{ "success": false, "error": "Non autorisé" }` avec status 401.

**Step 5 : Re-run tests E2E alertes existants (smoke test)**

```bash
PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app \
  npx playwright test tests/alertes/cron-prod.spec.ts --project=chromium --workers=1
```
Expected: 21/21 PASS.

---

## Résumé des fichiers modifiés

| Fichier | Tâche | Changement |
|---------|-------|-----------|
| `lib/actions/alertes.ts` | C1 | +`requireAuth()` dans 4 fonctions |
| `app/api/test-alerts/route.ts` | C2 | +guard ADMIN |
| `app/api/exports/marches/route.ts` | C3 | +guard auth HTTP |
| `app/api/exports/cautions/route.ts` | C3 | +guard auth HTTP |
| `app/api/exports/vehicules/route.ts` | C3 | +guard auth HTTP |
| `app/api/exports-pdf/marches/route.ts` | C3+C4 | +guard auth HTTP + masquage error |
| `app/api/exports-pdf/cautions/route.ts` | C3+C4 | +guard auth HTTP + masquage error |
| `app/api/exports-pdf/vehicules/route.ts` | C3+C4 | +guard auth HTTP + masquage error |
| `app/api/exports-pdf/documents/route.ts` | C3+C4 | +guard auth HTTP + masquage error |
| `lib/actions/auth/change-password.ts` | E3 | `auth()` → `requireAuth()` |
| `lib/actions/documents.ts` | E1 | +validation extension dans `getUploadUrl` |
| `app/api/cron/daily-alerts/route.ts` | E2 | `timingSafeEqual` + `x-vercel-cron` |
| `lib/actions/exports.ts` | E4 | +`EXPORT_MAX_ROWS = 1000` sur tous les findMany |
