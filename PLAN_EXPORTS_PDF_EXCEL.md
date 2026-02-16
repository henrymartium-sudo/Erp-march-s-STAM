# Plan Détaillé - Exports PDF/Excel

**Objectif** : Finaliser les exports Excel + Créer tous les exports PDF
**Durée estimée** : 8-10h
**Priorité** : HAUTE

---

## 📊 État Initial

### ✅ Déjà implémenté
- ✅ Infrastructure Excel complète (`lib/utils/excel.ts`)
- ✅ Export Marchés Excel (`exportMarches()`)
- ✅ Export Cautions Excel (`exportCautions()`)
- ✅ Export Véhicules Excel (`exportVehicules()`)
- ✅ Dépendances : `exceljs@4.4.0` + `@react-pdf/renderer@4.0.0`

### ❌ À implémenter
- ❌ Export Documents Excel
- ❌ Infrastructure PDF complète
- ❌ 4 exports PDF (Marchés, Cautions, Documents, Véhicules)
- ❌ Intégration UI (boutons sur pages liste)

---

## 🎯 Architecture Cible

```
lib/
├── actions/
│   └── exports.ts
│       ├── exportMarches()          ✅ Excel
│       ├── exportMarchesPDF()       ❌ À créer
│       ├── exportCautions()         ✅ Excel
│       ├── exportCautionsPDF()      ❌ À créer
│       ├── exportDocuments()        ❌ À créer
│       ├── exportDocumentsPDF()     ❌ À créer
│       ├── exportVehicules()        ✅ Excel
│       └── exportVehiculesPDF()     ❌ À créer
│
├── utils/
│   ├── excel.ts                     ✅ Complet
│   └── pdf.ts                       ❌ À créer
│
components/
└── exports/
    ├── export-button.tsx            ❌ À créer
    └── export-menu.tsx              ❌ À créer

app/(dashboard)/
├── marches/page.tsx                 ✅ Ajouter boutons
├── cautions/page.tsx                ✅ Ajouter boutons
├── documents/page.tsx               ✅ Ajouter boutons
└── vehicules/page.tsx               ✅ Ajouter boutons
```

---

## 📋 Plan d'Exécution

### Phase 1 : Compléter Exports Excel (1h)
**Durée** : 1h

#### 1.1 Export Documents Excel (45 min)
- [ ] Ajouter `exportDocuments()` dans `lib/actions/exports.ts`
- [ ] Colonnes : titre, reference, typeDocument, statutDocument, dateEmission, dateExpiration, fichierUrl, marché associé, gestionnaire
- [ ] Tester avec Prisma query

#### 1.2 Tests Excel (15 min)
- [ ] Vérifier les 4 exports Excel (marches, cautions, documents, vehicules)
- [ ] Valider formatage des données (dates, montants, statuts)
- [ ] Valider ligne de total

---

### Phase 2 : Infrastructure PDF (2h)
**Durée** : 2h

#### 2.1 Créer `lib/utils/pdf.ts` (1h30)
- [ ] **Styles PDF** (30 min)
  - Couleurs (violet #6B46C1, gris, blanc)
  - Polices (Helvetica, sizes)
  - Marges et espacements
  - Styles tableau (header, cell, border)

- [ ] **Composants PDF réutilisables** (30 min)
  - `PDFHeader` : Logo + Titre + Date génération
  - `PDFTable` : Tableau avec colonnes configurables
  - `PDFFooter` : Pagination + "Généré par ERP Marchés STAM"
  - `PDFSummary` : Statistiques (total items, montants)

- [ ] **Fonction principale `createPDFDocument()`** (30 min)
  ```typescript
  interface PDFExportOptions {
    title: string
    subtitle?: string
    columns: PDFColumn[]
    data: any[]
    summary?: {
      totalItems: number
      totalMontant?: number
    }
  }

  export async function createPDFDocument(
    options: PDFExportOptions
  ): Promise<Buffer>
  ```

#### 2.2 Tests Infrastructure (30 min)
- [ ] Test rendu PDF basique (1 page)
- [ ] Test pagination (50+ lignes)
- [ ] Test formatage (dates, montants, styles)

---

### Phase 3 : Exports PDF (4h)
**Durée** : 4h (1h par module)

#### 3.1 Export Marchés PDF (1h)
- [ ] Fonction `exportMarchesPDF()` dans `lib/actions/exports.ts`
- [ ] Colonnes : N° Marché, Objet, Type, Statut, Montant, Dates clés, Autorité Contractante
- [ ] Summary : Total marchés + Total montants
- [ ] Test avec 10-50 marchés

#### 3.2 Export Cautions PDF (1h)
- [ ] Fonction `exportCautionsPDF()`
- [ ] Colonnes : Référence, Type, Statut, Montant, Dates, Jours restants, Banque, N° Marché
- [ ] Summary : Total cautions + Total montants + Jours restants moyen
- [ ] Test avec alertes échéance proche

#### 3.3 Export Documents PDF (1h)
- [ ] Fonction `exportDocumentsPDF()`
- [ ] Colonnes : Titre, Référence, Type, Statut, Dates, N° Marché
- [ ] Summary : Total documents par type
- [ ] Test avec documents variés

#### 3.4 Export Véhicules PDF (1h)
- [ ] Fonction `exportVehiculesPDF()`
- [ ] Colonnes : Immatriculation, Marque, Modèle, Année, Statut, Dates, N° Marché
- [ ] Summary : Total véhicules par statut
- [ ] Test avec véhicules en différents statuts

---

### Phase 4 : Intégration UI (2h)
**Durée** : 2h

#### 4.1 Composants Export (45 min)
- [ ] **`components/exports/export-button.tsx`**
  - Bouton générique avec icône
  - Props : `onExport`, `loading`, `format` (excel/pdf)
  - États : idle, loading, success, error
  - Toast notifications (Sonner)

- [ ] **`components/exports/export-menu.tsx`**
  - Dropdown menu (shadcn DropdownMenu)
  - Options : "Excel (.xlsx)" + "PDF (.pdf)"
  - Gestion download automatique
  - Intégration permissions (EXPLOITATION minimum)

#### 4.2 Intégration Pages (1h15)
- [ ] **`app/(dashboard)/marches/page.tsx`** (15 min)
  - Ajouter `<ExportMenu />` dans toolbar
  - Handlers `handleExportExcel()` + `handleExportPDF()`
  - Download fichier avec `URL.createObjectURL()`

- [ ] **`app/(dashboard)/cautions/page.tsx`** (15 min)
  - Idem Marchés

- [ ] **`app/(dashboard)/documents/page.tsx`** (15 min)
  - Idem Marchés

- [ ] **`app/(dashboard)/vehicules/page.tsx`** (15 min)
  - Idem Marchés

- [ ] **Responsive toolbar** (15 min)
  - Mobile : Menu hamburger avec exports
  - Desktop : Boutons visibles

---

### Phase 5 : Tests E2E & Polish (2h)
**Durée** : 2h

#### 5.1 Tests Fonctionnels (1h)
- [ ] **Excel** (30 min)
  - Export vide (0 items)
  - Export petit (1-10 items)
  - Export moyen (50 items)
  - Export grand (200+ items)
  - Vérifier formatage, totaux, styles

- [ ] **PDF** (30 min)
  - Idem Excel
  - Vérifier pagination
  - Vérifier header/footer sur toutes les pages

#### 5.2 Tests Permissions (30 min)
- [ ] VISITEUR : Boutons cachés ou disabled
- [ ] EXPLOITATION : Exports autorisés
- [ ] AVANCE/ADMIN : Exports autorisés

#### 5.3 UX Polish (30 min)
- [ ] Icônes appropriées (FileDown, FileSpreadsheet, FileText)
- [ ] Messages d'erreur clairs
- [ ] Loading states fluides
- [ ] Toast notifications informatives
- [ ] Filename format : `module_YYYY-MM-DD_HHmm.ext`

---

## 🔧 Patterns Techniques

### Pattern Export Server Action
```typescript
export async function exportModulePDF(
  filters?: ExportFilters
): Promise<ActionResult<{ buffer: Buffer; filename: string }>> {
  try {
    // 1. Check permissions
    await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

    // 2. Fetch data with filters
    const data = await prisma.module.findMany({ where, include })

    // 3. Generate PDF
    const buffer = await createPDFDocument({
      title: 'Export Module',
      columns: [...],
      data: formatData(data),
      summary: { totalItems: data.length }
    })

    // 4. Return buffer
    return { success: true, data: { buffer, filename: '...' } }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

### Pattern Frontend Export
```typescript
async function handleExport(format: 'excel' | 'pdf') {
  try {
    setLoading(true)

    const result = format === 'excel'
      ? await exportModuleExcel(filters)
      : await exportModulePDF(filters)

    if (!result.success) throw new Error(result.error)

    // Download file
    const blob = new Blob([result.data.buffer], {
      type: format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.data.filename
    a.click()
    URL.revokeObjectURL(url)

    toast.success('Export réussi')
  } catch (error) {
    toast.error(error.message)
  } finally {
    setLoading(false)
  }
}
```

---

## 📦 Dépendances Utilisées

```json
{
  "exceljs": "^4.4.0",              // ✅ Déjà installé
  "@react-pdf/renderer": "^4.0.0",  // ✅ Déjà installé
  "sonner": "^1.x",                 // ✅ Déjà installé (toasts)
  "lucide-react": "^0.x"            // ✅ Déjà installé (icônes)
}
```

**Aucune nouvelle dépendance requise** ✅

---

## 🎨 Design System

### Couleurs
- **Primaire** : `#6B46C1` (Violet)
- **Succès** : `#10B981` (Vert)
- **Danger** : `#EF4444` (Rouge)
- **Texte** : `#1F2937` (Gris foncé)
- **Bordures** : `#E5E7EB` (Gris clair)

### Icônes
- **Excel** : `FileSpreadsheet` (lucide-react)
- **PDF** : `FileText` (lucide-react)
- **Download** : `Download` (lucide-react)

---

## ✅ Checklist Finale

### Excel
- [ ] 4 exports Excel fonctionnels (Marchés, Cautions, Documents, Véhicules)
- [ ] Styles cohérents (header violet, bordures, formatage)
- [ ] Ligne de total automatique (montants)
- [ ] AutoFilter sur headers
- [ ] Timestamp génération

### PDF
- [ ] Infrastructure PDF complète (`lib/utils/pdf.ts`)
- [ ] 4 exports PDF fonctionnels
- [ ] Pagination automatique (50+ lignes)
- [ ] Header/Footer sur toutes les pages
- [ ] Summary statistiques

### UI
- [ ] Boutons export sur 4 pages (marches, cautions, documents, vehicules)
- [ ] Dropdown menu (Excel + PDF)
- [ ] Loading states
- [ ] Toast notifications
- [ ] Permissions respectées (EXPLOITATION minimum)

### Tests
- [ ] Exports vides (0 items)
- [ ] Exports petits (1-10 items)
- [ ] Exports moyens (50 items)
- [ ] Exports grands (200+ items)
- [ ] Tests permissions (VISITEUR, EXPLOITATION, ADMIN)

---

## 📅 Timeline

| Phase | Description | Durée | Priorité |
|-------|-------------|-------|----------|
| 1 | Compléter Excel | 1h | HAUTE |
| 2 | Infrastructure PDF | 2h | HAUTE |
| 3 | Exports PDF (4 modules) | 4h | HAUTE |
| 4 | Intégration UI | 2h | HAUTE |
| 5 | Tests & Polish | 2h | MOYENNE |

**Total estimé** : 11h (peut être réduit à 8-9h si focus MVP)

---

## 🚀 Ordre d'Exécution Recommandé

1. **Phase 1** → Excel Documents (facile, réutilise existant)
2. **Phase 2** → Infrastructure PDF (fondation)
3. **Phase 3.1** → PDF Marchés (test infrastructure)
4. **Phase 4.1-4.2** → UI Marchés (test UX)
5. **Phase 3.2-3.4** → PDF restants (parallélisable)
6. **Phase 4.2** → UI restants (parallélisable)
7. **Phase 5** → Tests & Polish

---

**Dernière mise à jour** : 2026-02-16
**Prochaine étape** : Phase 1 - Export Documents Excel
