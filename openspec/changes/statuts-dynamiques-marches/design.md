## Context

Le système actuel de gestion des marchés utilise un modèle de données uniforme avec des champs génériques (`fournisseur*`, dates optionnelles) et un formulaire unique pour tous les statuts. Cette approche ne capture pas la spécificité de chaque étape du cycle de vie d'un marché public.

**État actuel :**
- Modèle Prisma `Marche` avec 11 statuts dans un enum unique
- Formulaire React unique avec les mêmes champs pour tous les statuts
- Validation Zod générique sans logique conditionnelle
- Terminologie incorrecte : "fournisseur" au lieu de "autorité contractante"

**Contraintes :**
- Migration de données existantes requise (renommage colonnes + split de statut)
- Pas de breaking changes pour l'API existante (seulement ajout de champs)
- Performance : éviter les requêtes N+1 pour charger les champs conditionnels
- UX : affichage/masquage dynamique des champs sans rechargement de page

## Goals / Non-Goals

**Goals:**
- Capturer les informations métier spécifiques à chaque statut de marché
- Diviser `RESILIE_ANNULE_INFRUCTUEUX` en trois statuts distincts avec leurs données propres
- Renommer tous les champs `fournisseur*` en `autoriteContractante*` pour refléter la réalité métier (soumissionnaire)
- Valider conditionnellement les champs selon le statut sélectionné
- Afficher dynamiquement les champs pertinents dans le formulaire
- Migrer les données existantes sans perte d'information

**Non-Goals:**
- Modification de la structure d'autorisation ou des rôles utilisateurs
- Ajout de workflows automatisés de transition entre statuts
- Historisation des changements de statut (sera fait dans une future itération)
- Interface de gestion des garanties complète (seulement flag booléen pour EXECUTE_ATTENTE_GARANTIES)

## Decisions

### 1. Approche pour les champs conditionnels : Colonnes nullables vs JSONB

**Décision : Colonnes nullables dans le modèle Prisma**

**Rationale :**
- ✅ Typage fort côté TypeScript et validation Prisma
- ✅ Indexes possibles sur les champs spécifiques (ex: `dateDepotOffre`)
- ✅ Requêtes SQL simples et performantes
- ✅ Migration et rollback plus clairs
- ❌ ~15 nouvelles colonnes dans la table `marches`

**Alternative considérée : Champ JSONB `statutMetadata`**
- ✅ Pas de modification de schéma pour chaque nouveau champ
- ❌ Pas de typage fort, validation manuelle
- ❌ Indexes impossibles sur les données imbriquées
- ❌ Requêtes complexes avec opérateurs JSONB

**Conclusion :** Les bénéfices du typage et de la performance justifient l'ajout de colonnes.

### 2. Division de RESILIE_ANNULE_INFRUCTUEUX : Enum unique vs Champs conditionnels

**Décision : Diviser en 3 enums distincts (`RESILIE`, `ANNULE`, `INFRUCTUEUX`)**

**Rationale :**
- ✅ Clarté métier : chaque terminaison a un sens différent
- ✅ Filtrage et reporting plus précis
- ✅ Validation différente pour chaque cas (ex: `concurrentGagnant` uniquement pour INFRUCTUEUX)
- ✅ UX plus claire : pas de confusion entre les motifs
- ❌ Migration de données requise pour les marchés existants

**Alternative considérée : Conserver RESILIE_ANNULE_INFRUCTUEUX + champ `typeTerminaison`**
- ✅ Pas de modification d'enum
- ❌ Logique conditionnelle complexe partout
- ❌ Moins explicite pour les utilisateurs

**Conclusion :** Division en 3 enums pour la clarté métier.

### 3. Validation conditionnelle : Zod refine vs Schemas multiples

**Décision : Zod schema unique avec `.refine()` et `.superRefine()`**

**Rationale :**
- ✅ Un seul point de validation
- ✅ Cohérence avec le modèle Prisma unifié
- ✅ Réutilisation facile dans le formulaire
- ✅ Messages d'erreur personnalisés par statut
- ❌ Logique de validation plus complexe

**Alternative considérée : Un schema Zod par statut**
- ✅ Validation plus simple à lire
- ❌ 11+ schemas à maintenir
- ❌ Complexité de sélection du bon schema
- ❌ Duplication des champs communs

**Exemple de validation conditionnelle :**
```typescript
marcheSchema.superRefine((data, ctx) => {
  if (data.statut === 'OFFRE_DEPOSEE') {
    if (!data.dateDepotOffre) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date de dépôt est requise pour une offre déposée",
        path: ['dateDepotOffre']
      });
    }
  }
});
```

### 4. Affichage dynamique des champs : Composant unique vs Composants par statut

**Décision : Composant formulaire unique avec affichage conditionnel**

**Rationale :**
- ✅ Réutilisation du code commun (champs de base)
- ✅ Transition fluide lors du changement de statut
- ✅ Un seul composant à maintenir
- ✅ État du formulaire préservé lors du changement de statut
- ❌ Logique conditionnelle dans le JSX

**Implémentation :**
```typescript
const statutSpecificFields = {
  OPPORTUNITE_IDENTIFIEE: ['dateIdentification'],
  OFFRE_DEPOSEE: ['dateDepotOffre', 'delaiValiditeOffre'],
  // ...
};

const fieldsToShow = [
  ...commonFields,
  ...statutSpecificFields[statut] || []
];
```

### 5. Migration des données : Script manuel vs Migration Prisma

**Décision : Migration Prisma en deux étapes**

**Étape 1 - Ajout des colonnes :**
```sql
-- Ajout de toutes les nouvelles colonnes nullable
ALTER TABLE marches ADD COLUMN date_identification TIMESTAMP;
ALTER TABLE marches ADD COLUMN date_depot_prevue TIMESTAMP;
-- ... tous les autres champs

-- Ajout des 3 nouveaux statuts à l'enum
ALTER TYPE "StatutMarche" ADD VALUE 'RESILIE';
ALTER TYPE "StatutMarche" ADD VALUE 'ANNULE';
ALTER TYPE "StatutMarche" ADD VALUE 'INFRUCTUEUX';
```

**Étape 2 - Renommage des colonnes fournisseur :**
```sql
ALTER TABLE marches RENAME COLUMN fournisseur_nom TO autorite_contractante_nom;
ALTER TABLE marches RENAME COLUMN fournisseur_contact TO autorite_contractante_contact;
ALTER TABLE marches RENAME COLUMN fournisseur_email TO autorite_contractante_email;
ALTER TABLE marches RENAME COLUMN fournisseur_tel TO autorite_contractante_tel;
```

**Étape 3 - Migration des données (script séparé) :**
```typescript
// Migrer les marchés RESILIE_ANNULE_INFRUCTUEUX vers les nouveaux statuts
// Logique basée sur les données existantes (dates, notes, etc.)
```

**Rationale :**
- ✅ Traçabilité complète des modifications
- ✅ Rollback possible étape par étape
- ✅ Validation par Prisma
- ❌ Nécessite un script séparé pour la migration des statuts

**Alternative considérée : Script SQL manuel**
- ✅ Plus de contrôle
- ❌ Pas de validation Prisma
- ❌ Difficulté à synchroniser avec le code

### 6. Gestion des garanties dans EXECUTE_ATTENTE_GARANTIES

**Décision : Champ booléen simple `garantiesLiberees` pour le MVP**

**Rationale :**
- ✅ Suffisant pour le MVP (marquer si les garanties sont libérées)
- ✅ Pas de complexité additionnelle
- ✅ Extension future possible vers un modèle `Garantie` relié

**Non-implémenté maintenant :**
- Table séparée `Garantie` avec types et montants
- Workflow de demande/libération de garanties
- Gestion des cautions multiples

## Risks / Trade-offs

### [Risk] Migration de données complexe
**→ Mitigation :**
- Créer un script de migration séparé avec dry-run
- Tester sur une copie de la base de données de production
- Prévoir un plan de rollback détaillé
- Logger tous les changements de statut pendant la migration

### [Risk] Performance avec 15+ nouvelles colonnes
**→ Mitigation :**
- Les colonnes sont nullables (pas de surcharge mémoire si non utilisées)
- Indexes déjà présents sur les champs fréquemment filtrés
- Monitoring des requêtes après déploiement
- Pagination déjà en place pour les listes

### [Risk] Validation conditionnelle complexe
**→ Mitigation :**
- Tests unitaires exhaustifs pour chaque combinaison statut/champs
- Documentation claire des règles de validation
- Messages d'erreur explicites pour l'utilisateur
- Validation côté serveur ET client pour la sécurité

### [Risk] UX dégradée si trop de champs apparaissent/disparaissent
**→ Mitigation :**
- Grouper les champs par sections logiques
- Animation douce lors de l'affichage/masquage
- Conserver les valeurs saisies si l'utilisateur change de statut
- Avertissement si changement de statut entraîne perte de données

### [Risk] Marchés existants avec RESILIE_ANNULE_INFRUCTUEUX
**→ Mitigation :**
- Interface admin pour corriger manuellement les statuts ambigus
- Script de migration avec règles heuristiques (basées sur dates/notes)
- Possibilité de flag `migrationManuelleRequise` pour review humaine

### [Risk] Breaking change pour les clients API existants
**→ Mitigation :**
- Les champs `autoriteContractante*` remplacent `fournisseur*` dans le schema
- Pas de versioning d'API pour le MVP (pas d'API publique)
- Si API externe future : alias ou transformation dans le resolver GraphQL

## Migration Plan

### Phase 1 : Préparation (Avant déploiement)
1. Créer une branche `feat/statuts-dynamiques`
2. Créer la migration Prisma avec les nouveaux champs
3. Tester la migration sur une DB de dev
4. Créer un backup de la DB de production

### Phase 2 : Déploiement du schéma (Downtime minimal)
1. Exécuter la migration Prisma (ajout colonnes + renommage)
2. Redéployer l'application avec le nouveau code
3. Vérifier que l'application fonctionne avec les données existantes

### Phase 3 : Migration des données (Post-déploiement)
1. Exécuter le script de migration des statuts `RESILIE_ANNULE_INFRUCTUEUX`
2. Logger tous les marchés nécessitant une révision manuelle
3. Interface admin pour corriger les statuts ambigus

### Phase 4 : Validation
1. Tests fonctionnels sur tous les statuts
2. Vérification des filtres et rapports
3. Validation par les utilisateurs métier

### Rollback Strategy
1. **Avant migration données :** `prisma migrate rollback` + redéploiement ancien code
2. **Après migration données :** Impossible sans perte de données → nécessite backup restore
3. **Alternative :** Garder les anciennes colonnes `fournisseur*` pendant 1 mois comme fallback

## Open Questions

1. **Migration des marchés RESILIE_ANNULE_INFRUCTUEUX** : Quelle logique heuristique pour déterminer automatiquement le nouveau statut ?
   - Option A : Basé sur la présence de dates spécifiques
   - Option B : Tous passent en `RESILIE` par défaut + correction manuelle
   - Option C : Interface de classification assistée

2. **Champs garanties** : Faut-il implémenter dès maintenant une structure pour les multiples garanties ou rester sur un booléen ?
   - Décision : Rester sur booléen pour le MVP (déjà décidé ci-dessus)

3. **Validation de cohérence des dates** : Doit-on valider que `dateAttributionProvisoire < dateAttributionDefinitive` ?
   - Recommandation : Oui, ajouter des validations cross-field

4. **Transition de statuts** : Faut-il bloquer certaines transitions de statut (ex: CLOTURE → DOSSIER_EN_PREPARATION) ?
   - Recommandation : Non pour le MVP, sera géré dans une future itération sur les workflows
