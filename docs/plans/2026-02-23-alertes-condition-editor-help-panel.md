# Design — ConditionEditor Enum Select + Panel d'aide contextuel
**Date** : 2026-02-23
**Statut** : Approuvé

---

## Objectif

Deux améliorations du module Alertes :
1. **ConditionEditor** : remplacer le champ texte libre par un `Select` (ou `Checkbox` multi) pour les champs dont les valeurs sont connues (enums Prisma)
2. **Panel d'aide contextuel** : afficher un panneau latéral toujours visible qui explique chaque champ et propose des recettes de règles prêtes à l'emploi

---

## 1. ConditionEditor — Enum Select

### Principe
Ajouter un champ optionnel `enumValues?: string[]` dans la définition `FieldDef` de `EVENT_FIELDS` (dans `lib/alertes/types.ts`).

Le `condition-editor.tsx` adapte le rendu selon :
- Champ **sans** `enumValues` → `Input` texte libre (comportement actuel)
- Champ **avec** `enumValues` + opérateur `eq`/`neq` → `Select` shadcn (1 valeur)
- Champ **avec** `enumValues` + opérateur `in`/`nin` → `Popover` + liste de `Checkbox` (multi-valeurs)

### Champs concernés
| Événement | Champ | Valeurs enum |
|-----------|-------|-------------|
| `MARCHE_STATUS_CHANGED` | `ancienStatut`, `nouveauStatut` | 11 valeurs `StatutMarche` |
| `MARCHE_EXPIRING` | `statut` | Subset statuts marché actifs |
| `CAUTION_EXPIRING` | `statut` | ACTIVE, LIBEREE, APPELEE, EXPIREE |

### Labels français pour StatutMarche
```ts
const STATUT_MARCHE_LABELS: Record<string, string> = {
  OPPORTUNITE_IDENTIFIEE:    "Opportunité identifiée",
  EN_COURS_ANALYSE:          "En cours d'analyse",
  SOUMISSION_EN_COURS:       "Soumission en cours",
  SOUMIS:                    "Soumis",
  EN_ATTENTE_ATTRIBUTION:    "En attente d'attribution",
  ATTRIBUE:                  "Attribué",
  EN_EXECUTION:              "En exécution",
  EN_ATTENTE_LIVRAISON_OS:   "En attente livraison OS",
  CLOTURE:                   "Clôturé",
  INFRUCTUEUX:               "Infructueux",
  ANNULE:                    "Annulé",
}
```

### Stockage valeur in/nin
- `RuleCondition.value` supporte déjà `string[]` → stocker un vrai array
- Le moteur `rule-evaluator.ts` gère déjà les arrays pour `in`/`nin`

---

## 2. Panel d'aide contextuel

### Layout
Les pages `new` et `[id]/edit` passent en grille 2 colonnes :
```
<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
  <RuleForm onActiveFieldChange={setActiveField} />
  <AlertesHelpPanel activeField={activeField} />
</div>
```
Sur mobile/tablette (<1024px) : panel affiché en accordéon sous le formulaire.

### Composant AlertesHelpPanel
**Fichier** : `components/admin/alertes/rule-builder/help-panel.tsx`
**Props** : `activeField: string | null`

**Contenu dynamique selon activeField** :

| activeField | Titre | Contenu |
|-------------|-------|---------|
| `null` | Guide rapide | 5 recettes de règles (voir §3) |
| `eventType` | Type d'événement | Explication des 7 types + quand les utiliser |
| `conditions` | Conditions | Les 8 opérateurs avec exemples concrets |
| `ancienStatut`/`nouveauStatut` | Statuts marché | "Valeurs exactes de l'enum StatutMarche" |
| `channels` | Canaux | EMAIL vs IN_APP vs WEBHOOK + cas d'usage |
| `cooldown` | Cooldown | "1440 min = 24h. Évite les doublons quotidiens" |
| `priority` | Priorité | "1 = haute priorité. Affecte le tri historique" |
| `targetRoles` | Destinataires | Explication des 4 rôles |

### Interaction focus
Dans `rule-form.tsx` :
- Chaque section/champ déclenche `onActiveFieldChange('nomDuChamp')` via `onFocus`
- Le state `activeField` est géré dans la page parente (ou dans `rule-form.tsx` avec callback)

---

## 3. Recettes dans l'état repos du panel

5 recettes prêtes à l'emploi avec bouton **"Utiliser ce modèle"** qui pré-remplit le formulaire :

| # | Nom | Événement | Conditions |
|---|-----|-----------|------------|
| 1 | Caution critique | `CAUTION_EXPIRING` | joursRestants ≤ 7, statut = ACTIVE |
| 2 | Marché attribué | `MARCHE_STATUS_CHANGED` | nouveauStatut = ATTRIBUE |
| 3 | Marché fin d'exécution | `MARCHE_EXPIRING` | joursRestants ≤ 30, statut = EN_EXECUTION |
| 4 | SLA SAV dépassé | `SAV_SLA_BREACH` | heuresDepassement ≥ 48 |
| 5 | Document expirant | `DOCUMENT_EXPIRING` | joursRestants ≤ 14 |

---

## 4. Fichiers à modifier / créer

| Fichier | Action |
|---------|--------|
| `lib/alertes/types.ts` | Ajouter `enumValues?` dans `FieldDef`, peupler pour les 3 événements |
| `components/admin/alertes/rule-builder/condition-editor.tsx` | Rendu conditionnel Select / Checkbox-Popover |
| `components/admin/alertes/rule-builder/help-panel.tsx` | CRÉER — panel contextuel |
| `components/admin/alertes/rule-builder/rule-form.tsx` | Ajouter `activeField` state + callbacks `onFocus` + prop `onActiveFieldChange` |
| `app/(dashboard)/admin/alertes/rules/new/page.tsx` | Layout 2 colonnes + state `activeField` |
| `app/(dashboard)/admin/alertes/rules/[id]/edit/page.tsx` | Layout 2 colonnes + state `activeField` |

---

## 5. Contraintes

- Aucune nouvelle dépendance npm — tout dans shadcn/ui existant
- `Popover` + `Checkbox` déjà disponibles dans le projet
- Panel collapsible sur mobile via `Accordion` shadcn ou `details/summary` HTML natif
- Pas de mode sombre (conforme MVP)
- Responsive validé : desktop 1920px, tablette 768px, mobile 375px
