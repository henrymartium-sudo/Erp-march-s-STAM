# Design — Refonte Opportunités / Marchés

**Date** : 2026-03-06
**Statut** : Validé
**Auteur** : Claude (session brainstorming)

---

## Contexte

L'application couvre actuellement deux modules — Opportunités et Marchés — avec un chevauchement de logique métier : les statuts `OPPORTUNITE_IDENTIFIEE`, `DOSSIER_EN_PREPARATION`, `OFFRE_DEPOSEE`, `EN_ATTENTE_ATTRIBUTION` et `ATTRIBUE_PROVISOIREMENT` du module Marchés décrivent la même réalité que les statuts du module Opportunités.

**Objectif** : clarifier les responsabilités des deux modules, étendre le module Opportunités pour couvrir tout le cycle pré-attribution, et restreindre le module Marchés à la phase post-attribution.

---

## Décisions architecturales

### Stratégie de migration des données existantes : Grandfather Clause (Option B)

- **Aucune modification** des données existantes (62 marchés, 245M XOF, cautions, documents, historiques)
- L'enum `StatutMarche` est **conservé intégralement** — zéro risque de casse sur Reporting, Alertes, HistoriqueStatut
- Les marchés existants en statuts pré-attribution restent fonctionnels, marqués visuellement "Dossier pré-attribution"
- Un bouton optionnel "Convertir en opportunité" est disponible sur ces marchés (jamais forcé)
- Les marchés legacy vieillissent naturellement vers leurs statuts terminaux

### Point de bascule entre les deux modules

Tout le cycle pré-attribution appartient au module Opportunités, jusqu'à `GAGNEE` inclus. Le module Marchés démarre à `ATTRIBUE_DEFINITIVEMENT`.

### Statuts négatifs : fusion PERDUE + INFRUCTUEUX

`INFRUCTUEUX` est supprimé du module Opportunités. Il n'existe qu'un seul statut terminal négatif : `PERDUE`. Les métadonnées associées (motif, concurrent gagnant, montant) sont portées par des champs optionnels sur le modèle `Opportunite`.

---

## Schéma Prisma

### `StatutOpportunite` — enum remplacé

```prisma
enum StatutOpportunite {
  EN_ANALYSE              // Point d'entrée (remplace IDENTIFIEE)
  GO
  NO_GO                   // Terminal
  DOSSIER_EN_PREPARATION  // Nouveau
  OFFRE_SOUMISE           // Renommé depuis SOUMISE
  EN_ATTENTE_ATTRIBUTION  // Nouveau
  ATTRIBUE_PROVISOIREMENT // Nouveau
  GAGNEE                  // Terminal — déclenche la création du Marché
  PERDUE                  // Terminal — fusionne PERDUE + INFRUCTUEUX
}
```

### `StatutMarche` — inchangé

Aucune valeur supprimée. Les valeurs pré-attribution restent dans l'enum pour compatibilité avec les données existantes mais ne sont plus accessibles à la création.

### Nouveaux champs sur `Opportunite`

```prisma
model Opportunite {
  // ... champs existants ...
  motifPerte             String?           @db.Text
  concurrentGagnant      String?
  montantOffreConcurrent Decimal?          @db.Decimal(15, 2)
}
```

### Nouveau champ sur `Marche` (lien bidirectionnel)

```prisma
model Marche {
  // ... champs existants ...
  opportuniteId  String?
  opportunite    Opportunite? @relation(fields: [opportuniteId], references: [id], onDelete: SetNull)
}
```

`onDelete: SetNull` : la suppression d'une opportunité ne cascade pas sur le marché.

---

## Workflow Opportunités

```
EN_ANALYSE
  ├── NO_GO  (terminal)
  └── GO
        └── DOSSIER_EN_PREPARATION
              └── OFFRE_SOUMISE
                    └── EN_ATTENTE_ATTRIBUTION
                          ├── PERDUE  (terminal)
                          └── ATTRIBUE_PROVISOIREMENT
                                └── GAGNEE  (terminal → crée le Marché)
```

### Transitions autorisées

| Depuis | Vers |
|--------|------|
| EN_ANALYSE | GO, NO_GO |
| GO | DOSSIER_EN_PREPARATION, NO_GO |
| NO_GO | — (terminal) |
| DOSSIER_EN_PREPARATION | OFFRE_SOUMISE |
| OFFRE_SOUMISE | EN_ATTENTE_ATTRIBUTION |
| EN_ATTENTE_ATTRIBUTION | ATTRIBUE_PROVISOIREMENT, PERDUE |
| ATTRIBUE_PROVISOIREMENT | GAGNEE, PERDUE |
| GAGNEE | — (terminal) |
| PERDUE | — (terminal) |

### Commentaire obligatoire

`PERDUE` et `NO_GO` requièrent un commentaire obligatoire lors de la transition.

---

## Workflow Marchés (point d'entrée modifié)

Statut de départ d'un nouveau marché : **`ATTRIBUE_DEFINITIVEMENT`** (valeur fixe, non modifiable à la création).

```
ATTRIBUE_DEFINITIVEMENT
  └── EN_ATTENTE_LIVRAISON_OS
        └── EN_EXECUTION
              └── EXECUTE_ATTENTE_GARANTIES
                    └── CLOTURE  (terminal)
              ├── RESILIE  (terminal)
              └── ANNULE   (terminal)
```

Les statuts `OPPORTUNITE_IDENTIFIEE`, `DOSSIER_EN_PREPARATION`, `OFFRE_DEPOSEE`, `EN_ATTENTE_ATTRIBUTION`, `ATTRIBUE_PROVISOIREMENT` restent dans `workflow-statuts.ts` pour les marchés legacy mais sont retirés du `CHEMIN_PRINCIPAL` affiché dans le stepper.

---

## Lien bidirectionnel Opportunité ↔ Marché

### Création d'un marché depuis une opportunité GAGNEE

Sur la page détail d'une opportunité en statut `GAGNEE` :
- Bouton **"Créer le marché"** — ouvre le formulaire marché pré-rempli (objet, autorité contractante, montant estimé)
- Le marché créé démarre à `ATTRIBUE_DEFINITIVEMENT`
- Les deux FK sont établies : `opportunite.marcheId` + `marche.opportuniteId`

### Affichage

**Page Opportunité** (statut GAGNEE) :
> Marché lié : N°2025-001 — [objet] · [Voir le marché →]

**Page Marché** (issu d'une opportunité) :
> Opportunité d'origine : [référence] — [objet] · [Voir l'opportunité →]

Si pas de lien (marchés legacy non convertis), la section n'apparaît pas.

### Marchés legacy pré-attribution

- Badge discret **"Dossier pré-attribution"** sur la page détail et dans la liste
- Bouton optionnel **"Convertir en opportunité"** : crée une opportunité en `EN_ANALYSE` pré-remplie avec les données du marché, établit le lien — sans modifier les données existantes du marché

---

## Migration de données

Une seule opération SQL, appliquée via `apply_migration` :

```sql
UPDATE opportunites SET statut = 'EN_ANALYSE' WHERE statut = 'IDENTIFIEE';
```

Les 11 opportunités actuellement en `IDENTIFIEE` passent en `EN_ANALYSE`. Aucune autre modification de données.

---

## Compatibilité systèmes existants

| Système | Impact | Action |
|---------|--------|--------|
| `ReportingRule.statutGroups` | Aucun — strings libres, enum StatutMarche inchangé | Rien |
| Alertes existantes | Aucun — basées sur eventType libres | Rien |
| `HistoriqueStatut` | Aucun — couvre uniquement les Marchés | Rien |
| AuditLog | Extension | Logger `ancienStatut`/`nouveauStatut` dans `changerStatutOpportunite` |
| Nouvel event alertes | Ajout | `OPPORTUNITE_STATUS_CHANGED` publié depuis `changerStatutOpportunite` |
| `workflow-statuts.ts` | Évolution | Créer `workflow-statuts-opportunite.ts` symétrique |

---

## Hors scope

- Export PDF/Excel pour les opportunités
- Reporting Email sur les statuts d'opportunités
- Historique de statuts dédié pour les opportunités (couvert par AuditLog)
- Interface de migration en masse des marchés legacy

---

## Fichiers impactés (estimation)

```
prisma/schema.prisma
prisma/migrations/...

lib/utils/workflow-statuts-opportunite.ts   (nouveau)
lib/utils/workflow-statuts.ts               (CHEMIN_PRINCIPAL épuré)
lib/validations/opportunite.ts
lib/actions/opportunites.ts
lib/actions/statuts-opportunite.ts          (nouveau — changerStatutOpportunite)
lib/actions/marches.ts                      (point d'entrée statut)

app/(dashboard)/opportunites/               (pages + composants)
app/(dashboard)/marches/                    (formulaire création + badge legacy)

components/opportunites/statut-changer-button.tsx  (nouveau)
components/opportunites/opportunite-form.tsx
components/marches/marche-form.tsx
components/marches/marche-detail.tsx
```
