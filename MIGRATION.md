# Guide de Migration - Statuts Dynamiques des Marchés

## Vue d'ensemble

Ce document décrit la stratégie de migration pour l'ajout des champs spécifiques par statut et la séparation du statut `RESILIE_ANNULE_INFRUCTUEUX` en trois statuts distincts.

## Changements Principaux

### 1. Modèle de Données

**Champs renommés :**
- `fournisseurNom` → `autoriteContractanteNom`
- `fournisseurContact` → `autoriteContractanteContact`
- `fournisseurEmail` → `autoriteContractanteEmail`
- `fournisseurTel` → `autoriteContractanteTel`

**Nouveaux statuts :**
- `RESILIE_ANNULE_INFRUCTUEUX` (ancien) → séparé en :
  - `RESILIE` - Marché résilié
  - `ANNULE` - Marché annulé
  - `INFRUCTUEUX` - Appel d'offres infructueux

**Nouveaux champs spécifiques par statut :**
- `OPPORTUNITE_IDENTIFIEE` : `dateIdentification`
- `DOSSIER_EN_PREPARATION` : `dateDepotPrevue`
- `OFFRE_DEPOSEE` : `dateDepotOffre`, `delaiValiditeOffre`
- `ATTRIBUE_PROVISOIREMENT` : `dateAttributionProvisoire`
- `ATTRIBUE_DEFINITIVEMENT` : `dateAttributionDefinitive`
- `EN_ATTENTE_LIVRAISON_OS` : `dateLivraisonPrevue`, `dureeLivraisonPrevue`
- `EN_EXECUTION` : `dateReceptionProvisoirePrevue`
- `EXECUTE_ATTENTE_GARANTIES` : `garantiesLiberees`
- `CLOTURE` : `dateClotureAdministrative`
- `RESILIE` : `dateResiliation`, `motifsResiliation`
- `ANNULE` : `dateAnnulation`, `motifsAnnulation`
- `INFRUCTUEUX` : `dateInfructueux`, `motifsInfructueux`, `concurrentGagnant`, `montantOffreConcurrent`

### 2. Migration du Schéma

**Fichier :** `prisma/migrations/20260131154507_add_status_specific_fields_and_rename_fournisseur/migration.sql`

La migration effectue automatiquement :
1. Ajout des 3 nouveaux statuts à l'enum `StatutMarche`
2. Ajout de tous les champs spécifiques (optionnels, nullable)
3. Renommage des colonnes `fournisseur*` vers `autoriteContractante*`

**Commande d'application :**
```bash
npx prisma migrate deploy
```

### 3. Migration des Données

**Script :** `prisma/migrate-statuts.ts`

**Logique heuristique de classification :**

Pour les marchés avec statut `RESILIE_ANNULE_INFRUCTUEUX`, le script applique les règles suivantes :

1. **RESILIE** : Si indication de résiliation dans les notes/métadonnées
   - Peupler `dateResiliation` (date du changement de statut ou `updatedAt`)
   - Peupler `motifsResiliation` si disponible dans les notes

2. **ANNULE** : Si indication d'annulation avant attribution
   - Peupler `dateAnnulation`
   - Peupler `motifsAnnulation` si disponible

3. **INFRUCTUEUX** : Défaut pour les appels d'offres non aboutis
   - Peupler `dateInfructueux`
   - Peupler `motifsInfructueux`, `concurrentGagnant`, `montantOffreConcurrent` si disponible

**Cas nécessitant révision manuelle :**
- Marchés sans métadonnées suffisantes pour classification
- Marqués avec flag `migrationManuelleRequise = true`
- Rapport généré dans `migration-report.json`

**Exécution du script :**
```bash
npm run migrate:statuts
```

### 4. Plan de Déploiement

**Étapes recommandées :**

1. **Backup complet de la base de données**
   ```bash
   pg_dump -h HOST -U USER -d DATABASE > backup_pre_migration.sql
   ```

2. **Documenter l'état actuel**
   ```bash
   # Compter les marchés par statut
   SELECT statut, COUNT(*) FROM marches GROUP BY statut;
   ```

3. **Appliquer la migration du schéma**
   ```bash
   npx prisma migrate deploy
   ```

4. **Exécuter le script de migration des données**
   ```bash
   npm run migrate:statuts
   ```

5. **Valider les résultats**
   ```bash
   # Vérifier les nouveaux statuts
   SELECT statut, COUNT(*) FROM marches GROUP BY statut;

   # Vérifier les marchés à réviser manuellement
   SELECT id, numero, objet FROM marches WHERE migrationManuelleRequise = true;
   ```

6. **Révision manuelle des marchés flaggés**
   - Consulter `migration-report.json`
   - Corriger manuellement les statuts et champs associés

7. **Régénérer le Prisma Client**
   ```bash
   npx prisma generate
   ```

8. **Tester en environnement de staging**
   - Vérifier formulaires avec champs dynamiques
   - Tester filtrage par nouveaux statuts
   - Valider affichage badges et couleurs

9. **Déploiement en production**
   - Période de maintenance courte (< 5 min)
   - Application migration + restart serveur

### 5. Rollback en Cas de Problème

**Script de rollback :**
```sql
-- Restaurer depuis backup
psql -h HOST -U USER -d DATABASE < backup_pre_migration.sql
```

**Rollback du code :**
```bash
git revert <commit-hash>
npm run build
npm restart
```

### 6. Validation Post-Déploiement

**Checklist :**
- [ ] Tous les marchés ont un statut valide (pas de `RESILIE_ANNULE_INFRUCTUEUX`)
- [ ] Les champs `autoriteContractante*` contiennent les bonnes données
- [ ] Les champs spécifiques par statut sont correctement peuplés
- [ ] Les filtres fonctionnent avec les 3 nouveaux statuts
- [ ] Les badges affichent les bonnes couleurs
- [ ] Les formulaires affichent les bons champs selon le statut sélectionné
- [ ] Pas d'erreurs dans les logs serveur
- [ ] Les marchés flaggés ont été révisés manuellement

## Notes Techniques

### Compatibilité Arrière

**Breaking changes :**
- Les champs `fournisseur*` n'existent plus → utiliser `autoriteContractante*`
- Le statut `RESILIE_ANNULE_INFRUCTUEUX` n'existe plus → utiliser `RESILIE`, `ANNULE`, ou `INFRUCTUEUX`

**Impact sur le code :**
- Tous les composants ont été mis à jour
- Les schémas de validation Zod reflètent les nouveaux champs
- Les Server Actions gèrent les champs spécifiques par statut

### Performance

**Index ajoutés :**
- Index existants sur `numero`, `statut`, `dateFinPrevue` maintenus
- Pas de nouvel index requis (champs optionnels peu utilisés pour filtrage)

**Taille de la table :**
- +20 colonnes optionnelles
- Estimation : ~5-10% d'augmentation de taille (nullable = faible coût)

## Contact

En cas de problème pendant la migration :
1. Consulter les logs : `npm run logs`
2. Vérifier `migration-report.json`
3. Contacter l'équipe de développement

---

**Dernière mise à jour** : 2026-02-01
