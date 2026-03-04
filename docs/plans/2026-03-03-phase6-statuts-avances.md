# Phase 6 — Statuts Avancés (Design)

**Date** : 2026-03-03
**Durée estimée** : ~10h
**Priorité** : BASSE (dernière phase V1)
**Branche** : `feature/v1-professionnaliser`

---

## Contexte

La Phase 1 a posé les bases (table `historique_statuts`, composant timeline, matrice de transitions `workflow-statuts.ts`). Phase 6 complète le cycle en ajoutant l'**interface de mutation** : le changement de statut interactif depuis la fiche marché.

**Ce qui existe déjà :**
- `HistoriqueStatut` — table Prisma + migration prod
- `lib/utils/workflow-statuts.ts` — `isTransitionValid`, `getAvailableStatuts`, `isTerminal`
- `components/marches/marche-historique-statuts.tsx` — timeline lecture seule
- `components/marches/statut-badge.tsx` — badge affichage

**Ce qui manque :**
- SA `changerStatutMarche` avec transaction + validations métier
- UI Sheet de changement de statut (stepper visuel + select + commentaire)
- Intégration dans la fiche marché avec contrôle de rôle

## Décisions de design

- **Pas de notifications email** : le système d'alertes existant (`MARCHE_STATUS_CHANGED`) couvre ce besoin — ajouter un email hard-codé créerait des doublons avec le Rule Builder.
- **Pattern Sheet** (pas Dialog) : cohérent avec l'existant (SAV, documents), plus d'espace pour le stepper à 14 statuts.
- **Permissions** : bouton visible pour ADMIN et AVANCE seulement.

---

## Architecture

### Nouveaux fichiers

| Fichier | Description |
|---------|-------------|
| `lib/actions/statuts.ts` | SA `changerStatutMarche(marcheId, newStatut, commentaire)` |
| `components/marches/statut-changer-button.tsx` | Bouton + Sheet complet (client component) |

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `lib/utils/workflow-statuts.ts` | Ajouter `COMMENTAIRE_OBLIGATOIRE[]`, `TRANSITIONS_LABELS` |
| `components/marches/marche-detail.tsx` (ou page détail) | Intégrer `StatutChangerButton` conditionnel |

### Flux de données

```
[StatutChangerButton] → ouvre Sheet
  → StatutWorkflowStepper (visuel chemin + branches terminales)
  → Select filtré via getAvailableStatuts(currentStatut)
  → si statut terminal ciblé → commentaire obligatoire
  → submit → changerStatutMarche() SA
    → isTransitionValid() — erreur si invalide
    → vérif cautions ACTIVE si CLOTURE
    → prisma.$transaction([
        update marche.statut,
        create historiqueStatut
      ])
    → revalidatePath('/marches/[id]')
  → toast success + Sheet fermé
```

---

## UX du Sheet

```
┌─────────────────────────────────────┐
│ Changer le statut                 × │
├─────────────────────────────────────┤
│ Statut actuel                        │
│ [Badge: EN_EXECUTION]                │
│                                      │
│ ── Workflow ──────────────────────   │
│  ✓ OFFRE_DEPOSEE                     │
│  ✓ EN_ATTENTE_ATTRIBUTION            │
│  ● EN_EXECUTION          ← actuel   │
│  ○ EXECUTE_ATTENTE_GARANTIES         │
│  ○ RESILIE  (branche latérale)       │
│                                      │
│ Nouveau statut *                     │
│ [Select — transitions autorisées]    │
│                                      │
│ Commentaire / Motif *                │
│ [Textarea — obligatoire si terminal] │
│                                      │
│        [Annuler] [Confirmer →]       │
└─────────────────────────────────────┘
```

**Stepper visuel :** chemin principal vertical (statuts séquentiels), branches latérales pour les terminaux (RESILIE, ANNULE, INFRUCTUEUX). Composant inline avec `ol` + icônes Lucide (`Check`, `Circle`, `X`).

---

## Validations métier

| Condition | Blocage | Message utilisateur |
|-----------|---------|---------------------|
| Transition non autorisée par la matrice | ❌ serveur | "Transition interdite" |
| CLOTURE avec cautions `ACTIVE` | ❌ serveur | "X caution(s) active(s) — libérez-les avant de clôturer" |
| Statut terminal → commentaire vide | ❌ client | "Commentaire obligatoire pour cette transition" |
| Rôle EXPLOITATION / VISITEUR | Bouton masqué | — |

**Cas RESILIE :** label textarea = "Motif de résiliation" (obligatoire).

---

## Plan d'implémentation

| # | Tâche | Durée |
|---|-------|-------|
| T1 | `lib/actions/statuts.ts` — SA + transaction Prisma + vérif cautions | 2h |
| T2 | `lib/utils/workflow-statuts.ts` — `COMMENTAIRE_OBLIGATOIRE`, `TRANSITIONS_LABELS` | 0.5h |
| T3 | `components/marches/statut-changer-button.tsx` — Sheet + Select + Textarea conditionnelle | 3h |
| T4 | `StatutWorkflowStepper` (inline Sheet) — chemin principal + branches terminales | 2h |
| T5 | Intégration `marche-detail.tsx` — bouton conditionnel selon rôle | 1h |
| T6 | Tests Playwright prod — transition valide, blocage interdit, blocage caution active | 1.5h |

**Total : ~10h**

## Hors périmètre

- Notifications email (système alertes existant)
- Rétro-transitions (rollback)
- Changement de statut en masse
