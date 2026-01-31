## 1. Project Initialization

- [x] 1.1 Initialiser Next.js 15 avec TypeScript et App Router (`npx create-next-app@latest`)
- [x] 1.2 Installer les dépendances core (Prisma, Zod, React Hook Form, date-fns)
- [x] 1.3 Initialiser shadcn/ui (`npx shadcn-ui@latest init`)
- [x] 1.4 Installer les composants shadcn/ui nécessaires (button, input, select, form, table, card, dialog, badge, calendar)
- [x] 1.5 Créer la structure de dossiers (`/app`, `/components`, `/lib`, `/prisma`, `/types`)
- [x] 1.6 Configurer les alias TypeScript (`@/*` dans tsconfig.json)

## 2. Configuration Files

- [x] 2.1 Créer le fichier `.env.example` avec toutes les variables documentées
- [x] 2.2 Créer le fichier `.env` local avec DATABASE_URL
- [x] 2.3 Configurer `next.config.js` si nécessaire
- [x] 2.4 Vérifier que `.gitignore` inclut `.env`, `node_modules`, `.next`
- [x] 2.5 Configurer Tailwind CSS avec les variables de shadcn/ui

## 3. Database Schema & Setup

- [x] 3.1 Initialiser Prisma (`npx prisma init`)
- [x] 3.2 Créer le schéma Prisma avec les enums TypeMarche et StatutMarche (11 statuts)
- [x] 3.3 Créer le modèle Marche avec tous les champs requis (numero, objet, type, montant, dates, fournisseur, statut)
- [x] 3.4 Ajouter les indexes sur numero, statut, et dateFinPrevue
- [x] 3.5 Créer la migration initiale (`npx prisma migrate dev --name init_marche_schema`)
- [x] 3.6 Générer le client Prisma (`npx prisma generate`)
- [x] 3.7 Créer le singleton Prisma client dans `lib/db/prisma.ts`
- [x] 3.8 Créer le script seed dans `prisma/seed.ts` avec 10-15 marchés couvrant tous les statuts
- [x] 3.9 Configurer `package.json` pour le seed script
- [x] 3.10 Exécuter le seed (`npx prisma db seed`)

## 4. Types & Validation

- [x] 4.1 Créer le fichier `types/index.ts` pour les types globaux
- [x] 4.2 Créer le schéma Zod `marcheSchema` dans `lib/validations/marche.ts`
- [x] 4.3 Valider tous les champs requis (numero, objet, type, montant, dateNotification, delaiExecution, fournisseurNom)
- [x] 4.4 Valider les champs optionnels (dateOrdreService, dateReception, contacts fournisseur)
- [x] 4.5 Exporter le type `MarcheInput` inféré depuis le schéma Zod

## 5. Server Actions (Backend Logic)

- [x] 5.1 Créer le fichier `lib/actions/marches.ts` avec directive `'use server'`
- [x] 5.2 Implémenter `createMarche()` avec validation Zod, création Prisma, et revalidatePath
- [x] 5.3 Implémenter `updateMarche()` avec validation, update Prisma, et revalidatePath
- [x] 5.4 Implémenter `deleteMarche()` avec suppression Prisma et revalidatePath
- [x] 5.5 Implémenter `getMarcheById()` pour récupérer un marché par ID
- [x] 5.6 Implémenter `getAllMarches()` avec support des filtres (statut, type)
- [x] 5.7 Ajouter la gestion d'erreurs dans toutes les Server Actions (Zod errors, Prisma errors, unexpected errors)
- [x] 5.8 Tester toutes les Server Actions avec des données valides et invalides

## 6. Utility Functions

- [x] 6.1 Créer `lib/utils/statut.ts` avec le mapping STATUT_LABELS (enum → labels français)
- [x] 6.2 Créer le mapping STATUT_COLORS (enum → couleurs Tailwind pour badges)
- [x] 6.3 Créer `lib/utils/format.ts` avec fonction de formatage de montant (séparateur milliers + "DH")
- [x] 6.4 Créer fonction de formatage de dates en français avec date-fns

## 7. UI Components - Statut Badge

- [x] 7.1 Créer `components/marches/statut-badge.tsx` (Server Component)
- [x] 7.2 Utiliser le composant Badge de shadcn/ui
- [x] 7.3 Appliquer les couleurs selon STATUT_COLORS
- [x] 7.4 Afficher le label français selon STATUT_LABELS
- [x] 7.5 Tester l'affichage de tous les 11 statuts

## 8. UI Components - Marche Form

- [x] 8.1 Créer `components/marches/marche-form.tsx` (Client Component avec `'use client'`)
- [x] 8.2 Intégrer React Hook Form avec zodResolver
- [x] 8.3 Ajouter tous les champs requis (numero, objet, type select, montant, dateNotification, delaiExecution, fournisseurNom)
- [x] 8.4 Ajouter les champs optionnels (dateOrdreService, dateReception, contacts fournisseur)
- [x] 8.5 Ajouter le champ select de statut avec les 11 options
- [x] 8.6 Implémenter la validation en temps réel (onBlur)
- [x] 8.7 Afficher les erreurs de validation sous chaque champ
- [x] 8.8 Implémenter l'état de chargement (loading state) pendant la soumission
- [x] 8.9 Gérer la soumission (appel Server Action) avec useTransition
- [x] 8.10 Afficher les messages de succès/erreur après soumission

## 9. UI Components - Marche Card

- [x] 9.1 Créer `components/marches/marche-card.tsx` (Server Component)
- [x] 9.2 Utiliser le composant Card de shadcn/ui
- [x] 9.3 Afficher numero, objet (tronqué si long), type, montant formaté, StatutBadge
- [x] 9.4 Ajouter les boutons d'action (Voir détails, Modifier, Supprimer)
- [x] 9.5 Rendre la card cliquable pour naviguer vers la page détail

## 10. UI Components - Marche List

- [x] 10.1 Créer `components/marches/marche-list.tsx` (Server Component)
- [x] 10.2 Afficher une grille de MarcheCard (responsive : 3 cols desktop, 2 tablette, 1 mobile)
- [x] 10.3 Gérer l'état vide (aucun marché trouvé) avec message et bouton "Créer un marché"
- [x] 10.4 Trier les marchés par date de création (plus récents en premier)

## 11. UI Components - Marche Detail

- [x] 11.1 Créer `components/marches/marche-detail.tsx` (Server Component)
- [x] 11.2 Afficher toutes les informations du marché (tous les champs)
- [x] 11.3 Formater les dates en français avec date-fns
- [x] 11.4 Formater le montant avec séparateurs
- [x] 11.5 Afficher le StatutBadge en grand
- [x] 11.6 Ajouter les boutons d'action (Modifier, Supprimer, Retour)

## 12. UI Components - Filters

- [x] 12.1 Créer `components/marches/marche-filters.tsx` (Client Component)
- [x] 12.2 Ajouter un select pour filtrer par statut (avec option "Tous les statuts")
- [x] 12.3 Ajouter un select pour filtrer par type (avec option "Tous les types")
- [x] 12.4 Implémenter la logique de filtrage (useState + useEffect ou URL search params)
- [x] 12.5 Afficher le nombre de résultats filtrés
- [x] 12.6 Ajouter un bouton "Réinitialiser les filtres"

## 13. UI Components - Delete Dialog

- [x] 13.1 Créer `components/marches/delete-marche-dialog.tsx` (Client Component)
- [x] 13.2 Utiliser le composant Dialog de shadcn/ui
- [x] 13.3 Afficher le message de confirmation avec numero et objet du marché
- [x] 13.4 Ajouter les boutons Confirmer et Annuler
- [x] 13.5 Appeler la Server Action deleteMarche() lors de la confirmation
- [x] 13.6 Gérer la fermeture du dialog et la redirection après suppression

## 14. Pages - Layout

- [x] 14.1 Créer `app/layout.tsx` (root layout) avec configuration globale
- [x] 14.2 Importer `globals.css` avec les directives Tailwind
- [x] 14.3 Créer `app/(dashboard)/layout.tsx` (layout temporaire sans auth pour MVP)
- [x] 14.4 Ajouter une navigation basique (navbar ou sidebar) avec lien vers "Marchés"
- [x] 14.5 Rendre le layout responsive

## 15. Pages - Marches List

- [x] 15.1 Créer `app/(dashboard)/marches/page.tsx` (Server Component)
- [x] 15.2 Fetcher tous les marchés avec getAllMarches()
- [x] 15.3 Afficher le composant MarcheFilters
- [x] 15.4 Afficher le composant MarcheList avec les marchés
- [x] 15.5 Ajouter un bouton "Nouveau marché" en haut de page
- [x] 15.6 Gérer les filtres via URL search params si implémenté

## 16. Pages - Marche Creation

- [x] 16.1 Créer `app/(dashboard)/marches/nouveau/page.tsx` (Server Component wrapper)
- [x] 16.2 Afficher le titre "Créer un marché"
- [x] 16.3 Afficher le composant MarcheForm sans données (mode création)
- [x] 16.4 Gérer la redirection vers `/marches` après création réussie
- [x] 16.5 Afficher un message de succès (toast ou notification)

## 17. Pages - Marche Detail

- [x] 17.1 Créer `app/(dashboard)/marches/[id]/page.tsx` (Server Component)
- [x] 17.2 Fetcher le marché par ID avec getMarcheById()
- [x] 17.3 Gérer le cas où le marché n'existe pas (afficher message + bouton retour)
- [x] 17.4 Afficher le composant MarcheDetail avec les données
- [x] 17.5 Intégrer le DeleteMarcheDialog

## 18. Pages - Marche Edit

- [x] 18.1 Créer `app/(dashboard)/marches/[id]/edit/page.tsx` (Server Component wrapper)
- [x] 18.2 Fetcher le marché par ID avec getMarcheById()
- [x] 18.3 Afficher le titre "Modifier le marché [numero]"
- [x] 18.4 Afficher le composant MarcheForm pré-rempli (mode édition)
- [x] 18.5 Gérer la redirection vers `/marches/[id]` après modification réussie
- [x] 18.6 Afficher un message de succès

## 19. Responsive Design & Testing

- [x] 19.1 Tester la liste des marchés sur desktop (1920x1080) - grille 3 colonnes
- [x] 19.2 Tester la liste des marchés sur tablette (768x1024) - grille 2 colonnes
- [x] 19.3 Tester la liste des marchés sur mobile (375x667) - grille 1 colonne
- [x] 19.4 Tester le formulaire de création sur desktop, tablette, mobile
- [x] 19.5 Tester la page détail sur desktop, tablette, mobile
- [x] 19.6 Vérifier que tous les boutons sont touch-friendly sur mobile
- [x] 19.7 Vérifier la navigation au clavier (accessibilité)

## 20. Functional Testing avec Playwright

- [x] 20.1 Tester la création d'un marché (remplir formulaire, soumettre, vérifier succès)
- [x] 20.2 Tester la validation du formulaire (champs requis, formats invalides)
- [x] 20.3 Tester la modification d'un marché existant
- [x] 20.4 Tester la suppression d'un marché (avec confirmation)
- [x] 20.5 Tester l'affichage de la liste (tous les marchés visibles)
- [x] 20.6 Tester l'affichage du détail d'un marché
- [x] 20.7 Tester les filtres (statut, type, combinés)
- [x] 20.8 Tester l'affichage correct de tous les badges de statut (11 statuts)
- [x] 20.9 Tester le formatage des montants et des dates
- [x] 20.10 Tester la gestion des erreurs (marché inexistant, erreurs serveur)

## 21. Final Checks & Documentation

- [x] 21.1 Vérifier que toutes les clés API/secrets restent côté serveur
- [x] 21.2 Vérifier qu'aucun console.log n'est présent dans le code de production
- [x] 21.3 Vérifier que le fichier `.env` est bien dans `.gitignore`
- [x] 21.4 Exécuter `npm run build` pour vérifier qu'il n'y a pas d'erreurs TypeScript
- [x] 21.5 Tester l'application en mode production localement (`npm run build && npm start`)
- [x] 21.6 Documenter les variables d'environnement nécessaires dans `.env.example`
- [x] 21.7 Vérifier que le seed script fonctionne correctement
