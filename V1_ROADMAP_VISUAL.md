# 🗺️ V1 Roadmap Visuelle - ERP Marchés STAM

**Date** : 2026-02-16
**Durée totale V1** : 116 heures (~3 semaines)
**Statut** : 📋 PLANIFIÉ

---

## 📊 Vue d'Ensemble

```
MVP (98% ✅)  ────────────►  V1 (116h) ────────────►  V2 (Future)
                            ↓
                    Professionnaliser
```

---

## 🎯 Objectifs V1 en 6 Mots

> **Rapports • Filtres • Facturation • Veille • Offres • Statuts**

---

## 📅 Planning Sprint (3 Semaines)

```
┌─────────────┬──────────────┬──────────────┬──────────────┐
│  SEMAINE 1  │  SEMAINE 2   │  SEMAINE 3   │  SEMAINE 4+  │
├─────────────┼──────────────┼──────────────┼──────────────┤
│             │              │              │              │
│  Sprint 1   │  Sprint 2    │  Sprint 3    │  Sprint 4    │
│  PDF (12h)  │ Filtres (16h)│ Factu (20h)  │ Veille (24h) │
│   ✨ HAUTE  │   ✨ HAUTE   │   ✨ HAUTE   │  💡 MOYENNE  │
│             │              │              │              │
│             │              │              │  Sprint 5    │
│             │              │              │ Offre (28h)  │
│             │              │              │  💡 MOYENNE  │
│             │              │              │              │
│             │              │              │  Sprint 6    │
│             │              │              │ Statuts (16h)│
│             │              │              │  📝 BASSE    │
└─────────────┴──────────────┴──────────────┴──────────────┘
```

---

## 🏗️ Architecture des Sprints

### Sprint 1 : Exports PDF (12h) ✨ HAUTE
```
┌────────────────────────────────────────┐
│ 📄 Templates PDF Professionnels        │
├────────────────────────────────────────┤
│ • Marché (détail complet)         3h   │
│ • Caution (avec marché)           2h   │
│ • Listes (avec filtres)           3h   │
│ • Intégration UI                  2h   │
│ • Tests                           1h   │
├────────────────────────────────────────┤
│ 📦 Dépendance: @react-pdf/renderer     │
└────────────────────────────────────────┘
```

### Sprint 2 : Filtres Avancés (16h) ✨ HAUTE
```
┌────────────────────────────────────────┐
│ 🔍 Filtres Combinés + Sauvegarde       │
├────────────────────────────────────────┤
│ • Backend filtres (Prisma)        4h   │
│ • FilterBar universel             4h   │
│ • Filtres sauvegardés (DB)        4h   │
│ • Intégration modules             3h   │
│ • Tests                           1h   │
├────────────────────────────────────────┤
│ 🗃️ Nouveau: SavedFilter (Prisma)       │
└────────────────────────────────────────┘
```

### Sprint 3 : Facturation (20h) ✨ HAUTE
```
┌────────────────────────────────────────┐
│ 💰 Module Facturation Complet          │
├────────────────────────────────────────┤
│ • Backend Server Actions          4h   │
│ • Page Liste + filtres            4h   │
│ • Page Détail + timeline          3h   │
│ • Formulaire CRUD                 4h   │
│ • Intégration Marché              3h   │
│ • Exports PDF/Excel               1h   │
│ • Tests                           1h   │
├────────────────────────────────────────┤
│ ✅ Schéma existe (à activer)           │
└────────────────────────────────────────┘
```

### Sprint 4 : Veille & Opportunités (24h) 💡 MOYENNE
```
┌────────────────────────────────────────┐
│ 🔭 Pipeline Opportunités → Marchés     │
├────────────────────────────────────────┤
│ • Schéma Prisma Opportunité       2h   │
│ • Backend CRUD + conversion       5h   │
│ • Page Liste + filtres            5h   │
│ • Page Détail + conversion        4h   │
│ • Formulaire                      4h   │
│ • Widget Dashboard                2h   │
│ • Exports & stats                 1h   │
│ • Tests                           1h   │
├────────────────────────────────────────┤
│ 🗃️ Nouveau: Opportunite (Prisma)       │
└────────────────────────────────────────┘
```

### Sprint 5 : Montage de l'Offre (28h) 💡 MOYENNE
```
┌────────────────────────────────────────┐
│ 📋 Checklists & Documents Soumission   │
├────────────────────────────────────────┤
│ • Schéma Prisma (2 models)        2h   │
│ • Backend dossiers + pièces       6h   │
│ • Page Liste dossiers             5h   │
│ • Page Détail + checklist         6h   │
│ • Formulaire + upload             4h   │
│ • Templates checklist types       3h   │
│ • Intégration Marché              1h   │
│ • Tests                           1h   │
├────────────────────────────────────────┤
│ 🗃️ Nouveau: DossierOffre, PieceOffre   │
└────────────────────────────────────────┘
```

### Sprint 6 : Statuts Avancés (16h) 📝 BASSE
```
┌────────────────────────────────────────┐
│ 🔄 Workflow & Historique Statuts       │
├────────────────────────────────────────┤
│ • Schéma Historique               2h   │
│ • Backend transitions validées    4h   │
│ • Composant changement statut     4h   │
│ • UI Historique timeline          3h   │
│ • Notifications email             2h   │
│ • Tests                           1h   │
├────────────────────────────────────────┤
│ 🗃️ Nouveau: HistoriqueStatut (Prisma)  │
└────────────────────────────────────────┘
```

---

## 📦 Dépendances Techniques

### Nouvelles à Installer
- `@react-pdf/renderer@^3.4.0` (Sprint 1 uniquement)

### Nouveaux Schémas Prisma (5)
1. **SavedFilter** (Sprint 2) - Filtres utilisateur
2. **Opportunite** (Sprint 4) - Pipeline leads
3. **DossierOffre** + **PieceOffre** (Sprint 5) - Montage offre
4. **HistoriqueStatut** (Sprint 6) - Traçabilité

---

## 🎯 Priorités & Ordre d'Exécution

### Ordre Recommandé
```
1️⃣ Sprint 1 (PDF)       → Indépendant, valeur immédiate
2️⃣ Sprint 2 (Filtres)   → Indépendant, améliore UX globale
3️⃣ Sprint 3 (Factu)     → Utilise Sprint 2 (filtres)
4️⃣ Sprint 4 (Veille)    → Indépendant, prépare Sprint 5
5️⃣ Sprint 5 (Offre)     → Dépend Sprint 4 (opportunités)
6️⃣ Sprint 6 (Statuts)   → Indépendant, peut être parallélisé
```

### Parallélisation Possible
```
┌─────────────┐     ┌─────────────┐
│  Sprint 1   │ +   │  Sprint 2   │  = 24h (au lieu de 28h)
│  PDF (12h)  │     │ Filtres(16h)│
└─────────────┘     └─────────────┘
```

---

## 📈 Progression Estimée

```
Semaine 1:  ████████░░░░░░░░░░░░░░░░░░░░  28h / 116h  (24%)
Semaine 2:  ████████████████░░░░░░░░░░░░  48h / 116h  (41%)
Semaine 3:  ████████████████████████░░░░  68h / 116h  (59%)
Semaine 4:  ████████████████████████████ 116h / 116h (100%)
```

---

## ✅ Critères de Succès V1

### Fonctionnel
- [ ] Exports PDF professionnels pour tous modules
- [ ] Filtres avancés opérationnels partout
- [ ] Facturation tracée avec rapports
- [ ] Pipeline opportunités → marchés
- [ ] Checklists montage d'offre
- [ ] Historique statuts complet

### Technique
- [ ] 0 erreurs TypeScript strict
- [ ] Tests E2E > 95% pass rate
- [ ] First Load JS < 300 kB
- [ ] Build production réussi
- [ ] 5 migrations Prisma validées

### UX
- [ ] Interface cohérente avec MVP
- [ ] Responsive mobile/tablet/desktop
- [ ] Navigation intuitive
- [ ] Messages d'erreur clairs
- [ ] Performance maintenue

---

## 🚦 Jalons (Milestones)

```
M1: Sprint 1+2 (Exports & Filtres)    ───┐
    Semaine 2, 28h                        │
    Démo: Exports PDF + Filtres avancés   ├──► HAUTE PRIORITÉ
                                          │
M2: Sprint 3 (Facturation)            ───┘
    Semaine 3, 20h
    Démo: Module facturation complet

M3: Sprint 4+5 (Veille & Offre)       ───┐
    Semaine 4-5, 52h                      ├──► MOYENNE PRIORITÉ
    Démo: Pipeline opportunités           │
                                          │
M4: Sprint 6 (Statuts Avancés)        ───┘
    Semaine 6, 16h
    Démo: Workflow statuts
```

---

## 🎨 Modules V1 dans le Dashboard

```
┌────────────────────────────────────────────────────────┐
│  🏠 DASHBOARD ERP MARCHÉS V1                          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  📊 KPI Cards (MVP)          🔭 Opportunités (NEW)    │
│  ├─ Marchés actifs           ├─ Nb actives            │
│  ├─ Cautions à renouveler    ├─ Taux conversion       │
│  ├─ Documents récents        └─ Pipeline montant      │
│  └─ Véhicules                                         │
│                                                        │
│  📈 Charts (MVP + NEW)       💰 Facturation (NEW)     │
│  ├─ Status Donut             ├─ Factures en attente   │
│  ├─ Montants Mensuels        ├─ Montant à encaisser   │
│  └─ [Nouveau: Conversions]   └─ Échéances proches     │
│                                                        │
│  📋 Quick Actions (MVP)      🔍 Filtres Avancés (NEW) │
│  ├─ Nouveau marché           ├─ Mes filtres           │
│  ├─ Nouvelle caution         ├─ Créer filtre          │
│  ├─ [NEW: Opportunité]       └─ Filtres partagés      │
│  └─ [NEW: Dossier offre]                              │
│                                                        │
│  📄 Exports (NEW)                                     │
│  ├─ Export PDF global                                 │
│  ├─ Export Excel multi-feuilles                       │
│  └─ Rapports planifiés                                │
└────────────────────────────────────────────────────────┘
```

---

## 📚 Documents Clés

| Document | Description | Lien |
|----------|-------------|------|
| **PLAN_V1_PROFESSIONNALISER.md** | Plan détaillé complet (ce doc source) | [Voir](./PLAN_V1_PROFESSIONNALISER.md) |
| **V1_ROADMAP_VISUAL.md** | Roadmap visuelle (ce document) | [Voir](./V1_ROADMAP_VISUAL.md) |
| **ARCHITECTURE.md** | Architecture technique | [Voir](./ARCHITECTURE.md) |
| **PRD.md** | Product Requirements Document | [Voir](./PRD.md) |
| **MEMORY.md** | Mémoire projet globale | [Voir](./.claude/projects/.../memory/MEMORY.md) |

---

## 🔥 Quick Start V1

### Pour Démarrer Sprint 1 (PDF)
```bash
# 1. Créer branche feature
git checkout -b feature/exports-pdf

# 2. Installer dépendance PDF
npm install @react-pdf/renderer@^3.4.0

# 3. Créer structure
mkdir -p lib/pdf
mkdir -p lib/pdf/templates

# 4. Créer fichiers base
touch lib/pdf/marche-pdf.tsx
touch lib/pdf/caution-pdf.tsx
touch lib/pdf/liste-pdf.tsx
touch lib/utils/pdf-helpers.ts

# 5. Lancer dev
npm run dev
```

### Pour Démarrer Sprint 2 (Filtres)
```bash
# 1. Créer branche feature
git checkout -b feature/filtres-avances

# 2. Créer migration Prisma
npx prisma migrate dev --name add_saved_filters

# 3. Créer structure
mkdir -p components/shared
mkdir -p components/filters
mkdir -p lib/utils

# 4. Créer fichiers base
touch lib/utils/filters.ts
touch components/shared/filter-bar.tsx
touch components/filters/saved-filters.tsx
touch lib/actions/filters.ts

# 5. Lancer dev
npm run dev
```

---

## 💡 Conseils d'Implémentation

### Patterns à Réutiliser (MVP)
✅ **Server Actions** pour toutes mutations
✅ **Validation Zod** côté serveur
✅ **Pagination** 10 items/page, seuil 10
✅ **Recherche** debounce 300ms
✅ **Exports** respectent filtres actifs
✅ **Permissions** vérifiées dans actions

### Nouveaux Patterns V1
📄 **PDF Templates** : Components React avec `@react-pdf/renderer`
🔍 **Filtres Avancés** : JSON URL-serializable + sauvegarde DB
🔄 **Workflow Statuts** : Matrice transitions + historique
📋 **Checklists** : Templates configurables par type marché
🔭 **Pipeline Opportunités** : Conversion automatique → marché

---

## 🎯 Prochaine Action

**Maintenant** : Valider ce plan avec l'équipe/client

**Ensuite** : Lancer Sprint 1 (Exports PDF)

**Commande** :
```bash
# Préparer Sprint 1
git checkout -b feature/exports-pdf
npm install @react-pdf/renderer@^3.4.0
mkdir -p lib/pdf
code lib/pdf/marche-pdf.tsx
```

---

**Créé le** : 2026-02-16
**Durée totale V1** : 116 heures (~3 semaines)
**Statut** : 📋 PLAN VALIDÉ - Prêt pour Sprint 1 🚀
