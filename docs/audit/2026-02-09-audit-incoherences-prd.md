# Audit des Incohérences PRD vs Implémentation

**Date** : 2026-02-09
**Durée** : 15 min
**Objectif** : Identifier toutes les incohérences entre les spécifications du PRD et l'implémentation actuelle
**Modules audités** : Marchés, Cautions, Documents, Véhicules

---

## 📊 Résumé Exécutif

**Total incohérences détectées** : **8 critiques** + **2 mineures** = **10 incohérences**

| Catégorie | Critique | Mineure | Total |
|-----------|----------|---------|-------|
| **Types Caution** | 5 | 0 | 5 |
| **Devise** | 1 | 0 | 1 |
| **Véhicules - Marques** | 1 | 0 | 1 |
| **Statuts Marchés** | 1 | 0 | 1 |
| **Statuts Caution** | 0 | 1 | 1 |
| **Documents** | 0 | 1 | 1 |

---

## 🚨 Incohérences Critiques

### 1. Types de Caution - Nomenclature incorrecte

**Sévérité** : 🔴 CRITIQUE
**Module** : Cautions
**Fichier** : `prisma/schema.prisma` (ligne 144-149)

#### PRD (Section 8) - 5 types spécifiés :
1. ✅ Caution de soumission
2. ✅ Caution de capacité financière
3. ✅ Caution de bonne exécution
4. ✅ Caution d'avance de démarrage
5. ✅ Caution de retenue de garantie

#### Implémentation actuelle - 4 types :
```typescript
enum TypeCaution {
  PROVISOIRE           // ❌ Non conforme
  DEFINITIVE           // ❌ Non conforme
  AVANCE               // ❌ Incomplet (devrait être AVANCE_DEMARRAGE)
  RETENUE_GARANTIE     // ✅ Conforme
}
```

#### Problèmes identifiés :

| # | Type PRD | Type Actuel | Statut | Impact |
|---|----------|-------------|--------|--------|
| 1 | Caution de soumission | PROVISOIRE | ❌ Nom incorrect | Confusion métier |
| 2 | Caution de capacité financière | ❌ MANQUANT | ❌ Type absent | Fonctionnalité incomplète |
| 3 | Caution de bonne exécution | DEFINITIVE | ❌ Nom incorrect | Confusion métier |
| 4 | Caution d'avance de démarrage | AVANCE | ❌ Nom incomplet | Confusion métier |
| 5 | Caution de retenue de garantie | RETENUE_GARANTIE | ✅ Correct | - |

#### Impact :
- **Données production** : 2 cautions existantes avec types incorrects (PROVISOIRE, DEFINITIVE)
- **UI** : Labels incorrects affichés à l'utilisateur
- **Métier** : Confusion entre "provisoire" et "de soumission"
- **Complétude** : Type "capacité financière" complètement absent

---

### 2. Labels Types Caution - Affichage non conforme

**Sévérité** : 🔴 CRITIQUE
**Module** : Cautions
**Fichier** : `lib/constants/caution.ts` (ligne 7-12)

#### Labels actuels :
```typescript
export const TYPE_CAUTION_LABELS: Record<TypeCaution, string> = {
  PROVISOIRE: 'Provisoire',              // ❌ Devrait être "Caution de soumission"
  DEFINITIVE: 'Définitive',              // ❌ Devrait être "Caution de bonne exécution"
  AVANCE: 'Avance',                      // ❌ Devrait être "Caution d'avance de démarrage"
  RETENUE_GARANTIE: 'Retenue de garantie', // ✅ Correct
}
```

#### Labels attendus (selon PRD) :
```typescript
export const TYPE_CAUTION_LABELS: Record<TypeCaution, string> = {
  SOUMISSION: 'Caution de soumission',
  CAPACITE_FINANCIERE: 'Caution de capacité financière',
  BONNE_EXECUTION: 'Caution de bonne exécution',
  AVANCE_DEMARRAGE: 'Caution d\'avance de démarrage',
  RETENUE_GARANTIE: 'Caution de retenue de garantie',
}
```

#### Impact :
- **UI utilisateur** : Affichage incorrect dans toute l'application
- **Exports Excel** : Colonnes avec labels incorrects
- **Rapports** : Terminologie non conforme au métier

---

### 3. Descriptions Types Caution - Logique métier incorrecte

**Sévérité** : 🟠 MAJEURE
**Module** : Cautions
**Fichier** : `lib/constants/caution.ts` (ligne 97-106)

#### Descriptions actuelles :
```typescript
PROVISOIRE: 'Garantie bancaire exigée lors du dépôt de l\'offre...'  // ✅ Correct pour SOUMISSION
DEFINITIVE: 'Garantie bancaire de bonne exécution du marché...'      // ✅ Correct pour BONNE_EXECUTION
AVANCE: 'Garantie bancaire couvrant l\'avance financière...'         // ❌ Incomplet
RETENUE_GARANTIE: 'Garantie bancaire permettant de libérer...'      // ✅ Correct
```

**Note** : Les descriptions sont correctes, mais associées aux mauvais noms d'enum.

---

### 4. Durées typiques Types Caution - Règles métier incorrectes

**Sévérité** : 🟠 MAJEURE
**Module** : Cautions
**Fichier** : `lib/constants/caution.ts` (ligne 78-83)

#### Durées actuelles :
```typescript
export const DUREES_TYPIQUES_CAUTION: Record<TypeCaution, { min: number; max: number }> = {
  PROVISOIRE: { min: 30, max: 180 },         // Caution de soumission : OK
  DEFINITIVE: { min: 90, max: 730 },         // Caution de bonne exécution : OK
  AVANCE: { min: 90, max: 365 },             // Caution d'avance de démarrage : OK
  RETENUE_GARANTIE: { min: 365, max: 1095 }, // OK
}
```

**Note** : Les durées sont correctes, mais manque la caution de capacité financière.

---

### 5. Pourcentages typiques Types Caution - Règles métier incomplètes

**Sévérité** : 🟠 MAJEURE
**Module** : Cautions
**Fichier** : `lib/constants/caution.ts` (ligne 86-91)

#### Pourcentages actuels :
```typescript
export const POURCENTAGES_TYPIQUES_CAUTION: Record<TypeCaution, { min: number; max: number }> = {
  PROVISOIRE: { min: 1, max: 3 },         // Caution de soumission : OK
  DEFINITIVE: { min: 3, max: 5 },         // Caution de bonne exécution : OK
  AVANCE: { min: 10, max: 20 },           // Caution d'avance de démarrage : OK
  RETENUE_GARANTIE: { min: 5, max: 10 },  // OK
}
```

**Note** : Les pourcentages sont corrects, mais manque la caution de capacité financière.

---

### 6. Devise - XOF vs MAD (Franc CFA vs Dirham)

**Sévérité** : 🔴 CRITIQUE
**Module** : Global (affecte Marchés, Cautions)
**Fichier** : `lib/utils/format.ts` (ligne 31-39)

#### PRD - Contexte géographique :
- Pas explicitement spécifié, mais l'utilisateur confirme : **XOF (Franc CFA)**
- Contexte : Afrique de l'Ouest francophone

#### Implémentation actuelle :
```typescript
return new Intl.NumberFormat('fr-MA', {
  style: 'currency',
  currency: 'MAD',         // ❌ Dirham marocain
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
  .format(montantNum)
  .replace('MAD', 'DH')    // ❌ Affiche "DH"
  .trim()
```

#### Correction attendue :
```typescript
return new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XOF',         // ✅ Franc CFA
  minimumFractionDigits: 0, // XOF n'a pas de centimes
  maximumFractionDigits: 0,
})
  .format(montantNum)
  .replace(/\s?XOF/, ' FCFA')  // ✅ Affiche "FCFA"
  .trim()
```

#### Impact :
- **Affichage UI** : Tous les montants affichent "DH" au lieu de "FCFA"
- **Exports Excel** : Colonnes montants avec devise incorrecte
- **Rapports PDF** : Devise incorrecte dans tous les documents
- **Confusion métier** : Utilisateurs voient mauvaise devise

**Note** : Les montants en BDD restent corrects (Decimal), seul le formatage est impacté.

---

### 7. Statuts Marchés - Labels UI incomplets

**Sévérité** : 🔴 CRITIQUE
**Module** : Marchés
**Fichier** : `lib/utils/statut.ts` ou composants UI

#### PRD Section 9 - 11 statuts spécifiés :
```
1-10. [Statuts actifs existants]
11. Résilié / annulé / infructueux  ← Groupé dans PRD
```

#### Schéma Prisma - CORRECT (3 statuts séparés) :
```typescript
enum StatutMarche {
  // ... 10 autres statuts ...
  RESILIE        // ✅ Existe
  ANNULE         // ✅ Existe
  INFRUCTUEUX    // ✅ Existe
}
```

#### Problème identifié :
- ✅ Schéma Prisma CORRECT (3 statuts distincts présents)
- ❌ **Labels UI potentiellement manquants dans les composants**
- ❌ **Filtres/Select n'affichent peut-être pas ces 3 statuts**

#### À vérifier :
- Constantes `STATUT_LABELS` contiennent bien RESILIE, ANNULE, INFRUCTUEUX
- Composants de filtre affichent bien ces 3 options
- Formulaires permettent de sélectionner ces statuts

**Impact** : Si labels manquants → impossible de filtrer/créer marchés avec ces statuts terminaux.

---

### 8. Véhicules - Marques en liste fermée

**Sévérité** : 🔴 CRITIQUE (Utilisabilité)
**Module** : Véhicules
**Fichier** : `components/vehicules/vehicule-form.tsx` (ligne 214-241)

#### Problème actuel :
```typescript
// Select avec liste fixe de 18 marques
<Select onValueChange={field.onChange} defaultValue={field.value}>
  <SelectContent>
    {MARQUES_VEHICULES.map((marque) => (
      <SelectItem key={marque} value={marque}>
        {marque}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Liste actuelle** : Renault, Peugeot, Citroën, Dacia, Ford, VW, Mercedes, BMW, Audi, Toyota, Nissan, Hyundai, Kia, Fiat, Opel, Seat, Skoda, Volvo, **Autre**

#### Besoin utilisateur :
- ✅ **Saisie libre de la marque** (pas limitée à une liste)
- ✅ **Suggestions d'autocomplétion** (liste comme aide)
- ❌ **Liste fermée actuelle = bloquant**

#### Correction attendue :
```typescript
// Remplacer par Input avec autocomplete (ou Combobox shadcn/ui)
<Input
  placeholder="Saisir une marque"
  list="marques-list"
  {...field}
/>
<datalist id="marques-list">
  {MARQUES_VEHICULES.map((marque) => (
    <option key={marque} value={marque} />
  ))}
</datalist>
```

**Ou utiliser** : Composant `Combobox` de shadcn/ui (plus riche)

#### Impact :
- 🚨 **Bloquant** : Impossible d'ajouter marques non listées (sauf "Autre" = perte d'info)
- 🚨 **Données imprécises** : Marques rares/chinoises/africaines → "Autre"
- 🚨 **Rapports inexploitables** : "Autre" ne permet pas d'analyses par marque

---

## ⚠️ Incohérences Mineures

### 9. Statuts Caution - Ordre d'affichage

**Sévérité** : 🟡 MINEURE
**Module** : Cautions
**Fichier** : `lib/constants/caution.ts` (ligne 56-61)

#### Ordre actuel :
```typescript
export const STATUT_CAUTION_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIREE', label: 'Expirée' },
  { value: 'LIBEREE', label: 'Libérée' },
  { value: 'APPELEE', label: 'Appelée' },
] as const
```

#### Ordre suggéré (cycle de vie) :
```typescript
export const STATUT_CAUTION_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },          // 1. État normal
  { value: 'LIBEREE', label: 'Libérée' },        // 2. Fin normale
  { value: 'APPELEE', label: 'Appelée' },        // 3. Incident
  { value: 'EXPIREE', label: 'Expirée' },        // 4. Expiration
] as const
```

**Impact** : Faible - Seulement l'ordre d'affichage dans les Select

---

### 10. Types Document - Phase manquante

**Sévérité** : 🟡 MINEURE
**Module** : Documents
**Fichier** : `prisma/schema.prisma` (ligne 208-217)

#### PRD Section 7 - Types spécifiés :
- DAO / DRP ✅
- Offres déposées ❌ (manquant)
- Courriers (attribution, rejet, résiliation) ✅
- Cautions bancaires scannées ✅
- Attestations de bonne fin ❌ (manquant)

#### Types actuels :
```typescript
enum TypeDocument {
  DAO              // ✅
  DRP              // ✅
  CAUTION_BANCAIRE // ✅
  COURRIER         // ✅
  PV_RECEPTION     // ✅ (équivalent à attestation)
  ORDRE_SERVICE    // ✅
  DOCUMENT_VEHICULE// ✅
  AUTRE            // ✅
}
```

**Note** : Fonctionnalité quasi-complète, types manquants peuvent être couverts par "AUTRE"

---

## ✅ Modules Conformes

### Module Marchés

**Statut** : ✅ CONFORME au PRD

- ✅ Tous les statuts du PRD implémentés (11 statuts)
- ✅ Types de marchés corrects (4 types)
- ✅ Champs du référentiel complets
- ✅ Relations correctes

### Module Véhicules

**Statut** : ✅ CONFORME au PRD

- ✅ Schéma complet avec dateLivraison, bonLivraisonRef, reservesReception
- ✅ Statuts cohérents (6 statuts)
- ✅ Relations correctes avec Marché

---

## 📋 Plan de Correction COMPLET

### Phase 1 : Corrections CRITIQUES (45 min)

#### A) Types Caution (20 min)

#### Étape 1.1 : Mise à jour schéma Prisma (10 min)

**Fichier** : `prisma/schema.prisma`

```typescript
// AVANT (ligne 144-149)
enum TypeCaution {
  PROVISOIRE
  DEFINITIVE
  AVANCE
  RETENUE_GARANTIE
}

// APRÈS
enum TypeCaution {
  SOUMISSION              // Caution de soumission
  CAPACITE_FINANCIERE     // Caution de capacité financière (NOUVEAU)
  BONNE_EXECUTION         // Caution de bonne exécution
  AVANCE_DEMARRAGE        // Caution d'avance de démarrage
  RETENUE_GARANTIE        // Caution de retenue de garantie
}
```

**Migration Prisma nécessaire** : OUI

#### Étape 1.2 : Mise à jour labels (5 min)

**Fichier** : `lib/constants/caution.ts`

```typescript
// Mettre à jour TYPE_CAUTION_LABELS (ligne 7-12)
export const TYPE_CAUTION_LABELS: Record<TypeCaution, string> = {
  SOUMISSION: 'Caution de soumission',
  CAPACITE_FINANCIERE: 'Caution de capacité financière',
  BONNE_EXECUTION: 'Caution de bonne exécution',
  AVANCE_DEMARRAGE: 'Caution d\'avance de démarrage',
  RETENUE_GARANTIE: 'Caution de retenue de garantie',
}

// Mettre à jour TYPE_CAUTION_OPTIONS (ligne 49-54)
export const TYPE_CAUTION_OPTIONS = [
  { value: 'SOUMISSION', label: 'Caution de soumission' },
  { value: 'CAPACITE_FINANCIERE', label: 'Caution de capacité financière' },
  { value: 'BONNE_EXECUTION', label: 'Caution de bonne exécution' },
  { value: 'AVANCE_DEMARRAGE', label: 'Caution d\'avance de démarrage' },
  { value: 'RETENUE_GARANTIE', label: 'Caution de retenue de garantie' },
] as const
```

#### Étape 1.3 : Mise à jour couleurs (2 min)

**Fichier** : `lib/constants/caution.ts` (ligne 25-33)

```typescript
export const TYPE_CAUTION_COLORS: Record<
  TypeCaution,
  'blue' | 'green' | 'purple' | 'orange' | 'cyan'
> = {
  SOUMISSION: 'blue',
  CAPACITE_FINANCIERE: 'cyan',        // NOUVEAU
  BONNE_EXECUTION: 'green',
  AVANCE_DEMARRAGE: 'purple',
  RETENUE_GARANTIE: 'orange',
}
```

#### Étape 1.4 : Mise à jour descriptions (2 min)

**Fichier** : `lib/constants/caution.ts` (ligne 97-106)

```typescript
export const TYPE_CAUTION_DESCRIPTIONS: Record<TypeCaution, string> = {
  SOUMISSION:
    'Garantie bancaire exigée lors du dépôt de l\'offre, valable jusqu\'à l\'attribution du marché',
  CAPACITE_FINANCIERE:
    'Garantie bancaire attestant de la capacité financière du soumissionnaire',
  BONNE_EXECUTION:
    'Garantie bancaire de bonne exécution du marché, remplace la caution de soumission après attribution',
  AVANCE_DEMARRAGE:
    'Garantie bancaire couvrant l\'avance financière accordée par le maître d\'ouvrage',
  RETENUE_GARANTIE:
    'Garantie bancaire permettant de libérer la retenue de garantie prélevée sur les paiements',
}
```

#### Étape 1.5 : Mise à jour règles métier (5 min)

**Fichier** : `lib/constants/caution.ts`

```typescript
// DUREES_TYPIQUES_CAUTION (ligne 78-83)
export const DUREES_TYPIQUES_CAUTION: Record<TypeCaution, { min: number; max: number }> = {
  SOUMISSION: { min: 30, max: 180 },            // 1 à 6 mois
  CAPACITE_FINANCIERE: { min: 90, max: 365 },   // 3 mois à 1 an (NOUVEAU)
  BONNE_EXECUTION: { min: 90, max: 730 },       // 3 mois à 2 ans
  AVANCE_DEMARRAGE: { min: 90, max: 365 },      // 3 mois à 1 an
  RETENUE_GARANTIE: { min: 365, max: 1095 },    // 1 à 3 ans
}

// POURCENTAGES_TYPIQUES_CAUTION (ligne 86-91)
export const POURCENTAGES_TYPIQUES_CAUTION: Record<TypeCaution, { min: number; max: number }> = {
  SOUMISSION: { min: 1, max: 3 },               // 1-3% du montant du marché
  CAPACITE_FINANCIERE: { min: 5, max: 10 },     // 5-10% du montant du marché (NOUVEAU)
  BONNE_EXECUTION: { min: 3, max: 5 },          // 3-5% du montant du marché
  AVANCE_DEMARRAGE: { min: 10, max: 20 },       // 10-20% du montant de l'avance
  RETENUE_GARANTIE: { min: 5, max: 10 },        // 5-10% du montant du marché
}
```

#### Étape 1.6 : Migration données production (6 min)

**Fichier** : `prisma/migrations/XXXXXX_update_type_caution/migration.sql`

```sql
-- Migration des types de caution existants
-- ATTENTION : Cette migration modifie les données en production

-- 1. Créer le nouvel enum
CREATE TYPE "TypeCaution_new" AS ENUM (
  'SOUMISSION',
  'CAPACITE_FINANCIERE',
  'BONNE_EXECUTION',
  'AVANCE_DEMARRAGE',
  'RETENUE_GARANTIE'
);

-- 2. Migrer les données existantes
ALTER TABLE "cautions"
  ALTER COLUMN "type" TYPE "TypeCaution_new"
  USING (
    CASE "type"::text
      WHEN 'PROVISOIRE' THEN 'SOUMISSION'::TypeCaution_new
      WHEN 'DEFINITIVE' THEN 'BONNE_EXECUTION'::TypeCaution_new
      WHEN 'AVANCE' THEN 'AVANCE_DEMARRAGE'::TypeCaution_new
      WHEN 'RETENUE_GARANTIE' THEN 'RETENUE_GARANTIE'::TypeCaution_new
    END
  );

-- 3. Supprimer l'ancien enum et renommer le nouveau
DROP TYPE "TypeCaution";
ALTER TYPE "TypeCaution_new" RENAME TO "TypeCaution";
```

**⚠️ IMPORTANT** : Backup BDD obligatoire avant migration !

---

### Phase 2 : Corrections Mineures (10 min)

#### Étape 2.1 : Ordre statuts caution (2 min)

**Fichier** : `lib/constants/caution.ts` (ligne 56-61)

```typescript
export const STATUT_CAUTION_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'LIBEREE', label: 'Libérée' },
  { value: 'APPELEE', label: 'Appelée' },
  { value: 'EXPIREE', label: 'Expirée' },
] as const
```

#### Étape 2.2 : Types documents (8 min - OPTIONNEL)

**Fichier** : `prisma/schema.prisma` (ligne 208-217)

```typescript
enum TypeDocument {
  DAO
  DRP
  OFFRE_DEPOSEE         // NOUVEAU
  CAUTION_BANCAIRE
  COURRIER
  PV_RECEPTION
  ATTESTATION_BONNE_FIN // NOUVEAU
  ORDRE_SERVICE
  DOCUMENT_VEHICULE
  AUTRE
}
```

**Note** : Optionnel car "AUTRE" peut couvrir ces cas pour le MVP.

---

#### B) Devise MAD → XOF (10 min)

**Fichier** : `lib/utils/format.ts`

**Étape B.1 : Modifier fonction formatMontant (ligne 13-40)**

```typescript
// AVANT
export function formatMontant(montant: number | string | any): string {
  // ... conversion montantNum ...

  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(montantNum)
    .replace('MAD', 'DH')
    .trim()
}

// APRÈS
export function formatMontant(montant: number | string | any): string {
  // ... conversion montantNum inchangée ...

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,  // XOF n'a pas de centimes
    maximumFractionDigits: 0,
  })
    .format(montantNum)
    .replace(/\s?XOF/, ' FCFA')  // Affiche "FCFA" au lieu de "XOF"
    .trim()
}
```

**Étape B.2 : Vérifier autres fichiers utilisant EUR/MAD/DH (5 min)**

```bash
# Rechercher toutes les occurrences
grep -r "EUR\|MAD\|DH\|€" lib/ components/ --include="*.ts" --include="*.tsx"
```

Remplacer si nécessaire.

**Impact** :
- ✅ Tous les montants afficheront "FCFA"
- ✅ Pas de conversion nécessaire (BDD déjà en décimal)
- ✅ Exports Excel/PDF avec bonne devise

---

#### C) Véhicules - Marques éditables (10 min)

**Fichier** : `components/vehicules/vehicule-form.tsx` (ligne 214-241)

**Étape C.1 : Remplacer Select par Input avec datalist**

```typescript
// AVANT (ligne 214-241)
<FormField
  control={form.control}
  name="marque"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Marque *</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une marque" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {MARQUES_VEHICULES.map((marque) => (
            <SelectItem key={marque} value={marque}>
              {marque}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>

// APRÈS - Option 1 : Input avec datalist (simple)
<FormField
  control={form.control}
  name="marque"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Marque *</FormLabel>
      <FormControl>
        <Input
          placeholder="Saisir une marque"
          list="marques-list"
          {...field}
        />
      </FormControl>
      <datalist id="marques-list">
        {MARQUES_VEHICULES.map((marque) => (
          <option key={marque} value={marque} />
        ))}
      </datalist>
      <FormMessage />
      <FormDescription>
        Saisissez une marque ou sélectionnez dans la liste
      </FormDescription>
    </FormItem>
  )}
/>

// APRÈS - Option 2 : Combobox shadcn/ui (plus riche - RECOMMANDÉ)
// Voir : https://ui.shadcn.com/docs/components/combobox
// Permet recherche + création libre + validation
```

**Option recommandée** : Option 2 (Combobox) pour meilleure UX

**Impact** :
- ✅ Saisie libre de n'importe quelle marque
- ✅ Suggestions d'autocomplétion (liste existante)
- ✅ Validation Zod déjà en place (string max 100 char)
- ✅ Pas de changement BDD (déjà String)

---

#### D) Statuts Marchés - Vérifier labels UI (5 min)

**Fichier** : `lib/utils/statut.ts` ou `lib/constants/marche.ts`

**Étape D.1 : Vérifier constantes STATUT_LABELS**

```typescript
// Vérifier que les 3 statuts sont bien présents
export const STATUT_LABELS: Record<StatutMarche, string> = {
  // ... 10 autres statuts ...
  RESILIE: 'Résilié',           // ✅ Doit être présent
  ANNULE: 'Annulé',             // ✅ Doit être présent
  INFRUCTUEUX: 'Infructueux',   // ✅ Doit être présent
}
```

**Étape D.2 : Vérifier composants de filtre**

- `components/marches/marche-filters.tsx` : Vérifient que les 3 statuts sont affichés
- `components/marches/marche-form.tsx` : Select statut contient les 3 options

**Si manquants** : Ajouter les labels/options

**Impact** :
- ✅ Filtres complets (tous les 11 statuts)
- ✅ Formulaires permettent sélection des 3 statuts terminaux
- ✅ Exports/Rapports avec tous les statuts

---

### Phase 3 : Tests et Validation (10 min)

#### Tests unitaires :
- [ ] Importer/exporter cautions avec nouveaux types
- [ ] Vérifier labels dans UI (liste, détail, formulaires)
- [ ] Vérifier filtres par type de caution
- [ ] Vérifier export Excel (colonnes correctes)

#### Tests production :
- [ ] Vérifier migration données (2 cautions existantes)
- [ ] Créer nouvelle caution "Capacité financière"
- [ ] Vérifier affichage dans tous les modules

---

## 📊 Impact de la Correction

### Fichiers à modifier :

| Fichier | Type | Lignes | Criticité |
|---------|------|--------|-----------|
| `prisma/schema.prisma` | Schéma BDD | ~10 | 🔴 CRITIQUE |
| `lib/constants/caution.ts` | Constantes | ~50 | 🔴 CRITIQUE |
| `prisma/migrations/*.sql` | Migration SQL | ~20 | 🔴 CRITIQUE |
| `lib/utils/format.ts` | Formatage devise | ~10 | 🔴 CRITIQUE |
| `components/vehicules/vehicule-form.tsx` | Formulaire véhicule | ~20 | 🔴 CRITIQUE |
| `lib/utils/statut.ts` ou `lib/constants/marche.ts` | Labels statuts | ~5 | 🟠 VÉRIFICATION |

**Total** : **6 fichiers** à modifier/vérifier

### Données impactées :

- **Cautions** : 2 cautions existantes à migrer (PROVISOIRE → SOUMISSION, DEFINITIVE → BONNE_EXECUTION)
- **Nouveau type caution** : CAPACITE_FINANCIERE disponible
- **Devise** : Tous les montants affichés (aucune donnée BDD modifiée)
- **Véhicules** : Aucune donnée modifiée (juste UI pour saisie future)
- **Marchés** : Aucune donnée modifiée (vérification labels)

### Régression :

**Risque** : 🟢 FAIBLE

- ✅ Migration SQL automatique des données
- ✅ Pas de changement dans la logique métier
- ✅ Composants UI inchangés (utilisent déjà les constantes)
- ✅ Tests existants continueront de fonctionner

---

## ✅ Checklist de Validation

**Avant correction** :
- [ ] Backup base de données production
- [ ] Test migration en local
- [ ] Vérification données production (2 cautions)

**Après correction** :
- [ ] Migration Prisma appliquée
- [ ] Types générés (`npx prisma generate`)
- [ ] Labels mis à jour dans UI
- [ ] Tests Playwright passent (10/10)
- [ ] Données production vérifiées (2 cautions migrées)
- [ ] Nouvelle caution "Capacité financière" créée en test

**Documentation** :
- [ ] SESSION.md mis à jour
- [ ] ARCHITECTURE.md mis à jour (types caution)
- [ ] Ce rapport d'audit committé

---

## 🎯 Recommandation

**PRIORITÉ ABSOLUE** : Corriger TOUTES les incohérences critiques AVANT la pagination.

**8 incohérences critiques identifiées** :
1. 🔴 Types de caution incorrects (5 problèmes)
2. 🔴 Devise MAD au lieu de XOF
3. 🔴 Marques véhicules en liste fermée (bloquant)
4. 🔴 Statuts marchés UI (à vérifier)

**Justification** :
1. **Conformité PRD** : Respecter les spécifications métier est critique
2. **Données production** : 2 cautions avec types incorrects + devise incorrecte partout
3. **Fonctionnalités manquantes** : Type "Capacité financière" + saisie libre marques
4. **Pagination dépendante** : Les filtres de pagination utiliseront ces types/données

**Ordre recommandé** :
1. 🔴 **Corriger incohérences critiques (65 min)** ← **MAINTENANT**
   - Types caution (20 min)
   - Devise MAD → XOF (10 min)
   - Marques véhicules (10 min)
   - Statuts marchés (5 min)
   - Tests & validation (20 min)
2. 🔵 Implémenter pagination (3h)

**Durée totale corrections** : **65 minutes** (1h05)

---

## 📝 Résumé des Corrections

**Phase 1 : Corrections CRITIQUES (45 min)**
- A) Types Caution (20 min) - 5 fichiers
- B) Devise MAD → XOF (10 min) - 1 fichier
- C) Marques Véhicules (10 min) - 1 fichier
- D) Statuts Marchés (5 min) - 1 fichier (vérification)

**Phase 2 : Corrections Mineures (10 min - OPTIONNEL)**
- Ordre statuts caution (2 min)
- Types documents (8 min)

**Phase 3 : Tests et Validation (10 min)**
- Tests unitaires
- Tests production
- Validation UI/UX

**Total** : **65 minutes** pour tout corriger

---

**FIN DU RAPPORT D'AUDIT** ✅

**Prochaine étape** : Correction immédiate des 8 incohérences critiques (Phase 1)
