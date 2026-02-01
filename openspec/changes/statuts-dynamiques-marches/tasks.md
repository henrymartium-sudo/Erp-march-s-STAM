## 1. Backup et préparation

- [x] 1.1 Créer une branche Git `feat/statuts-dynamiques-marches`
- [x] 1.2 Créer un backup complet de la base de données de développement
- [x] 1.3 Documenter l'état actuel des données (nombre de marchés par statut)

## 2. Modification du schéma Prisma

- [x] 2.1 Ajouter les 3 nouveaux statuts à l'enum StatutMarche (RESILIE, ANNULE, INFRUCTUEUX)
- [x] 2.2 Ajouter le champ `dateIdentification` (DateTime?, optionnel) pour OPPORTUNITE_IDENTIFIEE
- [x] 2.3 Ajouter le champ `dateDepotPrevue` (DateTime?, optionnel) pour DOSSIER_EN_PREPARATION
- [x] 2.4 Ajouter les champs `dateDepotOffre` et `delaiValiditeOffre` (DateTime?, Int?) pour OFFRE_DEPOSEE
- [x] 2.5 Ajouter le champ `dateAttributionProvisoire` (DateTime?, optionnel) pour ATTRIBUE_PROVISOIREMENT
- [x] 2.6 Ajouter le champ `dateAttributionDefinitive` (DateTime?, optionnel) pour ATTRIBUE_DEFINITIVEMENT
- [x] 2.7 Ajouter les champs `dateLivraisonPrevue` et `dureeLivraisonPrevue` (DateTime?, Int?) pour EN_ATTENTE_LIVRAISON_OS
- [x] 2.8 Ajouter le champ `dateReceptionProvisoirePrevue` (DateTime?, optionnel) pour EN_EXECUTION
- [x] 2.9 Ajouter le champ `garantiesLiberees` (Boolean?, @default(false)) pour EXECUTE_ATTENTE_GARANTIES
- [x] 2.10 Ajouter le champ `dateClotureAdministrative` (DateTime?, optionnel) pour CLOTURE
- [x] 2.11 Ajouter les champs `dateResiliation` et `motifsResiliation` (DateTime?, String?) pour RESILIE
- [x] 2.12 Ajouter les champs `dateAnnulation` et `motifsAnnulation` (DateTime?, String?) pour ANNULE
- [x] 2.13 Ajouter les champs `dateInfructueux`, `motifsInfructueux`, `concurrentGagnant`, `montantOffreConcurrent` (DateTime?, String?, String?, Decimal?) pour INFRUCTUEUX
- [x] 2.14 Renommer `fournisseurNom` en `autoriteContractanteNom`
- [x] 2.15 Renommer `fournisseurContact` en `autoriteContractanteContact`
- [x] 2.16 Renommer `fournisseurEmail` en `autoriteContractanteEmail`
- [x] 2.17 Renommer `fournisseurTel` en `autoriteContractanteTel`

## 3. Migration de base de données

- [x] 3.1 Créer la migration Prisma avec `npx prisma migrate dev --name add_status_specific_fields_and_rename_fournisseur`
- [x] 3.2 Vérifier que la migration SQL contient tous les nouveaux champs
- [x] 3.3 Vérifier que la migration SQL contient les renommages de colonnes
- [x] 3.4 Vérifier que la migration SQL ajoute les 3 nouveaux statuts à l'enum
- [x] 3.5 Exécuter la migration sur la base de développement
- [x] 3.6 Vérifier que les types TypeScript Prisma sont régénérés correctement

## 4. Script de migration des données

- [x] 4.1 Créer un script `prisma/migrate-statuts.ts` pour migrer les marchés RESILIE_ANNULE_INFRUCTUEUX
- [x] 4.2 Implémenter la logique heuristique de classification (basée sur dates/notes existantes)
- [x] 4.3 Ajouter un flag `migrationManuelleRequise` pour les cas ambigus
- [x] 4.4 Tester le script sur une copie de la base de données
- [x] 4.5 Générer un rapport de migration listant les marchés nécessitant révision manuelle
- [x] 4.6 Exécuter le script de migration sur la base de développement
- [x] 4.7 Documenter les résultats de la migration (combien par nouveau statut)

## 5. Mise à jour des utilitaires de statut

- [x] 5.1 Modifier `lib/utils/statut.ts` - ajouter les labels pour RESILIE, ANNULE, INFRUCTUEUX dans STATUT_LABELS
- [x] 5.2 Retirer le label pour RESILIE_ANNULE_INFRUCTUEUX de STATUT_LABELS
- [x] 5.3 Ajouter les couleurs pour les 3 nouveaux statuts dans STATUT_COLORS (rouge pour RESILIE, gris pour ANNULE, orange pour INFRUCTUEUX)
- [x] 5.4 Retirer la couleur pour RESILIE_ANNULE_INFRUCTUEUX de STATUT_COLORS

## 6. Validation Zod - Champs de base

- [x] 6.1 Modifier `lib/validations/marche.ts` - renommer les champs fournisseur en autoriteContractante dans le schéma de base
- [x] 6.2 Ajouter tous les nouveaux champs optionnels au schéma Zod (dates, motifs, etc.)
- [x] 6.3 Valider les types corrects (DateTime pour dates, Int pour délais, Decimal pour montants)

## 7. Validation Zod - Logique conditionnelle

- [x] 7.1 Ajouter `.superRefine()` au marcheSchema pour valider conditionnellement selon le statut
- [x] 7.2 Implémenter la validation pour OPPORTUNITE_IDENTIFIEE (dateIdentification si fournie)
- [x] 7.3 Implémenter la validation pour DOSSIER_EN_PREPARATION (dateDepotPrevue si fournie)
- [x] 7.4 Implémenter la validation pour OFFRE_DEPOSEE (dateDepotOffre, delaiValiditeOffre si fournis)
- [x] 7.5 Implémenter la validation pour ATTRIBUE_PROVISOIREMENT (dateAttributionProvisoire si fournie)
- [x] 7.6 Implémenter la validation pour ATTRIBUE_DEFINITIVEMENT (dateAttributionDefinitive si fournie)
- [x] 7.7 Ajouter validation cross-field : dateAttributionDefinitive >= dateAttributionProvisoire
- [x] 7.8 Implémenter la validation pour EN_ATTENTE_LIVRAISON_OS (dateLivraisonPrevue, dureeLivraisonPrevue si fournis)
- [x] 7.9 Implémenter la validation pour EN_EXECUTION (dateReceptionProvisoirePrevue si fournie)
- [x] 7.10 Implémenter la validation pour RESILIE (dateResiliation, motifsResiliation min 10 char si fourni)
- [x] 7.11 Implémenter la validation pour ANNULE (dateAnnulation, motifsAnnulation min 10 char si fourni)
- [x] 7.12 Implémenter la validation pour INFRUCTUEUX (tous les champs + montantOffreConcurrent positif si fourni)
- [x] 7.13 Tester la validation avec des données valides et invalides pour chaque statut

## 8. Server Actions - Mise à jour

- [x] 8.1 Modifier `lib/actions/marches.ts` - mettre à jour les types pour utiliser autoriteContractante
- [x] 8.2 Vérifier que createMarche accepte tous les nouveaux champs optionnels
- [x] 8.3 Vérifier que updateMarche accepte tous les nouveaux champs optionnels
- [x] 8.4 Vérifier que getMarcheById retourne tous les nouveaux champs
- [x] 8.5 Vérifier que getAllMarches filtre correctement avec les nouveaux statuts RESILIE, ANNULE, INFRUCTUEUX
- [x] 8.6 Tester les Server Actions avec des données contenant les nouveaux champs

## 9. Composant de formulaire - Structure de base

- [x] 9.1 Modifier `components/marches/marche-form.tsx` - renommer les champs fournisseur en autoriteContractante
- [x] 9.2 Mettre à jour les labels des champs (Autorité contractante au lieu de Fournisseur)
- [x] 9.3 Mettre à jour le select de statut pour inclure les 13 statuts
- [x] 9.4 Grouper les statuts de terminaison (RESILIE, ANNULE, INFRUCTUEUX) dans un optgroup "Terminés"

## 10. Composant de formulaire - Champs dynamiques

- [x] 10.1 Créer une fonction helper `getStatutSpecificFields(statut)` qui retourne les champs à afficher
- [x] 10.2 Ajouter un état React pour tracker le statut sélectionné
- [x] 10.3 Implémenter l'affichage conditionnel avec `watch` de React Hook Form
- [x] 10.4 Ajouter les champs pour OPPORTUNITE_IDENTIFIEE (dateIdentification avec DatePicker)
- [x] 10.5 Ajouter les champs pour DOSSIER_EN_PREPARATION (dateDepotPrevue avec DatePicker)
- [x] 10.6 Ajouter les champs pour OFFRE_DEPOSEE (dateDepotOffre avec DatePicker, delaiValiditeOffre avec Input number)
- [x] 10.7 Ajouter les champs pour ATTRIBUE_PROVISOIREMENT (dateAttributionProvisoire avec DatePicker)
- [x] 10.8 Ajouter les champs pour ATTRIBUE_DEFINITIVEMENT (dateAttributionDefinitive avec DatePicker)
- [x] 10.9 Ajouter les champs pour EN_ATTENTE_LIVRAISON_OS (dateLivraisonPrevue avec DatePicker, dureeLivraisonPrevue avec Input number)
- [x] 10.10 Ajouter les champs pour EN_EXECUTION (dateReceptionProvisoirePrevue avec DatePicker)
- [x] 10.11 Ajouter le champ pour EXECUTE_ATTENTE_GARANTIES (garantiesLiberees avec Checkbox)
- [x] 10.12 Ajouter le champ pour CLOTURE (dateClotureAdministrative avec DatePicker)
- [x] 10.13 Ajouter les champs pour RESILIE (dateResiliation avec DatePicker, motifsResiliation avec Textarea)
- [x] 10.14 Ajouter les champs pour ANNULE (dateAnnulation avec DatePicker, motifsAnnulation avec Textarea)
- [x] 10.15 Ajouter les champs pour INFRUCTUEUX (dateInfructueux avec DatePicker, motifsInfructueux avec Textarea, concurrentGagnant avec Input, montantOffreConcurrent avec Input number)

## 11. Composant de formulaire - UX et animations

- [x] 11.1 Ajouter des animations CSS (fade-in/out) pour l'affichage/masquage des champs conditionnels
- [x] 11.2 Regrouper visuellement les champs spécifiques dans une Card ou section avec titre
- [x] 11.3 Implémenter la préservation des valeurs lors du changement de statut (utiliser `watch` sans `unregister`)
- [x] 11.4 Ajouter un avertissement (warning toast) si l'utilisateur sélectionne un statut de terminaison sans remplir date/motifs
- [x] 11.5 Tester l'UX : transitions fluides, pas de sauts visuels, focus géré correctement

## 12. Composant de détail - Affichage conditionnel

- [x] 12.1 Modifier `components/marches/marche-detail.tsx` - renommer les labels fournisseur en autorité contractante
- [x] 12.2 Créer une section "Informations spécifiques au statut" dans le layout
- [x] 12.3 Implémenter l'affichage conditionnel des champs selon le statut actuel
- [x] 12.4 Afficher uniquement les champs qui ont une valeur (masquer les champs null)
- [x] 12.5 Formater les dates spécifiques avec date-fns en français
- [x] 12.6 Formater le montantOffreConcurrent avec séparateur de milliers + "DH"
- [x] 12.7 Pour les statuts de terminaison, afficher les informations dans une Card colorée distincte
- [x] 12.8 Pour INFRUCTUEUX, afficher le concurrent gagnant et son montant de manière proéminente

## 13. Composant Badge - Nouveaux statuts

- [x] 13.1 Modifier `components/marches/statut-badge.tsx` - retirer la gestion de RESILIE_ANNULE_INFRUCTUEUX
- [x] 13.2 Ajouter le style pour RESILIE (variant destructive, rouge)
- [x] 13.3 Ajouter le style pour ANNULE (variant secondary, gris)
- [x] 13.4 Ajouter le style pour INFRUCTUEUX (variant warning ou custom orange)
- [x] 13.5 Vérifier l'affichage de tous les badges avec les nouveaux statuts

## 14. Filtres - Mise à jour

- [x] 14.1 Modifier `components/marches/marche-filters.tsx` - ajouter RESILIE, ANNULE, INFRUCTUEUX au select de statut
- [x] 14.2 Retirer RESILIE_ANNULE_INFRUCTUEUX du select de statut
- [x] 14.3 Grouper les 3 statuts de terminaison dans un optgroup "Terminés"
- [x] 14.4 Tester le filtrage avec les nouveaux statuts

## 15. Seed script - Données de test

- [x] 15.1 Modifier `prisma/seed.ts` - remplacer les champs fournisseur par autoriteContractante
- [x] 15.2 Ajouter des marchés de test avec statut RESILIE (avec dateResiliation et motifsResiliation)
- [x] 15.3 Ajouter des marchés de test avec statut ANNULE (avec dateAnnulation et motifsAnnulation)
- [x] 15.4 Ajouter des marchés de test avec statut INFRUCTUEUX (avec tous les champs spécifiques)
- [x] 15.5 Retirer les marchés avec statut RESILIE_ANNULE_INFRUCTUEUX
- [x] 15.6 Ajouter des marchés avec champs spécifiques pour chaque statut intermédiaire
- [x] 15.7 Exécuter le seed script (`npx prisma db seed`) et vérifier les données

## 16. Tests manuels - Formulaires

- [x] 16.1 Tester la création d'un marché avec statut OPPORTUNITE_IDENTIFIEE et dateIdentification
- [x] 16.2 Tester la création d'un marché avec statut OFFRE_DEPOSEE et ses champs spécifiques
- [x] 16.3 Tester la création d'un marché RESILIE avec date et motifs
- [x] 16.4 Tester la création d'un marché ANNULE avec date et motifs
- [x] 16.5 Tester la création d'un marché INFRUCTUEUX avec tous les champs (concurrent, montant)
- [x] 16.6 Tester la modification d'un marché avec changement de statut (vérifier préservation des données)
- [x] 16.7 Tester la validation : dateAttributionDefinitive < dateAttributionProvisoire doit échouer
- [x] 16.8 Tester la validation : motifsResiliation < 10 caractères doit échouer

## 17. Tests manuels - Affichage et filtres

- [x] 17.1 Tester l'affichage de la liste avec marchés RESILIE, ANNULE, INFRUCTUEUX
- [x] 17.2 Vérifier que les badges de statut affichent les bonnes couleurs
- [x] 17.3 Tester le filtrage par statut RESILIE uniquement
- [x] 17.4 Tester le filtrage par statut ANNULE uniquement
- [x] 17.5 Tester le filtrage par statut INFRUCTUEUX uniquement
- [x] 17.6 Tester la page détail d'un marché INFRUCTUEUX (vérifier affichage concurrent/montant)
- [x] 17.7 Tester la page détail d'un marché avec plusieurs champs spécifiques remplis

## 18. Tests responsives

- [x] 18.1 Tester le formulaire avec champs dynamiques sur desktop (1920x1080)
- [x] 18.2 Tester le formulaire avec champs dynamiques sur tablette (768x1024)
- [x] 18.3 Tester le formulaire avec champs dynamiques sur mobile (375x667)
- [x] 18.4 Vérifier que les transitions d'affichage/masquage fonctionnent sur mobile
- [x] 18.5 Vérifier que les textarea de motifs sont utilisables sur mobile

## 19. Documentation et finalisation

- [x] 19.1 Documenter les nouveaux champs dans `.env.example` si nécessaire
- [x] 19.2 Mettre à jour le fichier ARCHITECTURE.md avec les nouveaux champs du modèle Marche
- [x] 19.3 Créer un fichier MIGRATION.md documentant la stratégie de migration des statuts
- [x] 19.4 Vérifier qu'aucun console.log n'est présent dans le code
- [x] 19.5 Exécuter `npm run build` pour vérifier qu'il n'y a pas d'erreurs TypeScript
- [x] 19.6 Tester l'application en mode production localement (`npm run build && npm start`)

## 20. Préparation au déploiement

- [x] 20.1 Créer une Pull Request avec tous les changements
- [x] 20.2 Documenter dans la PR : nouveaux champs, breaking changes (renommage fournisseur), migration requise
- [x] 20.3 Créer un script de rollback en cas de problème post-déploiement
- [x] 20.4 Préparer un plan de déploiement étape par étape (backup → migration schema → migration données → validation)
- [x] 20.5 Documenter les marchés qui nécessitent révision manuelle après migration
