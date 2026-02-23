# Design — Refonte Module Alertes (Event-Driven)

**Date** : 2026-02-23
**Statut** : Approuvé
**Auteur** : Claude + utilisateur

---

## 1. Objectif

Faire évoluer le module Alertes vers une architecture orientée événements permettant :

- Un contrôle granulaire sur les règles d'envoi (Rule Builder CRUD depuis l'UI)
- Un ciblage précis par rôle et/ou utilisateur individuel
- Trois canaux : Email, In-app (cloche), Webhook
- Quatre sources d'événements : Échéances, Statuts marchés, SAV, Documents
- Une idempotence garantie (aucune alerte en double)
- Une traçabilité complète (historique consultable)
- Zéro régression sur les comportements existants

---

## 2. Schéma de données

### 2.1 Nouvelles tables

```prisma
model AlertEvent {
  id           String    @id @default(cuid())
  type         String    // CAUTION_EXPIRING | MARCHE_EXPIRING | MARCHE_STATUS_CHANGED | SAV_TICKET_CREATED | SAV_TICKET_ESCALATED | SAV_SLA_BREACH | DOCUMENT_EXPIRING
  sourceModule String    // "cautions" | "marches" | "sav" | "documents"
  referenceId  String    // ID de l'entité source
  payload      Json      // données contextuelles (montant, statut, joursRestants…)
  processedAt  DateTime?
  createdAt    DateTime  @default(now())

  notifications AlertNotification[]

  @@map("alert_events")
}

model AlertRule {
  id              String   @id @default(cuid())
  name            String
  description     String?
  eventType       String   // type d'événement déclencheur (voir AlertEventType)
  conditions      Json     // { operator: "AND"|"OR", conditions: [{field, op, value}] }
  channels        String[] // ["EMAIL", "IN_APP", "WEBHOOK"]
  targetRoles     String[] // ["ADMIN", "AVANCE", "EXPLOITATION", "VISITEUR"]
  targetUserIds   String[] // IDs utilisateurs spécifiques
  webhookUrl      String?  // URL pour canal WEBHOOK
  priority        Int      @default(1)
  cooldownMinutes Int      @default(1440) // 24h — fenêtre d'idempotence
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  notifications AlertNotification[]

  @@map("alert_rules")
}

model AlertNotification {
  id               String    @id @default(cuid())
  eventId          String
  ruleId           String
  channel          String    // "EMAIL" | "IN_APP" | "WEBHOOK"
  recipientEmail   String?
  recipientUserId  String?
  status           String    // "PENDING" | "SENT" | "FAILED" | "READ"
  deduplicationKey String    // clé d'idempotence unique
  sentAt           DateTime?
  readAt           DateTime?
  deliveryLog      String?   // logs de livraison / message d'erreur
  createdAt        DateTime  @default(now())

  event AlertEvent @relation(fields: [eventId], references: [id])
  rule  AlertRule  @relation(fields: [ruleId], references: [id])
  user  User?      @relation(fields: [recipientUserId], references: [id])

  @@unique([deduplicationKey])
  @@map("alert_notifications")
}
```

### 2.2 Table existante conservée

`AlerteDestinataire` — conservée pendant la migration, archivée en phase 6.

### 2.3 Types TypeScript

```typescript
// lib/alertes/types.ts

export enum AlertEventType {
  CAUTION_EXPIRING        = "CAUTION_EXPIRING",
  MARCHE_EXPIRING         = "MARCHE_EXPIRING",
  MARCHE_STATUS_CHANGED   = "MARCHE_STATUS_CHANGED",
  SAV_TICKET_CREATED      = "SAV_TICKET_CREATED",
  SAV_TICKET_ESCALATED    = "SAV_TICKET_ESCALATED",
  SAV_SLA_BREACH          = "SAV_SLA_BREACH",
  DOCUMENT_EXPIRING       = "DOCUMENT_EXPIRING",
}

export enum AlertChannel {
  EMAIL   = "EMAIL",
  IN_APP  = "IN_APP",
  WEBHOOK = "WEBHOOK",
}

export enum NotificationStatus {
  PENDING = "PENDING",
  SENT    = "SENT",
  FAILED  = "FAILED",
  READ    = "READ",
}

export type ConditionOperator = "AND" | "OR"
export type ComparisonOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "nin"

export interface RuleCondition {
  field: string
  op: ComparisonOp
  value: string | number | string[]
}

export interface RuleConditions {
  operator: ConditionOperator
  conditions: RuleCondition[]
}
```

---

## 3. Flux de traitement d'un événement

```
[Déclencheur]
    │
    ├── Cron quotidien (échéances cautions / marchés / documents)
    ├── Server Action (changement statut marché)
    └── Server Action SAV (création ticket, escalade, SLA breach)
    │
    ▼
publishEvent(type, sourceModule, referenceId, payload)
    → INSERT AlertEvent
    │
    ▼
processEvent(eventId)   ← appelé immédiatement après publish (synchrone)
    │
    ├── findMatchingRules(eventType)   ← WHERE isActive = true
    │       └── evaluateConditions(rule.conditions, payload)
    │
    ├── Pour chaque règle matchée :
    │       ├── resolveRecipients(targetRoles, targetUserIds)
    │       │       → User.findMany WHERE role IN targetRoles OR id IN targetUserIds
    │       │
    │       └── Pour chaque destinataire × canal :
    │               ├── buildDeduplicationKey(eventType, referenceId, ruleId, windowDate)
    │               ├── CHECK @@unique → skip si déjà envoyé (idempotence)
    │               ├── INSERT AlertNotification (status: PENDING)
    │               ├── dispatch canal :
    │               │       ├── EMAIL   → Nodemailer (template HTML)
    │               │       ├── IN_APP  → statut PENDING (lu via polling 30s)
    │               │       └── WEBHOOK → fetch(webhookUrl, JSON payload)
    │               └── UPDATE AlertNotification (status: SENT|FAILED, sentAt, deliveryLog)
    │
    ▼
UPDATE AlertEvent.processedAt = now()
```

### Évaluation des conditions

```typescript
// Exemple de conditions stockées en JSON
{
  "operator": "AND",
  "conditions": [
    { "field": "joursRestants", "op": "lte", "value": 7 },
    { "field": "statut",        "op": "eq",  "value": "ACTIVE" }
  ]
}

// Opérateurs supportés
// eq, neq, gt, gte, lt, lte → comparaison scalaire
// in, nin                    → comparaison dans tableau
```

---

## 4. Architecture des fichiers

```
lib/
  alertes/
    types.ts                   ← enums et interfaces partagés
    engine/
      publish-event.ts         ← point d'entrée unique : publishEvent()
      process-event.ts         ← orchestre règles → dispatch canaux
      rule-evaluator.ts        ← évalue conditions JSON vs payload
      recipient-resolver.ts    ← résout roles + userIds → liste destinataires
    channels/
      email-channel.ts         ← envoi email via Nodemailer
      inapp-channel.ts         ← insert AlertNotification IN_APP
      webhook-channel.ts       ← fetch vers URL externe

app/api/
  notifications/
    route.ts                   ← GET (non lues du user) + PATCH bulk read
    [id]/
      route.ts                 ← PATCH (mark as read)

app/(dashboard)/admin/
  alertes/
    page.tsx                   ← existant conservé (envoi manuel)
    rules/
      page.tsx                 ← liste des règles CRUD
      new/
        page.tsx               ← créer une règle
      [id]/
        edit/
          page.tsx             ← éditer une règle
    history/
      page.tsx                 ← historique AlertNotification (filtres status/canal/date)

components/admin/alertes/
  rule-builder/
    rule-form.tsx              ← formulaire principal Rule Builder
    condition-editor.tsx       ← ajout/suppression/édition conditions
    recipient-picker.tsx       ← sélection rôles + utilisateurs
    channel-selector.tsx       ← checkboxes canaux + champ webhook URL
  notifications/
    notification-bell.tsx      ← icône cloche sidebar + badge compteur
    notification-panel.tsx     ← panel déroulant liste notifications
```

---

## 5. Stratégie de migration (zéro régression)

| Phase | Action | Impact sur l'existant |
|-------|--------|-----------------------|
| **1** | Migration Prisma : ajouter `AlertEvent`, `AlertRule`, `AlertNotification` | Aucun — additive |
| **2** | Développer `lib/alertes/engine/` + `lib/alertes/channels/` | Aucun — nouveau code |
| **3** | Seeder les règles par défaut (équivalent comportement actuel) | Backward compat garantie |
| **4** | Brancher le cron sur `publishEvent()` (remplace `sendDailyAlertsEmail()`) | Même résultat, nouveau moteur |
| **5** | Brancher SAV + statuts marchés + documents sur `publishEvent()` | Additif |
| **6** | Pages Rule Builder + Historique + Cloche notification | Additif |
| **7** | Archiver `AlerteDestinataire` + ancien dashboard | Nettoyage final |

---

## 6. Règles par défaut (seed phase 3)

| Nom | Event Type | Conditions | Canaux | Rôles cibles |
|-----|-----------|-----------|--------|-------------|
| Caution critique | CAUTION_EXPIRING | joursRestants ≤ 7 AND statut = ACTIVE | EMAIL, IN_APP | ADMIN, AVANCE |
| Caution attention | CAUTION_EXPIRING | joursRestants ≤ 30 AND joursRestants > 7 AND statut = ACTIVE | EMAIL, IN_APP | ADMIN, AVANCE |
| Marché fin imminente | MARCHE_EXPIRING | joursRestants ≤ 14 | EMAIL, IN_APP | ADMIN, AVANCE, EXPLOITATION |
| Marché fin proche | MARCHE_EXPIRING | joursRestants ≤ 60 AND joursRestants > 14 | EMAIL, IN_APP | ADMIN, AVANCE |
| Ticket SAV créé | SAV_TICKET_CREATED | — | IN_APP | ADMIN, EXPLOITATION |
| Ticket SAV critique | SAV_TICKET_ESCALATED | — | EMAIL, IN_APP | ADMIN, AVANCE, EXPLOITATION |
| SLA SAV dépassé | SAV_SLA_BREACH | — | EMAIL, IN_APP | ADMIN, AVANCE |
| Document expirant | DOCUMENT_EXPIRING | joursRestants ≤ 30 | EMAIL, IN_APP | ADMIN, AVANCE |

---

## 7. In-app notifications (cloche sidebar)

- **Stockage** : `AlertNotification` avec `channel = "IN_APP"`, `status = "PENDING"` (non lue)
- **Polling** : `GET /api/notifications` toutes les 30s depuis `NotificationBell`
- **Lecture** : `PATCH /api/notifications/[id]/route.ts` → `status = "READ"`, `readAt = now()`
- **Badge** : compteur des `status = "PENDING"` pour l'utilisateur connecté
- **Panel** : liste les 20 dernières notifications avec lien vers l'entité source

---

## 8. Plan de tests

| Niveau | Cas à couvrir |
|--------|--------------|
| Unitaire | `rule-evaluator.ts` — tous les opérateurs (eq, lte, in…) |
| Unitaire | `recipient-resolver.ts` — résolution rôles + users |
| Unitaire | `process-event.ts` — idempotence (appel 2× = 1 seul envoi) |
| Intégration | `publishEvent()` → INSERT AlertEvent → notifications créées |
| Intégration | Canal EMAIL → Nodemailer mock → deliveryLog |
| Intégration | Canal WEBHOOK → fetch mock → statut SENT/FAILED |
| E2E | Créer une règle depuis l'UI → vérifier déclenchement |
| E2E | Cloche in-app → badge incrémente → lecture → badge disparaît |

---

## 9. Risques techniques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Timeout Vercel (10s) si beaucoup d'événements à traiter simultanément | Moyen | Moyen | Limiter le batch cron à 100 événements/run, log les dépassements |
| Condition JSON mal configurée (champ inexistant) | Faible | Moyen | Validation Zod au save de la règle + try/catch dans evaluateConditions |
| Spam utilisateur si cooldown mal configuré | Faible | Élevé | Cooldown 24h par défaut non modifiable en dessous de 60min |
| Webhook externe indisponible | Moyen | Faible | Timeout 5s sur fetch, statut FAILED logué, pas de retry bloquant |
| Migration casse l'existant | Faible | Élevé | Phase 1-3 purement additive, feature flag si besoin |

---

## 10. Critères de succès

- ✅ Choisir précisément quelles informations sont envoyées (Rule Builder)
- ✅ Envoyer différentes alertes à différentes entités pour un même événement
- ✅ Ajouter facilement de nouvelles règles sans refactor majeur
- ✅ Visibilité complète sur tout ce qui a été notifié (historique)
- ✅ Zéro doublon (idempotence via `deduplicationKey` unique)
- ✅ Zéro régression (migration additive par phases)
