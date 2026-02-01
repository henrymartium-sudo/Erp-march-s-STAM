## 1. Préparation Base de Données

- [x] 1.1 Ajouter le modèle Caution au fichier prisma/schema.prisma avec tous les champs requis
- [x] 1.2 Ajouter les enums TypeCaution et StatutCaution au schéma Prisma
- [x] 1.3 Ajouter les index sur dateEcheance, statut, et marcheId
- [x] 1.4 Ajouter la directive @@map("cautions") au modèle Caution
- [x] 1.5 Ajouter la relation cautions: Caution[] au modèle Marche existant
- [x] 1.6 Créer la migration Prisma avec `prisma migrate dev --name add_caution_model`
- [x] 1.7 Vérifier que la migration a créé la table cautions et les enums correctement
- [x] 1.8 Régénérer le Prisma Client avec `prisma generate`
- [x] 1.9 Vérifier que les types TypeScript Caution, TypeCaution, StatutCaution sont disponibles depuis @prisma/client

## 2. Seed Data pour Tests

- [ ] 2.1 Étendre prisma/seed.ts pour créer des cautions de test
- [ ] 2.2 Créer 15-20 cautions réparties sur les marchés existants
- [ ] 2.3 Couvrir tous les types de cautions (PROVISOIRE, DEFINITIVE, AVANCE, RETENUE_GARANTIE)
- [ ] 2.4 Couvrir tous les statuts (majoritairement ACTIVE, quelques EXPIREE, LIBEREE, APPELEE)
- [ ] 2.5 Générer des dates variées (échéances passées, < 30j, < 15j, < 7j, futures)
- [ ] 2.6 Associer chaque caution à un utilisateur existant via userId
- [ ] 2.7 Exécuter le seed avec `npm run db:seed` et vérifier les données créées

## 3. Validation Zod

- [ ] 3.1 Créer le fichier lib/validations/caution.ts
- [ ] 3.2 Définir cautionBaseSchema avec validation de tous les champs requis
- [ ] 3.3 Ajouter la validation de référence unique (min 1 caractère)
- [ ] 3.4 Ajouter la validation de type enum (TypeCaution)
- [ ] 3.5 Ajouter la validation de montant (positif, > 0)
- [ ] 3.6 Ajouter la validation de dates (dateEmission et dateEcheance)
- [ ] 3.7 Ajouter la validation de banqueNom (min 1 caractère)
- [ ] 3.8 Ajouter la validation de marcheId (format cuid)
- [ ] 3.9 Ajouter la validation refine pour dateEcheance > dateEmission
- [ ] 3.10 Exporter createCautionSchema basé sur cautionBaseSchema
- [ ] 3.11 Exporter updateCautionSchema avec champ id ajouté

## 4. Utilitaires de Calcul

- [ ] 4.1 Créer le fichier lib/utils/caution.ts
- [ ] 4.2 Implémenter getJoursRestants(dateEcheance: Date): number avec date-fns
- [ ] 4.3 Implémenter getAlertLevel(joursRestants: number) retournant 'info'|'warning'|'critical'|null
- [ ] 4.4 Implémenter isCautionExpiree(dateEcheance: Date): boolean
- [ ] 4.5 Implémenter formatMontant(montant: Decimal): string avec format euro
- [ ] 4.6 Implémenter formatDate(date: Date): string en français
- [ ] 4.7 Implémenter isTransitionAllowed(currentStatut, newStatut): boolean avec matrice de transitions
- [ ] 4.8 Implémenter getCautionWithComputedStatus() pour calcul automatique ACTIVE → EXPIREE

## 5. Server Actions CRUD

- [ ] 5.1 Créer le fichier lib/actions/cautions.ts avec directive 'use server'
- [ ] 5.2 Importer prisma, types Prisma, schémas Zod, et type ActionResult
- [ ] 5.3 Implémenter createCaution(data: unknown): Promise<ActionResult<Caution>>
- [ ] 5.4 Valider les données avec createCautionSchema.parse() dans createCaution
- [ ] 5.5 Créer la caution avec prisma.caution.create() avec statut défaut ACTIVE
- [ ] 5.6 Gérer les erreurs Zod et Prisma (P2002 pour référence unique) dans createCaution
- [ ] 5.7 Revalider le cache avec revalidatePath('/cautions') après création
- [ ] 5.8 Implémenter getCautionById(id: string): Promise<Caution | null>
- [ ] 5.9 Utiliser prisma.caution.findUnique() avec include du marche dans getCautionById
- [ ] 5.10 Implémenter getAllCautions(options: GetCautionsOptions): Promise<Caution[]>
- [ ] 5.11 Ajouter filtres optionnels (statut, type, marcheId, limit, offset) dans getAllCautions
- [ ] 5.12 Trier les cautions par createdAt desc dans getAllCautions
- [ ] 5.13 Implémenter updateCaution(data: unknown): Promise<ActionResult<Caution>>
- [ ] 5.14 Valider avec updateCautionSchema et bloquer modification du champ reference dans updateCaution
- [ ] 5.15 Gérer les erreurs P2025 (caution non trouvée) dans updateCaution
- [ ] 5.16 Revalider /cautions et /cautions/[id] après modification
- [ ] 5.17 Implémenter deleteCaution(id: string): Promise<ActionResult>
- [ ] 5.18 Supprimer avec prisma.caution.delete() et gérer erreur P2025 dans deleteCaution
- [ ] 5.19 Revalider le cache après suppression

## 6. Server Actions Lifecycle & Alertes

- [ ] 6.1 Implémenter updateCautionStatut(id: string, newStatut: StatutCaution): Promise<ActionResult>
- [ ] 6.2 Vérifier la transition autorisée avec isTransitionAllowed() dans updateCautionStatut
- [ ] 6.3 Retourner erreur si transition non autorisée
- [ ] 6.4 Mettre à jour le statut et updatedAt si transition valide
- [ ] 6.5 Implémenter generateAlertsForCaution(cautionId: string): Promise<void>
- [ ] 6.6 Calculer les jours restants avant échéance dans generateAlertsForCaution
- [ ] 6.7 Créer alerte 30j si applicable et si n'existe pas déjà
- [ ] 6.8 Créer alerte 15j si applicable et si n'existe pas déjà
- [ ] 6.9 Créer alerte 7j si applicable et si n'existe pas déjà
- [ ] 6.10 Vérifier existence d'alerte avec prisma.alerte.findFirst() avant création
- [ ] 6.11 Utiliser prisma.alerte.create() pour stocker les alertes avec cautionId et marcheId
- [ ] 6.12 Implémenter getCautionsByMarche(marcheId: string): Promise<Caution[]>
- [ ] 6.13 Filtrer les cautions par marcheId et inclure les alertes dans getCautionsByMarche

## 7. Composants UI - Formulaire Caution

- [ ] 7.1 Créer le fichier components/cautions/caution-form.tsx avec 'use client'
- [ ] 7.2 Importer React Hook Form, Zod resolver, et createCautionSchema
- [ ] 7.3 Définir le type CautionFormProps avec mode ('create' | 'edit') et initialData optionnel
- [ ] 7.4 Initialiser useForm avec zodResolver et defaultValues
- [ ] 7.5 Créer le champ Référence avec Input et validation en temps réel
- [ ] 7.6 Créer le champ Type avec Select contenant les 4 types avec leurs libellés complets
- [ ] 7.7 Créer le champ Montant avec Input type number et formatage euro
- [ ] 7.8 Créer le champ Date d'émission avec DatePicker (shadcn/ui Calendar)
- [ ] 7.9 Créer le champ Date d'échéance avec DatePicker
- [ ] 7.10 Créer le champ Banque émettrice avec Input
- [ ] 7.11 Créer le champ Contact banque avec Input (optionnel)
- [ ] 7.12 Créer le champ Marché associé avec Combobox searchable affichant [Numéro] - [Objet]
- [ ] 7.13 Désactiver le champ Référence en mode edit (readonly)
- [ ] 7.14 Implémenter la fonction onSubmit appelant createCaution ou updateCaution
- [ ] 7.15 Afficher les erreurs de validation sous chaque champ avec FormMessage
- [ ] 7.16 Afficher un toast de succès après soumission réussie
- [ ] 7.17 Rediriger vers /cautions/[id] après création ou vers détail après modification
- [ ] 7.18 Ajouter boutons Créer/Enregistrer et Annuler avec gestion du loading state

## 8. Composants UI - Table et Liste

- [ ] 8.1 Créer le fichier components/cautions/caution-table.tsx avec 'use client'
- [ ] 8.2 Importer shadcn/ui Table components
- [ ] 8.3 Définir les colonnes: Référence, Type, Marché, Montant, Banque, Date échéance, Statut, Actions
- [ ] 8.4 Afficher badge coloré pour le Type (couleurs différentes par type)
- [ ] 8.5 Afficher badge coloré pour le Statut (vert ACTIVE, rouge EXPIREE, bleu LIBEREE, orange APPELEE)
- [ ] 8.6 Formater le Montant avec formatMontant() en euro
- [ ] 8.7 Formater la Date d'échéance avec formatDate() en français
- [ ] 8.8 Afficher indicateur visuel (icône) si échéance < 30 jours
- [ ] 8.9 Ajouter tri par colonne avec icônes ↑ ↓
- [ ] 8.10 Ajouter boutons d'actions (Voir, Modifier, Supprimer) dans colonne Actions
- [ ] 8.11 Implémenter dialog de confirmation pour suppression
- [ ] 8.12 Créer le fichier components/cautions/caution-card.tsx pour vue mobile
- [ ] 8.13 Afficher Référence, Type, Statut, Montant, Échéance dans card responsive
- [ ] 8.14 Ajouter bouton "Voir détails" dans chaque card
- [ ] 8.15 Utiliser Tailwind breakpoints pour basculer table ↔ cards (hidden md:block / block md:hidden)

## 9. Composants UI - Filtres

- [ ] 9.1 Créer le fichier components/cautions/caution-filters.tsx avec 'use client'
- [ ] 9.2 Créer Select pour filtre Statut avec options: Tous, ACTIVE, EXPIREE, LIBEREE, APPELEE
- [ ] 9.3 Créer Select pour filtre Type avec options: Tous + les 4 types
- [ ] 9.4 Créer Combobox searchable pour filtre par Marché
- [ ] 9.5 Créer Input search pour recherche par référence ou banque
- [ ] 9.6 Implémenter useRouter et useSearchParams pour gestion URL
- [ ] 9.7 Mettre à jour l'URL avec router.push() lors du changement de filtres
- [ ] 9.8 Afficher le nombre de résultats filtrés (ex: "23 cautions actives")
- [ ] 9.9 Ajouter bouton "Réinitialiser les filtres" qui supprime tous les searchParams
- [ ] 9.10 Afficher les filtres actifs comme badges cliquables pour suppression individuelle

## 10. Composants UI - Détail Caution

- [ ] 10.1 Créer le fichier components/cautions/caution-detail.tsx (Server Component)
- [ ] 10.2 Afficher en-tête avec Référence (titre), Statut (badge), Type (sous-titre)
- [ ] 10.3 Créer section "Informations générales" avec tous les champs de la caution
- [ ] 10.4 Créer section "Marché associé" avec lien vers /marches/[id]
- [ ] 10.5 Créer section "Validité" avec calcul jours restants et barre de progression
- [ ] 10.6 Utiliser getJoursRestants() pour calcul et affichage dynamique
- [ ] 10.7 Colorer la barre de progression (vert > 30j, orange 7-30j, rouge < 7j)
- [ ] 10.8 Afficher les alertes associées dans une section dédiée
- [ ] 10.9 Créer composant client pour boutons d'actions (Modifier, Marquer comme libérée, Supprimer)
- [ ] 10.10 Conditionner les boutons selon le statut (LIBEREE → pas de modification)
- [ ] 10.11 Implémenter dialog de confirmation pour changement de statut
- [ ] 10.12 Afficher avertissement si caution EXPIREE non libérée

## 11. Pages et Routes

- [ ] 11.1 Créer app/(dashboard)/cautions/page.tsx (Server Component)
- [ ] 11.2 Récupérer searchParams pour les filtres dans la page liste
- [ ] 11.3 Appeler getAllCautions(filters) avec les filtres depuis searchParams
- [ ] 11.4 Afficher CautionFilters et CautionTable/CautionCard avec les données
- [ ] 11.5 Ajouter bouton "Nouvelle caution" en haut de page avec Link vers /cautions/nouveau
- [ ] 11.6 Gérer l'affichage vide si aucune caution (message + bouton création)
- [ ] 11.7 Créer app/(dashboard)/cautions/nouveau/page.tsx (Server Component)
- [ ] 11.8 Récupérer la liste des marchés pour le combobox du formulaire
- [ ] 11.9 Afficher CautionForm en mode 'create'
- [ ] 11.10 Créer app/(dashboard)/cautions/[id]/page.tsx (Server Component)
- [ ] 11.11 Récupérer la caution avec getCautionById(params.id) incluant marche et alertes
- [ ] 11.12 Afficher CautionDetail avec les données complètes
- [ ] 11.13 Gérer le cas caution non trouvée (404 ou message d'erreur)
- [ ] 11.14 Créer app/(dashboard)/cautions/[id]/edit/page.tsx (Server Component)
- [ ] 11.15 Récupérer la caution pour pré-remplir le formulaire
- [ ] 11.16 Afficher CautionForm en mode 'edit' avec initialData

## 12. Intégration dans Module Marchés

- [ ] 12.1 Modifier app/(dashboard)/marches/[id]/page.tsx pour ajouter section cautions
- [ ] 12.2 Appeler getCautionsByMarche(marcheId) dans la page détail marché
- [ ] 12.3 Créer composant caution-marche-section.tsx pour affichage dans page marché
- [ ] 12.4 Afficher le nombre total de cautions pour le marché
- [ ] 12.5 Afficher la liste résumée des cautions (Référence, Type, Statut, Montant, Échéance)
- [ ] 12.6 Ajouter bouton "Ajouter une caution" qui ouvre modal ou redirige vers formulaire pré-rempli
- [ ] 12.7 Pré-remplir marcheId dans le formulaire si création depuis marché
- [ ] 12.8 Afficher statistiques: montant total cautions actives, nombre par statut
- [ ] 12.9 Afficher alerte si cautions expirent bientôt (< 30j)
- [ ] 12.10 Afficher message si aucune caution pour le marché

## 13. Navigation et Menu

- [ ] 13.1 Localiser le fichier de navigation du dashboard (ex: components/layout/nav.tsx ou app/(dashboard)/layout.tsx)
- [ ] 13.2 Ajouter item "Cautions" dans le menu principal avec icône Shield ou FileCheck
- [ ] 13.3 Positionner l'item après "Marchés" dans l'ordre du menu
- [ ] 13.4 Configurer href="/cautions" pour l'item
- [ ] 13.5 Implémenter highlight de l'item actif quand pathname = /cautions
- [ ] 13.6 Créer composant breadcrumb pour navigation (si pas déjà existant)
- [ ] 13.7 Afficher breadcrumb "Accueil > Cautions" sur /cautions
- [ ] 13.8 Afficher breadcrumb "Accueil > Cautions > Nouvelle caution" sur /cautions/nouveau
- [ ] 13.9 Afficher breadcrumb "Accueil > Cautions > [Référence]" sur /cautions/[id]
- [ ] 13.10 Rendre chaque niveau du breadcrumb cliquable

## 14. Responsive Design

- [ ] 14.1 Tester l'affichage desktop (1920x1080) - table complète visible
- [ ] 14.2 Tester l'affichage desktop - formulaire en 2 colonnes
- [ ] 14.3 Tester l'affichage desktop - sections détail côte à côte
- [ ] 14.4 Tester l'affichage tablette (768x1024) - table avec scroll horizontal si nécessaire
- [ ] 14.5 Tester l'affichage tablette - formulaire en 1 colonne
- [ ] 14.6 Tester l'affichage mobile (375x667) - basculement table → cards
- [ ] 14.7 Tester l'affichage mobile - formulaire empilé verticalement
- [ ] 14.8 Tester l'affichage mobile - boutons et actions tactiles (taille suffisante)
- [ ] 14.9 Vérifier que tous les breakpoints Tailwind sont correctement appliqués
- [ ] 14.10 Vérifier accessibilité navigation clavier sur tous appareils

## 15. Tests Playwright

- [ ] 15.1 Créer test de création de caution avec tous champs requis
- [ ] 15.2 Vérifier validation du formulaire (champs manquants, dates invalides, montant négatif)
- [ ] 15.3 Vérifier affichage message erreur si référence en doublon
- [ ] 15.4 Tester modification d'une caution existante
- [ ] 15.5 Vérifier que le champ référence est disabled en mode édition
- [ ] 15.6 Tester suppression de caution avec confirmation
- [ ] 15.7 Vérifier annulation de suppression (dialog fermée, caution toujours présente)
- [ ] 15.8 Tester filtrage par statut (ACTIVE, EXPIREE, LIBEREE, APPELEE)
- [ ] 15.9 Tester filtrage par type de caution
- [ ] 15.10 Tester filtrage par marché
- [ ] 15.11 Tester recherche par référence ou banque
- [ ] 15.12 Tester réinitialisation des filtres
- [ ] 15.13 Tester tri des colonnes (croissant/décroissant)
- [ ] 15.14 Tester changement de statut manuel (ACTIVE → LIBEREE)
- [ ] 15.15 Vérifier que transition non autorisée affiche erreur
- [ ] 15.16 Tester affichage des cautions depuis page détail marché
- [ ] 15.17 Tester création rapide de caution depuis marché (marcheId pré-rempli)
- [ ] 15.18 Tester navigation breadcrumb (tous les niveaux cliquables)
- [ ] 15.19 Vérifier responsive desktop (1920x1080)
- [ ] 15.20 Vérifier responsive tablette (768x1024)
- [ ] 15.21 Vérifier responsive mobile (375x667)
- [ ] 15.22 Vérifier affichage badges de statut avec bonnes couleurs
- [ ] 15.23 Vérifier calcul et affichage jours restants
- [ ] 15.24 Vérifier barre de progression validité avec bonnes couleurs selon seuil

## 16. Finalisation et Documentation

- [ ] 16.1 Vérifier que tous les Server Actions ont la gestion d'erreurs complète
- [ ] 16.2 Vérifier que tous les formulaires ont les messages d'erreur clairs
- [ ] 16.3 Vérifier que toutes les dates sont formatées en français
- [ ] 16.4 Vérifier que tous les montants sont formatés en euro
- [ ] 16.5 Vérifier que les revalidatePath sont présents après chaque mutation
- [ ] 16.6 Vérifier que les index Prisma sont bien créés en base (dateEcheance, statut, marcheId)
- [ ] 16.7 Exécuter `npm run build` et corriger les erreurs TypeScript
- [ ] 16.8 Vérifier qu'aucun console.log ou code de debug ne reste dans le code
- [ ] 16.9 Vérifier la conformité avec CLAUDE.md (pas d'émojis, specs en français)
- [ ] 16.10 Commit sur branche feat/module-cautions avec message descriptif
- [ ] 16.11 Créer pull request vers main avec description complète
- [ ] 16.12 Mettre à jour DEVELOPPEMENT.md si nécessaire avec nouvelles commandes
