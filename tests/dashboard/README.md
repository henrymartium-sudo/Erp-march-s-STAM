# Tests E2E - Page d'accueil (tableau de bord)

Tests Playwright de la page `/` (livraison 7) : « À traiter », cinq voyants, pipeline des offres.

| Fichier | Contenu |
|---|---|
| `tableau-de-bord.spec.ts` | Par rôle (ADMIN, VISITEUR, EXPLOITATION, hors connexion) : blocs, montants, filtre `?vue=`, repli « Ce mois-ci » au clavier, cohérence du pipeline avec la liste ouverte au clic. Données `[E2E-TDB]` amorcées puis supprimées. |
| `auth.spec.ts` | Redirection vers `/login` ; les quatre rôles voient la page |
| `permissions.spec.ts` | Boutons de création selon le rôle |
| `responsive.spec.ts` | 1920×1080, 768×1024, 375×667 : aucun débordement horizontal, cibles tactiles ≥ 44 px |

## Lancer

Toujours sur la base de test locale (127.0.0.1:5433), jamais sur la production : passer par le skill `base-test`
(`pwsh -File C:\Users\HP\pg17-portable\tests-pg17.ps1 -Specs tests/dashboard/tableau-de-bord.spec.ts`).
Ne jamais lancer `playwright test` sans `.env.test` chargé : `.env` et `.env.local` visent la production.

## Remarques

- Les dates des données de test sont relatives à l'instant du test, au jour UTC.
- Le taux de succès affiché à `/` (fenêtre fixe de 6 mois) et celui de `/pilotage` (période choisie) partagent la même fonction, `calculerIssueOffres` (`lib/pilotage/calculs`) : pas de comparaison E2E, le calcul n'est pas dupliqué.
