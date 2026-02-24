# Design — Module Journal des Logs (Audit Log)

**Date** : 2026-02-24
**Statut** : Validé
**Approche** : logAction() fire-and-forget (Approche A)

---

## Objectif

Tracer toutes les actions critiques effectuées dans l'application :
- Qui a fait l'action (userId, userEmail)
- Quelle action (action)
- Sur quelle ressource (entityType, entityId)
- Quand (createdAt)
- Depuis quel contexte (ipAddress, userAgent)

Réservé ADMIN uniquement. Non intrusif, sans impact sur les fonctionnalités existantes.

---

## Contraintes absolues

- Aucune régression sur les fonctionnalités existantes
- Aucune modification de logique métier
- Try/catch silencieux dans logAction() — ne jamais casser le flux métier
- Overhead minimal sur les performances
- Pas de données sensibles dans metadata (tokens, passwords, hash bcrypt)

---

## Section 1 — Modèle de données

### Schéma Prisma

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  userId      String?
  userEmail   String?
  action      String
  entityType  String
  entityId    String?
  metadata    Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([createdAt])
  @@index([userId])
  @@index([entityType])
  @@index([action])
  @@map("audit_logs")
}
```

**Choix clés :**
- `userId` nullable → tolère les actions système et les login échoués
- `onDelete: SetNull` → les logs survivent à la suppression d'un utilisateur (conformité RGPD)
- `metadata Json?` → contexte riche sans alourdir le schéma
- 4 index → performance sur les filtres UI
- Pas d'enum Prisma → TypeScript `const` object, extensible sans migration DB

### Constantes TypeScript

Fichier : `lib/audit/constants.ts`

```ts
export const AUDIT_ACTION = {
  CREATE:          'CREATE',
  UPDATE:          'UPDATE',
  DELETE:          'DELETE',
  LOGIN:           'LOGIN',
  LOGIN_FAILED:    'LOGIN_FAILED',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
  EXPORT:          'EXPORT',
} as const

export const AUDIT_ENTITY = {
  MARCHE:       'MARCHE',
  CAUTION:      'CAUTION',
  VEHICULE:     'VEHICULE',
  DOCUMENT:     'DOCUMENT',
  INTERVENTION: 'INTERVENTION',
  ALERT_RULE:   'ALERT_RULE',
  USER:         'USER',
  AUTH:         'AUTH',
  EXPORT:       'EXPORT',
} as const
```

---

## Section 2 — Service logAction()

Fichier : `lib/audit/logAction.ts`

```ts
interface LogActionParams {
  userId?:    string | null
  userEmail?: string | null
  action:     string
  entityType: string
  entityId?:  string | null
  metadata?:  Record<string, unknown>
}

export async function logAction(params: LogActionParams): Promise<void> {
  try {
    const headersList = await headers()
    const ipAddress  = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
                    ?? headersList.get('x-real-ip') ?? null
    const userAgent  = headersList.get('user-agent') ?? null

    await prisma.auditLog.create({ data: { ...params, ipAddress, userAgent } })
  } catch {
    // Silencieux — ne jamais casser le flux métier
  }
}
```

### Points d'instrumentation (18 points)

| Module | Actions | Server Actions ciblées |
|--------|---------|----------------------|
| Marchés | CREATE / UPDATE / DELETE | `createMarche` `updateMarche` `deleteMarche` |
| Cautions | CREATE / UPDATE / DELETE | `createCaution` `updateCaution` `deleteCaution` |
| Véhicules | CREATE / UPDATE / DELETE | `createVehicule` `updateVehicule` `deleteVehicule` |
| SAV | CREATE / UPDATE | `createIntervention` `updateIntervention` |
| Documents | CREATE / DELETE | `uploadDocument` `deleteDocument` |
| Alertes | CREATE / UPDATE / DELETE | `createAlertRule` `updateAlertRule` `deleteAlertRule` |
| Exports | EXPORT | routes PDF/Excel (×4 modules) |
| Auth | LOGIN / LOGIN_FAILED / CHANGE_PASSWORD | `auth.config authorize()` `changePassword` |

**Règle d'injection** : `logAction()` placé après `prisma.X.create/update/delete` réussi, avant `revalidatePath()`.

---

## Section 3 — UI /admin/audit-logs

### Fichiers

```
app/(dashboard)/admin/audit-logs/
  page.tsx              ← RSC, requireAdmin(), fetch paginé
  AuditLogsClient.tsx   ← 'use client', tableau + filtres + drawer

lib/actions/audit-logs.ts  ← getAuditLogs() paginé + getAuditLogById()
```

### Sidebar

- Lien ajouté dans `dashboard-shell.tsx` avec `roles: ['ADMIN']`, icône `ClipboardList`
- Route : `/admin/audit-logs`
- Title : `'Journal des logs'`

### Tableau paginé

Colonnes : Date/heure · Utilisateur · Action (badge coloré) · Module · Référence · IP

- Pagination offset `limit=50`, tri `createdAt DESC`
- Badges action : CREATE=vert, UPDATE=bleu, DELETE=rouge, LOGIN=gris, EXPORT=orange

### Filtres avancés

Recherche texte · Module · Action · Utilisateur · Période (Du/Au) · Réinitialiser
→ State via `useRouter` + `useSearchParams` (query params)

### Drawer détail

`Sheet` shadcn latéral au clic sur une ligne :
- Tous les champs du log
- `metadata` en JSON formaté `<pre>`
- IP + User-Agent complets

### Export CSV

Bouton ADMIN → `exportAuditLogsCsv()` → max 5 000 lignes avec filtres actifs

---

## Section 4 — Performance & Sécurité

### Performance

| Levier | Détail |
|--------|--------|
| 4 index DB | `createdAt`, `userId`, `entityType`, `action` |
| Pagination offset | `skip/take` Prisma, limit=50, viable jusqu'à ~500k lignes |
| metadata lazy | Chargé uniquement à l'ouverture du drawer |
| logAction() non-bloquant | Impact latence ~0ms sur les SA métier |

**Seuil estimé** : 100k logs en ~5 ans à 50 actions/jour. Index suffisants, pas de partitioning nécessaire MVP.

### Sécurité

- `requireAdmin()` sur page ET Server Actions de lecture
- Jamais de passwords/tokens dans metadata
- `onDelete: SetNull` → conformité RGPD
- Export CSV protégé par guard ADMIN

---

## Recommandations d'évolution (post-MVP)

**Court terme**
- Rétention configurable via `AUDIT_LOG_RETENTION_DAYS` + cron hebdomadaire

**Moyen terme**
- Cursor pagination quand > 200k lignes
- Archivage mensuel Supabase Storage en `.jsonl.gz`
- Alerte sur `LOGIN_FAILED` répété (brute-force detection)

**Long terme**
- RLS Supabase append-only (pas de DELETE sur audit_logs)
- Signature hash chaîné pour détection de falsification
