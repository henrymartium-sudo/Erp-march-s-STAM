# Désactivation de compte utilisateur (ADMIN) — Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal** : Permettre à un ADMIN de désactiver un compte `ACTIVE` (et de le réactiver en cas d'erreur) depuis `/admin/utilisateurs`, en étendant le pattern `approveUser`/`rejectUser` déjà en place, sans rien casser sur les transitions `PENDING`→`ACTIVE`/`REJECTED` existantes.

**Architecture** : Nouvelle valeur d'enum `AccountStatus.DEACTIVATED` (PostgreSQL, migration additive `ALTER TYPE ... ADD VALUE`), deux nouvelles Server Actions symétriques (`deactivateUser`/`reactivateUser`) dans le fichier existant `lib/actions/auth/users.ts`, extension du garde de sécurité `requireAuth()`, branche dédiée dans le callback Google `signIn()`, et boutons/badge dans `UsersAdminClient.tsx`.

**Tech Stack** : Next.js 15 Server Actions · Prisma 7 (Postgres) · NextAuth v5 (Auth.js) · shadcn/ui (Badge, Button) · Playwright.

**Séquencement** : les 7 tâches sont **strictement séquentielles**, pas de parallélisation possible entre elles — T3 utilise le littéral `'DEACTIVATED'` comme valeur du champ Prisma `accountStatus`, ce qui ne type-check qu'après que T1 a régénéré le client Prisma. Ne pas tenter d'exécuter T2+ avant que T1 soit committé.

## Contexte codebase

- `lib/actions/auth/users.ts` (85 lignes) : contient déjà `approveUser(userId, role)` et `rejectUser(userId)` — moule à reproduire exactement pour `deactivateUser`/`reactivateUser`.
- `prisma/schema.prisma` : modèle `User` ligne 13, champ `accountStatus AccountStatus @default(ACTIVE)` ligne 19, enum `AccountStatus` lignes 74-78 (`ACTIVE | PENDING | REJECTED`).
- `lib/utils/permissions.ts` lignes 7-23 : `requireAuth()` bloque explicitement sur `PENDING`/`REJECTED` (pas sur `!== 'ACTIVE'` — choix délibéré de compat JWT).
- `lib/auth/auth.config.ts` : `authorize()` Credentials ligne 113 (générique, `!== 'ACTIVE'`) ; callback `signIn()` Google lignes 180-198 (binaire ACTIVE/PENDING/else-REJECTED).
- `lib/audit/constants.ts` lignes 9-10 : `AUDIT_ACTION` n'a que `APPROVE_USER`/`REJECT_USER`.
- `app/(dashboard)/admin/utilisateurs/UsersAdminClient.tsx` (389 lignes) : `handleApprove`/`handleReject` lignes 79-106 (moule `useTransition`+`toast`+`router.refresh()`), badge conditionnel `REJECTED` lignes 262-266, `components/ui/badge.tsx` variants `success|warning|danger|info|muted`.
- `tests/auth/user-identifiers.spec.ts` : pattern de test réutilisable (session admin partagée via `beforeAll`, locator `.bg-white.rounded-xl` filtré par email).

## Décisions de conception tranchées

- **Réactivation : OUI**, transition réversible `DEACTIVATED → ACTIVE` via `reactivateUser`, symétrique à `deactivateUser`, sans champ "motif", sans workflow d'approbation. `REJECTED` reste à sens unique (aucun changement — concerne une demande d'accès refusée, pas un compte opérationnel suspendu).
- **Nommage** : enum `DEACTIVATED` (anglais, cohérent avec `ACTIVE | PENDING | REJECTED`), libellé UI `Désactivé`.
- **Badge** : variant `muted` (gris neutre) plutôt que `danger` (déjà utilisé par `REJECTED`) — une désactivation administrative n'est pas un jugement négatif, juste un statut "éteint", réversible en un clic.
- **Garde anti-auto-désactivation** : un ADMIN ne peut pas désactiver son propre compte (vérifié côté serveur dans `deactivateUser`, bouton absent côté UI sur sa propre carte) — sans ce garde, un unique ADMIN pourrait se verrouiller lui-même hors du panneau d'administration.
- **Hors périmètre, délibérément** : pas de dialogue de confirmation (cohérent avec approve/reject existants) ; pas d'invalidation immédiate d'une session déjà ouverte (limite déjà acceptée pour PENDING/REJECTED — le JWT n'est jamais resynchronisé avec la DB après login) ; `prisma/seed.ts` non touché (environnement démo isolé, sans rapport avec `TEST_USERS`).
- **Migration DB** : via `prisma migrate deploy` (auto-contenu, ne dépend que de `DATABASE_URL`).

**⚠️ Rappel sécurité base de données (CLAUDE.md §17.4)** : avant d'exécuter la migration de T1 contre une base partagée/production, vérifier qu'une sauvegarde récente existe. Cette vérification est **volontairement non automatisée** dans ce plan — c'est un arrêt humain explicite (T1, Step 3), pas une étape mécanique.

## Task 1 : Statut `DEACTIVATED` — schéma Prisma + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_deactivated_account_status/migration.sql`

**Step 1 — Modifier l'enum dans `prisma/schema.prisma`**

Remplacer (lignes 74-78) :
```prisma
enum AccountStatus {
  ACTIVE     // Compte opérationnel
  PENDING    // Créé via Google, en attente de validation ADMIN
  REJECTED   // Demande d'accès refusée par un ADMIN
}
```
par :
```prisma
enum AccountStatus {
  ACTIVE       // Compte opérationnel
  PENDING      // Créé via Google, en attente de validation ADMIN
  REJECTED     // Demande d'accès refusée par un ADMIN
  DEACTIVATED  // Compte désactivé par un ADMIN — réversible (cf. reactivateUser)
}
```

**Step 2 — Générer le dossier de migration (timestamp dynamique)**

```bash
TS=$(node -e "console.log(new Date().toISOString().replace(/[-:TZ]/g,'').slice(0,14))")
mkdir -p "prisma/migrations/${TS}_add_deactivated_account_status"
cat > "prisma/migrations/${TS}_add_deactivated_account_status/migration.sql" <<'EOF'
-- Ajout du statut DEACTIVATED : permet à un ADMIN de désactiver un compte ACTIVE.
-- Transition réversible (contrairement à REJECTED, qui ne s'applique qu'aux
-- demandes d'accès PENDING et reste définitive) — cf. reactivateUser().

ALTER TYPE "AccountStatus" ADD VALUE 'DEACTIVATED';
EOF
echo "Migration créée : prisma/migrations/${TS}_add_deactivated_account_status/migration.sql"
```
Résultat attendu : le script affiche le chemin du fichier créé, exit code 0.

**Step 3 — ARRÊT MANUEL (pas de commande — checkpoint humain)**

> Confirmer que `DATABASE_URL` (dans `.env`) pointe vers une base de test/dev, ou qu'une sauvegarde récente existe si c'est une base partagée. Ne pas passer à l'étape suivante sans cette confirmation (CLAUDE.md §17.4).

**Step 4 — Appliquer la migration**

```bash
npx prisma migrate deploy
```
Résultat attendu : le texte de sortie contient `add_deactivated_account_status` sous une ligne `The following migration(s) have been applied` (ou `No pending migrations to apply` si déjà appliquée lors d'une tentative précédente), exit code 0.

**Step 5 — Régénérer le client Prisma**

```bash
npx prisma generate
```
Résultat attendu : la sortie contient `Generated Prisma Client`, exit code 0.

**Step 6 — Vérification**

```bash
npx prisma validate
npx prisma migrate status
node -e "const {AccountStatus}=require('@prisma/client'); if(AccountStatus.DEACTIVATED!=='DEACTIVATED'){console.error('FAIL: DEACTIVATED absent du client généré');process.exit(1)}; console.log('OK: AccountStatus.DEACTIVATED =', AccountStatus.DEACTIVATED)"
```
**Vérification :** les trois commandes s'exécutent avec un code de sortie 0 ; `npx prisma validate` affiche `is valid` ; `npx prisma migrate status` affiche `Database schema is up to date!` ; la commande `node -e` affiche exactement `OK: AccountStatus.DEACTIVATED = DEACTIVATED`.

**Step 7 — Commit**

```bash
git add prisma/schema.prisma "prisma/migrations/"*"_add_deactivated_account_status"
git commit -m "feat(auth): ajouter le statut DEACTIVATED au schéma Prisma"
```

## Task 2 : Constantes d'audit — `DEACTIVATE_USER` / `REACTIVATE_USER`

**Files:**
- Modify: `lib/audit/constants.ts`

**Step 1 — Ajouter les deux actions dans `AUDIT_ACTION`**

```typescript
export const AUDIT_ACTION = {
  CREATE:          'CREATE',
  UPDATE:          'UPDATE',
  DELETE:          'DELETE',
  LOGIN:           'LOGIN',
  LOGIN_FAILED:    'LOGIN_FAILED',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
  EXPORT:          'EXPORT',
  APPROVE_USER:    'APPROVE_USER',
  REJECT_USER:     'REJECT_USER',
  DEACTIVATE_USER: 'DEACTIVATE_USER',
  REACTIVATE_USER: 'REACTIVATE_USER',
} as const
```

**Step 2 — Ajouter les libellés français dans `ACTION_LABELS`**

```typescript
export const ACTION_LABELS: Record<string, string> = {
  CREATE:          'Création',
  UPDATE:          'Modification',
  DELETE:          'Suppression',
  LOGIN:           'Connexion',
  LOGIN_FAILED:    'Connexion échouée',
  CHANGE_PASSWORD: 'Changement MDP',
  EXPORT:          'Export',
  APPROVE_USER:    'Compte approuvé',
  REJECT_USER:     'Compte refusé',
  DEACTIVATE_USER: 'Compte désactivé',
  REACTIVATE_USER: 'Compte réactivé',
}
```

Ne pas toucher `AUDIT_ENTITY`/`ENTITY_LABELS` (l'entité `USER` existe déjà) ni `app/(dashboard)/admin/audit-logs/AuditLogsClient.tsx` — `ActionBadge` retombe déjà sur un badge gris générique pour toute action absente de `ACTION_BADGE_CLASSES`, exactement comme `APPROVE_USER`/`REJECT_USER` aujourd'hui.

**Step 3 — Vérification**

```bash
grep -c "DEACTIVATE_USER" lib/audit/constants.ts; grep -c "REACTIVATE_USER" lib/audit/constants.ts
```
**Vérification :** la première commande affiche `2`, la seconde affiche `2`.

```bash
npx tsc --noEmit 2>&1 | grep -c "lib/audit/constants.ts" ; true
```
Résultat attendu : `0`.

**Step 4 — Commit**

```bash
git add lib/audit/constants.ts
git commit -m "feat(audit): ajouter les actions DEACTIVATE_USER / REACTIVATE_USER"
```

## Task 3 : Server Actions `deactivateUser` / `reactivateUser`

**Files:**
- Modify: `lib/actions/auth/users.ts`

**Step 1 — Ajouter les deux fonctions en fin de fichier (après `rejectUser`)**

```typescript
// ─── Désactivation ──────────────────────────────────────────────────────────

export async function deactivateUser(userId: string): Promise<UserApprovalResult> {
  let session
  try {
    session = await requireRole(['ADMIN'])
  } catch {
    return { success: false, error: 'Non autorisé' }
  }

  if (userId === session.user.id) {
    return { success: false, error: 'Vous ne pouvez pas désactiver votre propre compte' }
  }

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) {
    return { success: false, error: 'Utilisateur introuvable' }
  }
  if (target.accountStatus !== 'ACTIVE') {
    return { success: false, error: 'Ce compte n\'est pas actif' }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: 'DEACTIVATED' },
  })

  await logAction({
    userId:     session.user.id,
    userEmail:  session.user.email,
    action:     AUDIT_ACTION.DEACTIVATE_USER,
    entityType: AUDIT_ENTITY.USER,
    entityId:   userId,
    metadata:   { deactivatedEmail: target.email },
  })

  revalidatePath('/admin/utilisateurs')
  return { success: true }
}

// ─── Réactivation ───────────────────────────────────────────────────────────

export async function reactivateUser(userId: string): Promise<UserApprovalResult> {
  let session
  try {
    session = await requireRole(['ADMIN'])
  } catch {
    return { success: false, error: 'Non autorisé' }
  }

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) {
    return { success: false, error: 'Utilisateur introuvable' }
  }
  if (target.accountStatus !== 'DEACTIVATED') {
    return { success: false, error: 'Ce compte n\'est pas désactivé' }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: 'ACTIVE' },
  })

  await logAction({
    userId:     session.user.id,
    userEmail:  session.user.email,
    action:     AUDIT_ACTION.REACTIVATE_USER,
    entityType: AUDIT_ENTITY.USER,
    entityId:   userId,
    metadata:   { reactivatedEmail: target.email },
  })

  revalidatePath('/admin/utilisateurs')
  return { success: true }
}
```

Le type `UserApprovalResult` existant est réutilisé tel quel — pas de renommage, aucun autre fichier ne l'importe.

**Step 2 — Vérification**

```bash
grep -cE "export async function (deactivateUser|reactivateUser)" lib/actions/auth/users.ts
```
Résultat attendu : `2`

```bash
npx tsc --noEmit 2>&1 | grep -c "lib/actions/auth/users.ts" ; true
```
**Vérification :** `2` pour la première commande, `0` pour la seconde.

**Step 3 — Commit**

```bash
git add lib/actions/auth/users.ts
git commit -m "feat(auth): ajouter les server actions deactivateUser / reactivateUser"
```

## Task 4 : Correctif sécurité — `requireAuth()` bloque `DEACTIVATED`

**Files:**
- Modify: `lib/utils/permissions.ts`

**Step 1 — Étendre la condition de blocage (lignes 14-20)**

Remplacer :
```typescript
  // PENDING/REJECTED explicites uniquement — une session JWT émise avant l'ajout
  // de ce champ n'a pas accountStatus dans son token ; la traiter comme bloquée
  // déconnecterait tous les utilisateurs déjà connectés au déploiement de cette
  // fonctionnalité, alors qu'ils étaient légitimement actifs.
  if (session.user.accountStatus === 'PENDING' || session.user.accountStatus === 'REJECTED') {
    throw new Error('Compte en attente de validation ou désactivé')
  }
```
par :
```typescript
  // PENDING/REJECTED/DEACTIVATED explicites uniquement — une session JWT émise
  // avant l'ajout de ce champ n'a pas accountStatus dans son token ; la traiter
  // comme bloquée déconnecterait tous les utilisateurs déjà connectés au
  // déploiement de cette fonctionnalité, alors qu'ils étaient légitimement actifs.
  //
  // Limite connue : un token déjà émis pour un compte ACTIVE n'est jamais
  // resynchronisé avec la DB en cours de session (le callback jwt() de
  // auth.config.ts ne relit accountStatus qu'au moment du login, cf. le bloc
  // `if (user && account?.provider === ...)`). Désactiver un utilisateur ne
  // met donc PAS fin à une session déjà ouverte — elle expire naturellement.
  // Ce garde bloque en revanche toute NOUVELLE tentative de connexion.
  if (
    session.user.accountStatus === 'PENDING' ||
    session.user.accountStatus === 'REJECTED' ||
    session.user.accountStatus === 'DEACTIVATED'
  ) {
    throw new Error('Compte en attente de validation ou désactivé')
  }
```

Le message d'erreur existant reste inchangé — il dit déjà "ou désactivé", il était juste prématuré avant l'ajout de ce statut.

**Step 2 — Vérification**

```bash
grep -n "DEACTIVATED" lib/utils/permissions.ts
```
Résultat attendu : au moins 1 ligne affichée.

```bash
npx tsc --noEmit 2>&1 | grep -c "lib/utils/permissions.ts" ; true
```
**Vérification :** la première commande affiche au moins une ligne contenant `DEACTIVATED` ; la seconde affiche `0`.

**Step 3 — Commit**

```bash
git add lib/utils/permissions.ts
git commit -m "fix(auth): bloquer les comptes DEACTIVATED dans requireAuth"
```

## Task 5 : Message d'erreur dédié — connexion Google avec compte désactivé

**Files:**
- Modify: `lib/auth/auth.config.ts`
- Modify: `components/auth/login-form.tsx`

**Step 1 — Ajouter une branche dédiée dans le callback `signIn()` (Google)**

Remplacer :
```typescript
          if (dbUser.accountStatus === 'PENDING') {
            return '/login?error=pending_approval'
          }

          // REJECTED
          return '/login?error=account_rejected'
```
par :
```typescript
          if (dbUser.accountStatus === 'PENDING') {
            return '/login?error=pending_approval'
          }

          if (dbUser.accountStatus === 'DEACTIVATED') {
            return '/login?error=account_deactivated'
          }

          // REJECTED
          return '/login?error=account_rejected'
```

`authorize()` (Credentials, ligne 113) n'a besoin d'aucun changement — le test `user.accountStatus !== 'ACTIVE'` est déjà générique. Volontaire : la voie Credentials ne distingue jamais la raison exacte du refus (message générique dans tous les cas), pour ne pas révéler d'information sur l'existence/statut d'un compte via une tentative de mot de passe. Seule la voie Google (qui révèle déjà l'email via OAuth) affiche un message différencié.

**Step 2 — Ajouter le message dans `components/auth/login-form.tsx`**

Remplacer :
```typescript
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  pending_approval: "Votre demande d'accès a été transmise à l'administrateur. Vous recevrez un accès dès validation.",
  account_rejected: "Votre demande d'accès a été refusée. Contactez l'administrateur.",
}
```
par :
```typescript
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  pending_approval:    "Votre demande d'accès a été transmise à l'administrateur. Vous recevrez un accès dès validation.",
  account_rejected:    "Votre demande d'accès a été refusée. Contactez l'administrateur.",
  account_deactivated: "Votre compte a été désactivé par un administrateur. Contactez l'administrateur pour le réactiver.",
}
```

**Step 3 — Vérification**

```bash
grep -c "account_deactivated" lib/auth/auth.config.ts; grep -c "account_deactivated" components/auth/login-form.tsx
```
**Vérification :** chaque commande affiche `1`.

```bash
npx tsc --noEmit 2>&1 | grep -cE "lib/auth/auth\.config\.ts|components/auth/login-form\.tsx" ; true
```
Résultat attendu : `0`.

Note : ce chemin (callback Google `signIn()`) n'a aucune couverture Playwright existante dans le repo — la vérification mécanique ci-dessus (grep + tsc) est la seule disponible pour cette tâche, cohérente avec le reste de la suite.

**Step 4 — Commit**

```bash
git add lib/auth/auth.config.ts components/auth/login-form.tsx
git commit -m "feat(auth): message d'erreur dédié pour compte désactivé (login Google)"
```

## Task 6 : UI — boutons Désactiver/Réactiver dans `/admin/utilisateurs`

**Files:**
- Modify: `app/(dashboard)/admin/utilisateurs/page.tsx`
- Modify: `app/(dashboard)/admin/utilisateurs/UsersAdminClient.tsx`

**Step 1 — Passer l'id de l'ADMIN connecté depuis `page.tsx`**

Remplacer :
```tsx
export default async function UsersAdminPage() {
  await requireRole(['ADMIN'])
```
par :
```tsx
export default async function UsersAdminPage() {
  const session = await requireRole(['ADMIN'])
```
et remplacer :
```tsx
      <UsersAdminClient users={serialized} />
```
par :
```tsx
      <UsersAdminClient users={serialized} currentUserId={session.user.id} />
```

**Step 2 — Étendre les imports dans `UsersAdminClient.tsx`**

Remplacer :
```typescript
import { ChevronDown, ChevronUp, Plus, Trash2, Star, Mail, Users, Check, X, UserPlus } from 'lucide-react'
```
par :
```typescript
import { ChevronDown, ChevronUp, Plus, Trash2, Star, Mail, Users, Check, X, UserPlus, UserX, UserCheck } from 'lucide-react'
```
et remplacer :
```typescript
import { approveUser, rejectUser } from '@/lib/actions/auth/users'
```
par :
```typescript
import { approveUser, rejectUser, deactivateUser, reactivateUser } from '@/lib/actions/auth/users'
```

**Step 3 — Ajouter `currentUserId` à l'interface et à la signature**

Remplacer :
```typescript
interface UsersAdminClientProps {
  users: UserData[]
}

export function UsersAdminClient({ users }: UsersAdminClientProps) {
```
par :
```typescript
interface UsersAdminClientProps {
  users: UserData[]
  currentUserId: string
}

export function UsersAdminClient({ users, currentUserId }: UsersAdminClientProps) {
```

**Step 4 — Ajouter les handlers (après `handleReject`, avant `handleAdd`)**

```typescript
  const handleDeactivate = (userId: string) => {
    setPendingActionId(userId)
    startTransition(async () => {
      const result = await deactivateUser(userId)
      setPendingActionId(null)
      if (result.success) {
        toast.success('Compte désactivé')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const handleReactivate = (userId: string) => {
    setPendingActionId(userId)
    startTransition(async () => {
      const result = await reactivateUser(userId)
      setPendingActionId(null)
      if (result.success) {
        toast.success('Compte réactivé')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }
```

**Step 5 — Badge + boutons dans l'en-tête de carte utilisateur**

Remplacer le bloc (dans `otherUsers.map(user => { ... })`) :
```tsx
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant={getRoleVariant(user.role)} className="text-[11px]">
                  {getRoleLabel(user.role)}
                </Badge>
                {user.accountStatus === 'REJECTED' && (
                  <Badge variant="danger" className="text-[11px]">
                    Refusé
                  </Badge>
                )}
                {identCount > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {identCount} alias
                  </span>
                )}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : user.id)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label={isExpanded ? 'Réduire' : 'Gérer les emails secondaires'}
                >
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4" />
                    : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
```
par :
```tsx
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant={getRoleVariant(user.role)} className="text-[11px]">
                  {getRoleLabel(user.role)}
                </Badge>
                {user.accountStatus === 'REJECTED' && (
                  <Badge variant="danger" className="text-[11px]">
                    Refusé
                  </Badge>
                )}
                {user.accountStatus === 'DEACTIVATED' && (
                  <Badge variant="muted" className="text-[11px]">
                    Désactivé
                  </Badge>
                )}
                {identCount > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {identCount} alias
                  </span>
                )}
                {user.accountStatus === 'ACTIVE' && user.id !== currentUserId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeactivate(user.id)}
                    disabled={isUserPending}
                    className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                  >
                    <UserX className="h-3.5 w-3.5 mr-1" />
                    Désactiver
                  </Button>
                )}
                {user.accountStatus === 'DEACTIVATED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReactivate(user.id)}
                    disabled={isUserPending}
                    className="h-7 px-2 text-[11px]"
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                    Réactiver
                  </Button>
                )}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : user.id)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label={isExpanded ? 'Réduire' : 'Gérer les emails secondaires'}
                >
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4" />
                    : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
```
(`isUserPending` est déjà défini plus haut dans le même `.map(user => {...})` — rien à ajouter.)

**Step 6 — Vérification**

```bash
grep -c "handleDeactivate\|handleReactivate" "app/(dashboard)/admin/utilisateurs/UsersAdminClient.tsx"
grep -c "currentUserId" "app/(dashboard)/admin/utilisateurs/page.tsx"
```
Résultat attendu : au moins `4` pour la première commande, au moins `2` pour la seconde.

```bash
NEXT_TELEMETRY_DISABLED=1 npm run build
```
**Vérification :** exit code 0, la sortie contient la ligne `ƒ /admin/utilisateurs` dans le tableau des routes (prévoir un timeout ≥ 600000 ms / 10 min).

**Step 7 — Commit**

```bash
git add "app/(dashboard)/admin/utilisateurs/page.tsx" "app/(dashboard)/admin/utilisateurs/UsersAdminClient.tsx"
git commit -m "feat(admin): boutons désactiver/réactiver sur la liste utilisateurs"
```

## Task 7 : Fixture de test + Test E2E Playwright

**Files:**
- Modify: `prisma/seed-test-users.ts`
- Modify: `prisma/seed-test-local.ts`
- Modify: `tests/helpers/auth.ts`
- Create: `tests/auth/user-deactivation.spec.ts`

**Contexte** : aucune Server Action n'existe pour créer un utilisateur local arbitraire depuis l'UI. La cible de test doit être pré-provisionnée par seed, comme les 4 comptes `TEST_USERS` existants. Les deux scripts de seed sont mis à jour (pas seulement `seed-test-users.ts`) car ils définissent indépendamment les mêmes comptes.

**Step 1 — Ajouter un 5e utilisateur dans `prisma/seed-test-users.ts`**

Insérer avant le `console.log('\n🎉 Seed terminé ! 4 utilisateurs de test créés.\n');` :
```typescript
  // Utilisateur 5 : cible dédiée aux tests de désactivation/réactivation —
  // NE JAMAIS l'utiliser pour un login par rôle ailleurs dans la suite.
  const deactivationPassword = await bcrypt.hash('Deactivation123!', 10);
  const deactivationTarget = await prisma.user.upsert({
    where: { email: 'deactivation.target@erp-marches.local' },
    update: {
      password: deactivationPassword,
      role: 'VISITEUR',
      accountStatus: 'ACTIVE', // auto-réparation si un run E2E précédent a échoué en cours de route
    },
    create: {
      id: 'test-deactivation-001',
      name: 'Deactivation Test',
      email: 'deactivation.target@erp-marches.local',
      password: deactivationPassword,
      role: 'VISITEUR',
    },
  });
  console.log('✅ Utilisateur cible désactivation créé :', deactivationTarget.email);
```
Et mettre à jour la ligne juste en dessous (4 → 5 utilisateurs), plus ajouter un bloc "5. CIBLE DÉSACTIVATION" dans le récapitulatif des credentials.

**Step 2 — Ajouter la même entrée dans `prisma/seed-test-local.ts`**

Dans le tableau `testUsers` (après le bloc `visiteur@erp-marches.local`) :
```typescript
    {
      email: 'deactivation.target@erp-marches.local',
      name: 'Deactivation Test',
      password: 'Deactivation123!',
      role: UserRole.VISITEUR,
    },
```

**Step 3 — Provisionner la cible**

```bash
npm run db:seed
```
**Vérification :** la sortie contient exactement la ligne `✅ Utilisateur cible désactivation créé : deactivation.target@erp-marches.local`, exit code 0.

**Step 4 — Ajouter la fixture dans `tests/helpers/auth.ts`**

Dans l'objet `TEST_USERS` (après le bloc `visiteur`) :
```typescript
  // Compte cible pour les tests de désactivation/réactivation (admin/utilisateurs).
  deactivationTarget: {
    email: process.env.TEST_DEACTIVATION_EMAIL || 'deactivation.target@erp-marches.local',
    password: process.env.TEST_DEACTIVATION_PASSWORD || 'Deactivation123!',
    role: 'VISITEUR',
  },
```

**Step 5 — Créer `tests/auth/user-deactivation.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import type { Cookie } from '@playwright/test';
import { TEST_USERS } from '../helpers/auth';

/**
 * Tests E2E — Désactivation / Réactivation de compte utilisateur (ADMIN)
 *
 * T1 : garde anti-auto-désactivation — bouton "Désactiver" absent sur la
 *      propre carte de l'ADMIN connecté
 * T2 : carte de l'utilisateur cible visible avec bouton "Désactiver"
 * T3 : clic "Désactiver" → badge "Désactivé" + bouton "Réactiver"
 * T4 : login Credentials refusé pour un compte désactivé
 * T5 : clic "Réactiver" → retour à l'état actif
 * T6 : login Credentials à nouveau accepté après réactivation
 *
 * Cible : TEST_USERS.deactivationTarget — compte dédié (cf. tests/helpers/auth.ts).
 */

let sessionCookies: Cookie[] = [];

test.setTimeout(120000);

test.describe('Désactivation de compte — Admin Utilisateurs', () => {

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000);

    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000);

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('input[name="email"]:not([disabled])', { timeout: 30000 });

    await page.fill('input[name="email"]', TEST_USERS.admin.email);
    await page.fill('input[name="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 60000 });
    await page.waitForLoadState('networkidle');

    sessionCookies = await context.cookies();
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    page.setDefaultNavigationTimeout(60000);
    if (sessionCookies.length > 0) {
      await page.context().addCookies(sessionCookies);
    }
  });

  // Nettoyage best-effort : si un test précédent a échoué en laissant le
  // compte cible désactivé, on tente de le réactiver via l'UI.
  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000);
    await page.context().addCookies(sessionCookies);

    try {
      await page.goto('/admin/utilisateurs');
      await page.waitForLoadState('networkidle');

      const targetCard = page.locator('.bg-white.rounded-xl').filter({
        hasText: TEST_USERS.deactivationTarget.email,
      }).first();

      const reactivateBtn = targetCard.getByRole('button', { name: 'Réactiver', exact: true });
      if (await reactivateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await reactivateBtn.click();
        await page.waitForTimeout(2000);
      }
    } catch {
      // Nettoyage best-effort, ne pas échouer
    } finally {
      await context.close();
    }
  });

  test('T1 — ADMIN connecté : bouton "Désactiver" absent sur sa propre carte', async ({ page }) => {
    await page.goto('/admin/utilisateurs');
    await page.waitForLoadState('networkidle');

    const ownCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.admin.email,
    }).first();
    await expect(ownCard).toBeVisible({ timeout: 15000 });

    await expect(ownCard.getByRole('button', { name: 'Désactiver', exact: true })).not.toBeVisible();
  });

  test('T2 — carte du compte cible visible avec bouton "Désactiver"', async ({ page }) => {
    await page.goto('/admin/utilisateurs');
    await page.waitForLoadState('networkidle');

    const targetCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.deactivationTarget.email,
    }).first();
    await expect(targetCard).toBeVisible({ timeout: 15000 });

    await expect(targetCard.getByRole('button', { name: 'Désactiver', exact: true })).toBeVisible();
  });

  test('T3 — clic "Désactiver" → badge "Désactivé" + bouton "Réactiver"', async ({ page }) => {
    await page.goto('/admin/utilisateurs');
    await page.waitForLoadState('networkidle');

    const targetCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.deactivationTarget.email,
    }).first();
    await expect(targetCard).toBeVisible({ timeout: 15000 });

    await targetCard.getByRole('button', { name: 'Désactiver', exact: true }).click();
    await page.waitForTimeout(3000);

    const refreshedCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.deactivationTarget.email,
    }).first();
    await expect(refreshedCard.getByText('Désactivé', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(refreshedCard.getByRole('button', { name: 'Réactiver', exact: true })).toBeVisible();
  });

  test('T4 — login Credentials refusé pour le compte désactivé', async ({ browser }) => {
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    freshPage.setDefaultNavigationTimeout(60000);

    try {
      await freshPage.goto('/login');
      await freshPage.waitForLoadState('domcontentloaded');
      await freshPage.waitForSelector('input[name="email"]:not([disabled])', { timeout: 30000 });

      await freshPage.fill('input[name="email"]', TEST_USERS.deactivationTarget.email);
      await freshPage.fill('input[name="password"]', TEST_USERS.deactivationTarget.password);
      await freshPage.click('button[type="submit"]');

      await expect(freshPage.getByText('Email ou mot de passe incorrect')).toBeVisible({ timeout: 10000 });
      expect(freshPage.url()).toContain('/login');
    } finally {
      await freshContext.close();
    }
  });

  test('T5 — clic "Réactiver" → retour à l\'état actif', async ({ page }) => {
    await page.goto('/admin/utilisateurs');
    await page.waitForLoadState('networkidle');

    const targetCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.deactivationTarget.email,
    }).first();
    await expect(targetCard).toBeVisible({ timeout: 15000 });

    await targetCard.getByRole('button', { name: 'Réactiver', exact: true }).click();
    await page.waitForTimeout(3000);

    const refreshedCard = page.locator('.bg-white.rounded-xl').filter({
      hasText: TEST_USERS.deactivationTarget.email,
    }).first();
    await expect(refreshedCard.getByText('Désactivé', { exact: true })).not.toBeVisible({ timeout: 10000 });
    await expect(refreshedCard.getByRole('button', { name: 'Désactiver', exact: true })).toBeVisible();
  });

  test('T6 — login Credentials à nouveau accepté après réactivation', async ({ browser }) => {
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    freshPage.setDefaultNavigationTimeout(60000);

    try {
      await freshPage.goto('/login');
      await freshPage.waitForLoadState('domcontentloaded');
      await freshPage.waitForSelector('input[name="email"]:not([disabled])', { timeout: 30000 });

      await freshPage.fill('input[name="email"]', TEST_USERS.deactivationTarget.email);
      await freshPage.fill('input[name="password"]', TEST_USERS.deactivationTarget.password);
      await freshPage.click('button[type="submit"]');

      await freshPage.waitForURL((url) => !url.toString().includes('/login'), { timeout: 60000 });
      expect(freshPage.url()).not.toContain('/login');
    } finally {
      await freshContext.close();
    }
  });

});
```

**Step 6 — Vérification**

```bash
npx playwright test tests/auth/user-deactivation.spec.ts --project=chromium
```
**Vérification :** le résumé final affiche `6 passed` et `0 failed`, exit code 0.

**Step 7 — Commit**

```bash
git add prisma/seed-test-users.ts prisma/seed-test-local.ts tests/helpers/auth.ts tests/auth/user-deactivation.spec.ts
git commit -m "test(auth): couverture E2E de la désactivation de compte"
```

## Récapitulatif des commits

| # | Message | Fichiers |
|---|---------|----------|
| 1 | `feat(auth): ajouter le statut DEACTIVATED au schéma Prisma` | `prisma/schema.prisma`, `prisma/migrations/<ts>_add_deactivated_account_status/migration.sql` |
| 2 | `feat(audit): ajouter les actions DEACTIVATE_USER / REACTIVATE_USER` | `lib/audit/constants.ts` |
| 3 | `feat(auth): ajouter les server actions deactivateUser / reactivateUser` | `lib/actions/auth/users.ts` |
| 4 | `fix(auth): bloquer les comptes DEACTIVATED dans requireAuth` | `lib/utils/permissions.ts` |
| 5 | `feat(auth): message d'erreur dédié pour compte désactivé (login Google)` | `lib/auth/auth.config.ts`, `components/auth/login-form.tsx` |
| 6 | `feat(admin): boutons désactiver/réactiver sur la liste utilisateurs` | `app/(dashboard)/admin/utilisateurs/page.tsx`, `app/(dashboard)/admin/utilisateurs/UsersAdminClient.tsx` |
| 7 | `test(auth): couverture E2E de la désactivation de compte` | `prisma/seed-test-users.ts`, `prisma/seed-test-local.ts`, `tests/helpers/auth.ts`, `tests/auth/user-deactivation.spec.ts` |

## Note pour l'exécution autonome (`executing-plans` / `subagent-driven-development`)

Points identifiés pendant l'exploration qui affectent spécifiquement une exécution autonome de ce plan :

1. **Le plan est séquentiel, pas parallélisable** — ne pas dispatcher T2-T7 en sous-agents indépendants avant que T1 soit committé (dépendance de typage sur le client Prisma régénéré).
2. **`npx tsc --noEmit` a un bruit de fond préexistant non lié à cette feature** — 14 erreurs dans `tests/permissions/vehicules-permissions.spec.ts` et `tests/reporting/reporting-rules.spec.ts` (vérifié empiriquement sur la baseline actuelle). Toute vérification doit filtrer par nom de fichier (`grep -c "<fichier>"`), jamais se fier au code de sortie brut de `tsc` seul.
3. **`grep -c` sur zéro correspondance sort avec le code 1** — les commandes de vérification ci-dessus lisent la **valeur affichée**, pas le code de sortie du shell. Un exécuteur autonome qui interpréterait naïvement "exit code ≠ 0 → échec" se tromperait sur plusieurs vérifications de ce plan.
4. **Task 1, Step 3 est un arrêt humain volontaire**, pas une commande — c'est le seul point du plan qui n'est pas mécaniquement tranchable par un script, par cohérence avec la discipline CLAUDE.md §17.4 de ce projet (sauvegarde avant migration DB).
5. **`npm run build` a été vérifié empiriquement pendant la planification** (baseline actuelle : succès, exit 0, ~plusieurs minutes) — prévoir un timeout généreux (≥ 10 min) dans l'exécuteur autonome, faute de quoi la commande peut être tuée à tort avant de se terminer.

### Critical Files for Implementation
- `lib/actions/auth/users.ts` — cœur métier : contient déjà `approveUser`/`rejectUser`, reçoit `deactivateUser`/`reactivateUser` en miroir exact (Task 3).
- `lib/utils/permissions.ts` — `requireAuth()`, le point de sécurité critique à étendre (Task 4).
- `prisma/schema.prisma` — source de vérité du nouvel enum `AccountStatus.DEACTIVATED`, bloquant pour tout le reste (Task 1).
- `app/(dashboard)/admin/utilisateurs/UsersAdminClient.tsx` — toute la surface UI (badge + boutons + handlers) (Task 6).
- `lib/auth/auth.config.ts` — callback `signIn()` Google, seul endroit où une valeur d'enum mal gérée produirait un message utilisateur sémantiquement faux (Task 5).
