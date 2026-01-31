## ADDED Requirements

### Requirement: System SHALL provide Zod validation schema for Marche

Le système doit définir un schéma de validation Zod pour toutes les opérations sur les marchés.

#### Scenario: Zod schema validates all required fields
- **WHEN** le fichier `lib/validations/marche.ts` est examiné
- **THEN** le schéma `marcheSchema` existe
- **THEN** le champ `numero` est requis (string, min 1 caractère)
- **THEN** le champ `objet` est requis (string, min 10 caractères)
- **THEN** le champ `type` est validé comme enum TypeMarche
- **THEN** le champ `montant` est validé comme number positif
- **THEN** le champ `dateNotification` est validé comme date
- **THEN** le champ `delaiExecution` est validé comme entier positif

#### Scenario: Zod schema validates optional fields
- **WHEN** le schéma de validation est examiné
- **THEN** le champ `dateOrdreService` est optionnel (date)
- **THEN** le champ `dateReception` est optionnel (date)
- **THEN** les champs fournisseur contact/email/tel sont optionnels

#### Scenario: Zod schema provides type inference
- **WHEN** le fichier de validation est examiné
- **THEN** le type `MarcheInput` est inféré depuis le schéma Zod
- **THEN** le type est exporté pour utilisation dans les composants

### Requirement: System SHALL implement createMarche Server Action

Le système doit fournir une Server Action pour créer un nouveau marché.

#### Scenario: Server Action creates marche successfully
- **WHEN** la fonction `createMarche` est appelée avec des données valides
- **THEN** les données sont validées avec le schéma Zod
- **THEN** un nouveau marché est créé dans la base de données
- **THEN** le cache Next.js est revalidé pour `/marches`
- **THEN** le marché créé est retourné

#### Scenario: Server Action rejects invalid data
- **WHEN** la fonction `createMarche` est appelée avec des données invalides
- **THEN** une erreur de validation Zod est retournée
- **THEN** aucun marché n'est créé dans la base de données
- **THEN** l'erreur contient les détails de validation

#### Scenario: Server Action handles database errors
- **WHEN** la création échoue pour une raison de base de données (ex: numero dupliqué)
- **THEN** une erreur appropriée est retournée
- **THEN** le code d'erreur Prisma est géré (P2002 pour contrainte unique)
- **THEN** un message d'erreur user-friendly est fourni

### Requirement: System SHALL implement updateMarche Server Action

Le système doit fournir une Server Action pour mettre à jour un marché existant.

#### Scenario: Server Action updates marche successfully
- **WHEN** la fonction `updateMarche` est appelée avec un ID valide et des données valides
- **THEN** les données sont validées avec le schéma Zod
- **THEN** le marché est mis à jour dans la base de données
- **THEN** le cache Next.js est revalidé
- **THEN** le marché mis à jour est retourné

#### Scenario: Server Action rejects non-existent marche
- **WHEN** la fonction `updateMarche` est appelée avec un ID inexistant
- **THEN** une erreur "Marché introuvable" est retournée
- **THEN** aucune modification n'est effectuée

#### Scenario: Server Action validates partial updates
- **WHEN** seuls certains champs sont fournis pour la mise à jour
- **THEN** seuls les champs fournis sont validés et mis à jour
- **THEN** les autres champs restent inchangés

### Requirement: System SHALL implement deleteMarche Server Action

Le système doit fournir une Server Action pour supprimer un marché.

#### Scenario: Server Action deletes marche successfully
- **WHEN** la fonction `deleteMarche` est appelée avec un ID valide
- **THEN** le marché est supprimé de la base de données
- **THEN** le cache Next.js est revalidé pour `/marches`
- **THEN** une confirmation de suppression est retournée

#### Scenario: Server Action rejects deletion of non-existent marche
- **WHEN** la fonction `deleteMarche` est appelée avec un ID inexistant
- **THEN** une erreur appropriée est retournée
- **THEN** aucune modification n'est effectuée

### Requirement: System SHALL implement getMarcheById Server Action

Le système doit fournir une Server Action pour récupérer un marché par son ID.

#### Scenario: Server Action retrieves marche successfully
- **WHEN** la fonction `getMarcheById` est appelée avec un ID valide
- **THEN** le marché correspondant est retourné
- **THEN** toutes les données du marché sont complètes

#### Scenario: Server Action returns null for non-existent ID
- **WHEN** la fonction `getMarcheById` est appelée avec un ID inexistant
- **THEN** `null` est retourné
- **THEN** aucune erreur n'est levée

### Requirement: System SHALL implement getAllMarches Server Action

Le système doit fournir une Server Action pour récupérer la liste de tous les marchés.

#### Scenario: Server Action retrieves all marches
- **WHEN** la fonction `getAllMarches` est appelée sans filtres
- **THEN** tous les marchés sont retournés
- **THEN** les marchés sont triés par date de création (plus récents en premier)

#### Scenario: Server Action supports filtering by status
- **WHEN** la fonction est appelée avec un filtre de statut
- **THEN** seuls les marchés avec ce statut sont retournés

#### Scenario: Server Action supports filtering by type
- **WHEN** la fonction est appelée avec un filtre de type
- **THEN** seuls les marchés de ce type sont retournés

#### Scenario: Server Action supports combined filters
- **WHEN** la fonction est appelée avec plusieurs filtres (statut ET type)
- **THEN** seuls les marchés correspondant à TOUS les filtres sont retournés

### Requirement: System SHALL implement error handling in all Server Actions

Toutes les Server Actions doivent gérer les erreurs de manière cohérente et sécurisée.

#### Scenario: Validation errors are properly formatted
- **WHEN** une erreur de validation Zod se produit
- **THEN** l'erreur retournée contient `{ success: false, error: string, details: ZodError }`
- **THEN** les détails de validation sont exploitables côté client

#### Scenario: Database errors are caught and formatted
- **WHEN** une erreur Prisma se produit
- **THEN** l'erreur est loggée côté serveur (console.error)
- **THEN** un message d'erreur générique est retourné au client (pas de détails internes)
- **THEN** les codes d'erreur Prisma spécifiques sont traduits (P2002 → "déjà existant")

#### Scenario: Unexpected errors are handled gracefully
- **WHEN** une erreur inattendue se produit
- **THEN** l'erreur est loggée côté serveur
- **THEN** un message générique "Erreur serveur" est retourné
- **THEN** l'application ne crash pas

### Requirement: System SHALL use 'use server' directive in all Server Actions

Toutes les Server Actions doivent être marquées explicitement comme code serveur.

#### Scenario: Server Actions file has directive
- **WHEN** le fichier `lib/actions/marches.ts` est examiné
- **THEN** la directive `'use server';` est présente en première ligne
- **THEN** toutes les fonctions exportées sont des Server Actions

### Requirement: System SHALL revalidate Next.js cache after mutations

Toutes les mutations (create, update, delete) doivent invalider le cache approprié.

#### Scenario: Cache is revalidated after create
- **WHEN** un marché est créé avec succès
- **THEN** `revalidatePath('/marches')` est appelé
- **THEN** la liste des marchés est rafraîchie automatiquement

#### Scenario: Cache is revalidated after update
- **WHEN** un marché est mis à jour avec succès
- **THEN** `revalidatePath('/marches')` est appelé
- **THEN** `revalidatePath(`/marches/${id}`)` est appelé
- **THEN** les vues liste et détail sont rafraîchies

#### Scenario: Cache is revalidated after delete
- **WHEN** un marché est supprimé avec succès
- **THEN** `revalidatePath('/marches')` est appelé
- **THEN** la liste des marchés ne contient plus le marché supprimé
