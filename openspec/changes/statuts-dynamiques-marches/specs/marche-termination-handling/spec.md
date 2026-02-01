## ADDED Requirements

### Requirement: System SHALL split RESILIE_ANNULE_INFRUCTUEUX into three distinct statuses

Le système doit remplacer le statut unique `RESILIE_ANNULE_INFRUCTUEUX` par trois statuts distincts : `RESILIE`, `ANNULE`, et `INFRUCTUEUX`.

#### Scenario: StatutMarche enum contains RESILIE status
- **WHEN** le schéma Prisma est examiné
- **THEN** l'enum `StatutMarche` contient la valeur `RESILIE`
- **THEN** la valeur `RESILIE_ANNULE_INFRUCTUEUX` n'existe plus dans l'enum

#### Scenario: StatutMarche enum contains ANNULE status
- **WHEN** le schéma Prisma est examiné
- **THEN** l'enum `StatutMarche` contient la valeur `ANNULE`

#### Scenario: StatutMarche enum contains INFRUCTUEUX status
- **WHEN** le schéma Prisma est examiné
- **THEN** l'enum `StatutMarche` contient la valeur `INFRUCTUEUX`

### Requirement: System SHALL provide status-specific fields for RESILIE

Le système doit capturer la date et les motifs de résiliation.

#### Scenario: RESILIE requires dateResiliation and motifsResiliation
- **WHEN** le statut d'un marché est `RESILIE`
- **THEN** le champ `dateResiliation` (DateTime) est disponible
- **THEN** le champ `motifsResiliation` (String, texte long) est disponible
- **THEN** les deux champs sont optionnels dans le modèle Prisma
- **THEN** les deux champs sont affichés dans le formulaire
- **THEN** `dateResiliation` est validé comme date si fourni
- **THEN** `motifsResiliation` est validé comme texte de minimum 10 caractères si fourni

#### Scenario: RESILIE form shows appropriate labels
- **WHEN** le formulaire affiche les champs pour le statut `RESILIE`
- **THEN** le label du champ date est "Date de résiliation"
- **THEN** le label du champ motifs est "Motifs de la résiliation"
- **THEN** le champ motifs est un textarea multi-lignes

### Requirement: System SHALL provide status-specific fields for ANNULE

Le système doit capturer la date et les motifs d'annulation.

#### Scenario: ANNULE requires dateAnnulation and motifsAnnulation
- **WHEN** le statut d'un marché est `ANNULE`
- **THEN** le champ `dateAnnulation` (DateTime) est disponible
- **THEN** le champ `motifsAnnulation` (String, texte long) est disponible
- **THEN** les deux champs sont optionnels dans le modèle Prisma
- **THEN** les deux champs sont affichés dans le formulaire
- **THEN** `dateAnnulation` est validé comme date si fourni
- **THEN** `motifsAnnulation` est validé comme texte de minimum 10 caractères si fourni

#### Scenario: ANNULE form shows appropriate labels
- **WHEN** le formulaire affiche les champs pour le statut `ANNULE`
- **THEN** le label du champ date est "Date d'annulation"
- **THEN** le label du champ motifs est "Motifs de l'annulation"
- **THEN** le champ motifs est un textarea multi-lignes

### Requirement: System SHALL provide status-specific fields for INFRUCTUEUX

Le système doit capturer la date, les motifs, le concurrent gagnant et son montant d'offre.

#### Scenario: INFRUCTUEUX requires complete competitive context
- **WHEN** le statut d'un marché est `INFRUCTUEUX`
- **THEN** le champ `dateInfructueux` (DateTime) est disponible
- **THEN** le champ `motifsInfructueux` (String, texte long) est disponible
- **THEN** le champ `concurrentGagnant` (String) est disponible
- **THEN** le champ `montantOffreConcurrent` (Decimal) est disponible
- **THEN** tous les champs sont optionnels dans le modèle Prisma

#### Scenario: INFRUCTUEUX form shows all competitive fields
- **WHEN** le formulaire affiche les champs pour le statut `INFRUCTUEUX`
- **THEN** le label du champ date est "Date de l'appel d'offres infructueux"
- **THEN** le label du champ motifs est "Motifs (pourquoi l'offre n'a pas été retenue)"
- **THEN** le label du champ concurrent est "Concurrent gagnant"
- **THEN** le label du champ montant est "Montant de l'offre du concurrent (DH)"
- **THEN** le champ motifs est un textarea multi-lignes
- **THEN** le champ montant est un input number avec décimales

#### Scenario: INFRUCTUEUX validates montantOffreConcurrent format
- **WHEN** l'utilisateur saisit un montant d'offre concurrent
- **THEN** le montant est validé comme nombre positif
- **THEN** le montant accepte jusqu'à 2 décimales
- **THEN** le montant est formaté avec séparateur de milliers à l'affichage

### Requirement: System SHALL distinguish termination types in UI

L'interface doit clairement différencier les trois types de terminaison.

#### Scenario: Status badges use distinct colors for termination types
- **WHEN** un badge de statut est affiché pour un marché terminé
- **THEN** le statut `RESILIE` utilise une couleur rouge/destructive
- **THEN** le statut `ANNULE` utilise une couleur gris/neutre
- **THEN** le statut `INFRUCTUEUX` utilise une couleur orange/warning
- **THEN** les labels sont explicites : "Résilié", "Annulé", "Infructueux"

#### Scenario: Filters distinguish between termination types
- **WHEN** l'utilisateur filtre les marchés par statut
- **THEN** les trois statuts de terminaison apparaissent séparément dans le select
- **THEN** ils sont regroupés sous une optgroup "Terminés"
- **THEN** chaque option affiche le label complet

### Requirement: System SHALL migrate existing RESILIE_ANNULE_INFRUCTUEUX data

Le système doit fournir un script de migration pour les données existantes.

#### Scenario: Migration script exists and is documented
- **WHEN** la migration Prisma est exécutée
- **THEN** un script de migration des données existe dans `prisma/migrations/`
- **THEN** le script contient des instructions pour mapper les anciens marchés
- **THEN** un fichier README explique la stratégie de migration

#### Scenario: Migration handles ambiguous cases
- **WHEN** un marché ancien a le statut `RESILIE_ANNULE_INFRUCTUEUX`
- **THEN** le script de migration tente de déterminer le nouveau statut
- **THEN** si impossible à déterminer automatiquement, le marché est flaggé pour révision manuelle
- **THEN** un rapport de migration est généré listant les marchés à réviser

#### Scenario: Migration preserves all historical data
- **WHEN** la migration est exécutée
- **THEN** aucune donnée existante n'est perdue
- **THEN** les notes ou commentaires existants sont conservés
- **THEN** les dates existantes sont préservées

### Requirement: System SHALL provide admin interface for manual status correction

Le système doit permettre la correction manuelle des statuts ambigus après migration.

#### Scenario: Admin can review flagged marches
- **WHEN** un administrateur accède à l'interface de révision post-migration
- **THEN** tous les marchés flaggés sont listés
- **THEN** pour chaque marché, les informations existantes sont affichées
- **THEN** l'administrateur peut sélectionner le statut correct (RESILIE, ANNULE, ou INFRUCTUEUX)

#### Scenario: Admin can batch-update flagged marches
- **WHEN** l'administrateur corrige un statut ambigu
- **THEN** le marché est mis à jour avec le nouveau statut
- **THEN** le flag de révision est retiré
- **THEN** une trace de la correction est loggée (qui, quand, quel changement)

### Requirement: System SHALL validate termination data completeness

Le système doit encourager la saisie de données complètes pour les terminaisons.

#### Scenario: Warning when termination lacks details
- **WHEN** un utilisateur change le statut vers RESILIE, ANNULE, ou INFRUCTUEUX
- **WHEN** les champs de date ou motifs ne sont pas remplis
- **THEN** un avertissement (warning, pas erreur) est affiché
- **THEN** le message indique "Il est recommandé de saisir la date et les motifs"
- **THEN** l'utilisateur peut quand même sauvegarder

#### Scenario: Validation enforces minimum motifs length when provided
- **WHEN** l'utilisateur saisit des motifs de terminaison
- **THEN** le texte doit contenir au moins 10 caractères
- **THEN** un message d'erreur indique "Les motifs doivent être explicites (minimum 10 caractères)"
- **THEN** la validation se produit à la soumission

### Requirement: System SHALL support reporting on termination types

Les rapports doivent pouvoir analyser les terminaisons par type.

#### Scenario: Dashboard shows termination breakdown
- **WHEN** le tableau de bord affiche les statistiques des marchés
- **THEN** les terminaisons sont groupées séparément (RESILIE, ANNULE, INFRUCTUEUX)
- **THEN** le nombre de marchés de chaque type est affiché
- **THEN** le pourcentage par rapport au total est calculé

#### Scenario: Reports can filter by termination type
- **WHEN** un rapport est généré sur les marchés terminés
- **THEN** l'utilisateur peut filtrer par type de terminaison
- **THEN** les motifs de terminaison sont inclus dans l'export
- **THEN** pour les infructueux, le concurrent gagnant et son montant sont affichés
