# Tests E2E — Module Alertes

Guide complet pour comprendre, lancer et interpréter les tests du système d'alertes de l'ERP Marchés STAM.

---

## Table des matières

1. [Architecture du système d'alertes](#1-architecture-du-système-dalertes)
2. [Comment fonctionne le cron](#2-comment-fonctionne-le-cron)
3. [Les types d'événements](#3-les-types-dévénements)
4. [Le moteur de règles (conditions)](#4-le-moteur-de-règles-conditions)
5. [Lancer les tests](#5-lancer-les-tests)
6. [Description de chaque test](#6-description-de-chaque-test)
7. [Interpréter les résultats](#7-interpréter-les-résultats)
8. [Recettes de règles recommandées](#8-recettes-de-règles-recommandées)
9. [Dépannage courant](#9-dépannage-courant)

---

## 1. Architecture du système d'alertes

Le système d'alertes repose sur **3 tables Prisma** et un **moteur événementiel** :

```
AlertEvent         →   AlertRule          →   AlertNotification
(ce qui s'est       (la règle qui filtre   (la notification
 passé dans         et décide si on         effectivement
 l'application)     doit alerter)           envoyée)
```

### Flux complet d'une alerte

```
Cron 7h00 (Vercel)
    │
    ▼
runDailyAlertsCron()          ← scanne la DB
    │  ├─ Cautions ACTIVE expirant dans 30j
    │  └─ Marchés EN_EXECUTION finissant dans 60j
    │
    ▼
publishEvent(type, module, id, payload)
    │
    ▼
processEvent(event)
    │
    ├─ Charge toutes les AlertRule actives pour ce type
    │
    ├─ Pour chaque règle → evaluateConditions(règle, payload)
    │       │  AND : toutes les conditions doivent être vraies
    │       └─ OR  : au moins une condition doit être vraie
    │
    └─ Si match → notifier via les canaux configurés
            ├─ EMAIL    → Nodemailer → SMTP Gmail
            ├─ IN_APP   → AlertNotification en DB (cloche)
            └─ WEBHOOK  → HTTP POST vers URL externe
```

### Tables importantes

| Table | Rôle |
|-------|------|
| `AlertRule` | Les règles configurées par l'admin |
| `AlertEvent` | Journal des événements survenus |
| `AlertNotification` | Notifications émises (avec statut PENDING/SENT/FAILED/READ) |
| `AlerteDestinataire` | Liste des destinataires pour l'envoi manuel |

---

## 2. Comment fonctionne le cron

### Déclenchement automatique

Le cron est défini dans `vercel.json` :

```json
{
  "crons": [{
    "path": "/api/cron/daily-alerts",
    "schedule": "0 7 * * *"
  }]
}
```

**Heure d'exécution** : tous les jours à **7h00 UTC** (8h ou 9h en France selon l'heure d'été).

### Sécurité du cron

L'endpoint `/api/cron/daily-alerts` est protégé par un **Bearer token** :

```
Authorization: Bearer {CRON_SECRET}
```

Sans ce header, le serveur retourne **401 Unauthorized**. C'est ce que vérifie le test 1.4.

### Endpoint de test (sans envoi d'email)

Pour inspecter les alertes **sans déclencher d'emails**, utilise :

```
GET /api/test-alerts
```

Cet endpoint est public (pas d'auth requise) et retourne :

```json
{
  "success": true,
  "data": {
    "cautions": [ { "id": "...", "reference": "...", "joursRestants": 12 } ],
    "marches":  [ { "id": "...", "reference": "N°00366", "joursRestants": 45 } ],
    "emailPreview": { "subject": "...", "recipients": ["..."] },
    "summary": { "cautionsCount": 1, "marchesCount": 0, "totalAlerts": 1 }
  }
}
```

---

## 3. Les types d'événements

| Type d'événement | Code | Quand se déclenche-t-il ? |
|------------------|------|--------------------------|
| Caution proche de l'échéance | `CAUTION_EXPIRING` | Cron quotidien — caution ACTIVE expirant dans ≤ 30 jours |
| Marché en fin d'exécution | `MARCHE_EXPIRING` | Cron quotidien — marché EN_EXECUTION finissant dans ≤ 60 jours |
| Changement de statut marché | `MARCHE_STATUS_CHANGED` | Temps réel — lors de la mise à jour du statut d'un marché |
| Ticket SAV créé | `SAV_TICKET_CREATED` | Temps réel — lors de la création d'un ticket SAV |
| Ticket SAV escaladé | `SAV_TICKET_ESCALATED` | Temps réel — lors de l'escalade d'un ticket |
| Dépassement SLA SAV | `SAV_SLA_BREACH` | Temps réel — quand le délai SLA est dépassé |
| Document expirant | `DOCUMENT_EXPIRING` | Non encore implémenté (prévu V2) |

### Champs disponibles par événement

Ces champs sont utilisés dans les conditions des règles :

**CAUTION_EXPIRING** :
- `joursRestants` (nombre) — jours avant expiration
- `statut` (enum) — ACTIVE, LIBEREE, APPELEE, EXPIREE
- `montant` (nombre) — montant en XOF

**MARCHE_EXPIRING** :
- `joursRestants` (nombre) — jours avant fin d'exécution
- `statut` (enum) — EN_EXECUTION, EN_ATTENTE_LIVRAISON_OS, ATTRIBUE

**MARCHE_STATUS_CHANGED** :
- `ancienStatut` (enum) — le statut avant la modification
- `nouveauStatut` (enum) — le statut après la modification

**SAV_SLA_BREACH** :
- `heuresDepassement` (nombre) — nombre d'heures de dépassement

---

## 4. Le moteur de règles (conditions)

### Opérateurs logiques

| Opérateur | Comportement |
|-----------|-------------|
| **AND** | **Toutes** les conditions doivent être vraies pour déclencher |
| **OR** | **Au moins une** condition doit être vraie pour déclencher |

> **Règle sans condition** : se déclenche **toujours** pour chaque événement du type sélectionné.

### Opérateurs de comparaison

| Code | Signification | Exemple |
|------|--------------|---------|
| `eq` | Égal à | `statut eq ACTIVE` |
| `neq` | Différent de | `statut neq LIBEREE` |
| `gt` | Supérieur à | `joursRestants gt 7` |
| `gte` | Supérieur ou égal | `montant gte 5000000` |
| `lt` | Inférieur à | `joursRestants lt 30` |
| `lte` | Inférieur ou égal | `joursRestants lte 7` |
| `in` | Parmi une liste | `statut in [ACTIVE, APPELEE]` |
| `nin` | Pas dans la liste | `statut nin [LIBEREE, EXPIREE]` |

### Canaux de notification

| Canal | Comportement |
|-------|-------------|
| **EMAIL** | Envoie un email HTML via SMTP (Nodemailer/Gmail) |
| **IN_APP** | Crée une `AlertNotification` en DB → visible dans la cloche 🔔 |
| **WEBHOOK** | Envoie un HTTP POST JSON vers une URL externe (Slack, Teams, etc.) |

### Paramètres avancés des règles

| Paramètre | Défaut | Signification |
|-----------|--------|--------------|
| **Priorité** | 1 | De 1 (urgent) à 10 (faible) — ordre d'affichage |
| **Cooldown** | 1440 min (24h) | Délai minimum entre deux déclenchements de la même règle |

---

## 5. Lancer les tests

### Prérequis

```bash
# S'assurer que les dépendances sont installées
npm install

# Playwright installé
npx playwright install chromium
```

### En local

```bash
# Démarrer l'application d'abord
npm run dev

# Lancer les tests alertes (local, port 3000)
npx playwright test tests/alertes/cron-prod.spec.ts --project=chromium
```

### En production

```bash
# Pointer vers la production
PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app \
  npx playwright test tests/alertes/cron-prod.spec.ts --project=chromium
```

### Lancer une suite spécifique

```bash
# Suite 1 uniquement (API Cron)
PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app \
  npx playwright test tests/alertes/cron-prod.spec.ts \
  --grep "Suite 1" --project=chromium

# Suite 3 uniquement (Combinaisons de règles)
PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app \
  npx playwright test tests/alertes/cron-prod.spec.ts \
  --grep "Suite 3" --project=chromium
```

### Lancer un test précis

```bash
# Test 1.1 uniquement
PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app \
  npx playwright test tests/alertes/cron-prod.spec.ts \
  --grep "1.1" --project=chromium

# Test 3.3 (règle AND)
PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app \
  npx playwright test tests/alertes/cron-prod.spec.ts \
  --grep "3.3" --project=chromium
```

### Voir le rapport HTML

```bash
npx playwright show-report
```

---

## 6. Description de chaque test

### Suite 1 — API Cron (HTTP direct)

Ces tests appellent les endpoints directement **sans navigateur**, via le contexte `request` de Playwright. Ils sont rapides et ne modifient rien en base.

| Test | Ce qu'il vérifie |
|------|-----------------|
| **1.1** | `/api/test-alerts` répond 200 avec la structure `{ cautions, marches, summary }` |
| **1.2** | Chaque caution a les champs attendus ET `joursRestants` entre 0 et 30 |
| **1.3** | Chaque marché a les champs attendus ET `joursRestants` entre 0 et 60 |
| **1.4** | `/api/cron/daily-alerts` sans header Authorization → **401** (sécurité) |
| **1.5** | `/api/cron/daily-alerts` avec faux token → **401** (sécurité) |
| **1.6** | `/api/notifications` répond (200 ou 401 selon auth) |

### Suite 2 — Dashboard Alertes (UI)

Tests d'interface sur la page `/admin/alertes`.

| Test | Ce qu'il vérifie |
|------|-----------------|
| **2.1** | La page se charge avec titre, cartes navigation, sections timeline et envoi manuel |
| **2.2** | La timeline affiche des alertes OU un message "aucune échéance urgente" |
| **2.3** | Le lien "Règles d'alerte" navigue vers `/admin/alertes/rules` |
| **2.4** | Le lien "Historique" navigue vers `/admin/alertes/history` |

### Suite 3 — Combinaisons de règles (Rule Builder)

Ces tests créent des règles réelles en production, vérifient qu'elles apparaissent dans la liste, puis les **suppriment automatiquement** (nettoyage).

| Test | Combinaison testée |
|------|-------------------|
| **3.1** | `CAUTION_EXPIRING` + `joursRestants <= 7` (alerte critique) |
| **3.2** | `MARCHE_EXPIRING` + `joursRestants <= 30` + 2 canaux + 2 rôles |
| **3.3** | `CAUTION_EXPIRING` + **AND** (`joursRestants <= 14` ET `montant >= 5M`) |
| **3.4** | `MARCHE_EXPIRING` + **OR** (`joursRestants <= 7` OU `joursRestants <= 30`) |
| **3.5** | `MARCHE_STATUS_CHANGED` + `nouveauStatut = EN_EXECUTION` (enum select) |
| **3.6** | Toggle actif/inactif sur une règle existante (A/B puis retour état initial) |
| **3.7** | Recette "Caution critique" pré-remplit correctement le formulaire |
| **3.8** | Règle **sans condition** = se déclenche toujours |

### Suite 4 — Historique des notifications

| Test | Ce qu'il vérifie |
|------|-----------------|
| **4.1** | Page `/admin/alertes/history` accessible avec compteur visible |
| **4.2** | Table avec colonnes (si notifications existent) OU message vide |
| **4.3** | `/api/notifications` répond avec données ou protégé par auth |

---

## 7. Interpréter les résultats

### Tests PASS attendus (état nominal production)

```
✅ Suite 1 — API Cron
   1.1 PASS — /api/test-alerts retourne 200
   1.2 PASS — champs cautions complets (0 caution = normal)
   1.3 PASS — champs marchés complets (0 marché = normal)
   1.4 PASS — cron protégé (401 sans auth)
   1.5 PASS — cron protégé (401 faux token)
   1.6 PASS — /api/notifications accessible

✅ Suite 2 — Dashboard
   2.1 PASS — page chargée
   2.2 PASS — timeline cohérente
   2.3 PASS — navigation vers règles
   2.4 PASS — navigation vers historique

✅ Suite 3 — Rule Builder (création + suppression automatique)
   3.1 à 3.8 PASS — règles créées, visibles, supprimées

✅ Suite 4 — Historique
   4.1 à 4.3 PASS
```

### Signification des logs console

| Log | Signification |
|-----|--------------|
| `📊 Alertes actuelles : Cautions 0, Marchés 0` | Aucune échéance urgente = **état idéal** |
| `📊 Cautions proches échéance : 2` | 2 cautions expirent dans 30 jours → **action requise** |
| `📋 Marché N°00366 — fin dans 45j` | Ce marché expire dans 45 jours |
| `🔒 Protection cron — statut sans auth : 401` | Le cron est bien protégé |
| `✅ Règle créée` + `🗑️ Règle de test supprimée` | Test 3.x propre, aucune trace en DB |

### Interprétation selon le nombre d'alertes

| `totalAlerts` | Signification | Action |
|---------------|--------------|--------|
| **0** | Aucune échéance critique → parfait | Rien à faire |
| **1-3** | Quelques items à surveiller | Vérifier les détails dans le dashboard |
| **> 3** | Beaucoup d'items urgents | Envoyer un email manuel depuis `/admin/alertes` |

---

## 8. Recettes de règles recommandées

Ces recettes sont les meilleures pratiques pour l'ERP STAM. Tu peux les créer depuis `/admin/alertes/rules/new`.

### Recette 1 — Caution critique (≤ 7 jours)

```
Événement : Caution proche de l'échéance
Opérateur : AND
Conditions :
  - joursRestants <= 7
Canaux    : EMAIL + IN_APP
Rôles     : ADMIN + AVANCE
Priorité  : 1
Cooldown  : 1440 min (24h)
```

**Effet** : Alerte email + notification cloche quand une caution expire dans 7 jours ou moins.

---

### Recette 2 — Caution attention (≤ 30 jours)

```
Événement : Caution proche de l'échéance
Opérateur : AND
Conditions :
  - joursRestants <= 30
  - joursRestants > 7       ← pour ne pas doubler avec "Critique"
Canaux    : IN_APP
Rôles     : ADMIN + AVANCE + EXPLOITATION
Priorité  : 3
Cooldown  : 10080 min (7 jours)
```

**Effet** : Notification silencieuse (pas d'email) quand une caution expire dans 8 à 30 jours.

---

### Recette 3 — Marché en fin d'exécution (≤ 30 jours)

```
Événement : Marché en fin d'exécution
Opérateur : AND
Conditions :
  - joursRestants <= 30
Canaux    : EMAIL + IN_APP
Rôles     : ADMIN + AVANCE
Priorité  : 2
Cooldown  : 10080 min (7 jours)
```

**Effet** : Alerte hebdomadaire pour les marchés qui se terminent dans 30 jours.

---

### Recette 4 — Marché attribué (événement temps réel)

```
Événement : Changement de statut marché
Opérateur : AND
Conditions :
  - nouveauStatut = ATTRIBUE
Canaux    : EMAIL + IN_APP
Rôles     : ADMIN + AVANCE + EXPLOITATION
Priorité  : 1
Cooldown  : 0 min (immédiat)
```

**Effet** : Notification immédiate quand un marché passe au statut "Attribué".

---

### Recette 5 — Grosse caution critique (montant ≥ 5M XOF + ≤ 7j)

```
Événement : Caution proche de l'échéance
Opérateur : AND
Conditions :
  - joursRestants <= 7
  - montant >= 5000000
Canaux    : EMAIL + IN_APP
Rôles     : ADMIN
Priorité  : 1
Cooldown  : 1440 min
```

**Effet** : Escalade uniquement pour les grosses cautions critiques (évite le bruit pour les petits montants).

---

## 9. Dépannage courant

### Test 1.4 retourne 500 au lieu de 401

**Cause** : La variable `CRON_SECRET` n'est pas configurée en production.

**Fix** :
```bash
printf "%s" "votre-secret-ici" | vercel env add CRON_SECRET production
```

---

### Tests 3.x échouent à créer la règle

**Cause possible 1** : Le combobox d'événement ne trouve pas l'option attendue.
- Vérifier que la page `/admin/alertes/rules/new` est accessible avec le compte admin
- Vérifier les logs Playwright pour le texte exact des options

**Cause possible 2** : Timeout de cold start Supabase.
- Augmenter `test.setTimeout(120_000)` à `180_000` si nécessaire

---

### La règle de test n'est pas supprimée automatiquement

Si `_deleteRuleByName()` échoue (structure HTML modifiée), supprime manuellement :
1. Aller sur `/admin/alertes/rules`
2. Filtrer les règles contenant `[TEST]`
3. Les supprimer via l'interface

Les règles de test sont toujours préfixées `[TEST]` pour faciliter le repérage.

---

### Cron ne s'exécute pas automatiquement

**Vérification** : Les crons Vercel ne s'exécutent **qu'en production** (pas en preview/local).

1. Vérifier dans le dashboard Vercel → projet → Settings → Cron Jobs
2. Le cron doit apparaître avec `0 7 * * *` et un état "Active"
3. Vérifier les logs : Vercel → projet → Logs → filtrer par `/api/cron/daily-alerts`

**Test manuel du cron** (avec le vrai secret) :
```bash
curl -H "Authorization: Bearer VOTRE_CRON_SECRET" \
  https://erp-marches-stam.vercel.app/api/cron/daily-alerts
```

---

### Aucune alerte détectée malgré des données en DB

**Vérification** : Les critères de détection du cron sont :
- Cautions : statut **ACTIVE** ET `dateEcheance` entre aujourd'hui et +30 jours
- Marchés : statut **EN_EXECUTION** ou **EXECUTE_ATTENTE_GARANTIES** ET `dateFinPrevue` entre aujourd'hui et +60 jours

Si tes données ne correspondent pas à ces critères, le cron ne produit rien (comportement normal).

---

*Dernière mise à jour : 2026-02-23*
