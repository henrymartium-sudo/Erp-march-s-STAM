# Guide de Développement - ERP Marchés Publics

## Aperçu de l'objectif du projet

Application dédiée à la **gestion complète du cycle de vie des marchés publics**, côté **soumissionnaire**, spécialisée dans la fourniture de **véhicules neufs** et les **contrats de maintenance et d'entretien**.

L'application vise à :
- Centraliser l'information
- Réduire les erreurs et oublis
- Accélérer la réponse aux appels d'offres
- Sécuriser l'exécution des marchés
- Fournir des outils d'aide à la décision à moyen et long terme

> **Un système de maîtrise du risque contractuel, opérationnel et documentaire pour un soumissionnaire automobile.**

## Aperçu de l'architecture globale

Architecture **Next.js 15 full-stack** moderne :

- **Frontend** : React 19 + shadcn/ui + Radix UI + Tailwind CSS
- **Backend** : Next.js App Router + Server Actions + API Routes
- **Base de données** : PostgreSQL via Prisma ORM
- **Stockage fichiers** : Supabase Storage
- **Authentification** : NextAuth.js v5
- **Alertes** : Vercel Cron + Nodemailer
- **Rapports** : @react-pdf/renderer + ExcelJS

### Flux de données principal

1. **Lecture de données** : Client → RSC → Prisma → PostgreSQL
2. **Mutations** : Client → Server Actions → Prisma → PostgreSQL
3. **Upload fichiers** : Client → Server Action → Supabase Storage → Métadonnées → PostgreSQL
4. **Génération rapports** : Client → Server Action → @react-pdf/renderer → PDF/Excel
5. **Alertes** : Vercel Cron → Server Action → Prisma → Nodemailer → Email

## Style visuel

- Interface claire et minimaliste
- **Pas de mode sombre pour le MVP**
- Design system basé sur shadcn/ui
- Palette de couleurs cohérente
- Responsive design pour tous les écrans

## Contraintes et Politiques

### Sécurité

- **NE JAMAIS exposer les clés API au client**
- Toutes les clés sensibles doivent rester côté serveur
- Utiliser les variables d'environnement appropriées (`NEXT_PUBLIC_*` uniquement pour les données publiques)
- Valider toutes les entrées utilisateur avec Zod côté serveur

### Permissions

- Vérifier les rôles utilisateur dans chaque Server Action
- Utiliser le middleware Next.js pour protéger les routes
- Niveaux de rôles : ADMIN, AVANCE, EXPLOITATION, VISITEUR

## Dépendances

- **Préférer les composants existants plutôt que d'ajouter de nouvelles bibliothèques UI**
- Utiliser shadcn/ui pour tous les composants d'interface
- Éviter la duplication de fonctionnalités déjà présentes dans la stack
- Valider l'ajout de nouvelles dépendances selon leur nécessité réelle

## Tests et Validation

### À la fin de chaque développement qui implique l'interface graphique

- **Tester avec playwright-skill**
- Vérifier que l'interface est **responsive**
- Vérifier que l'interface est **fonctionnelle**
- Vérifier que l'interface **répond au besoin développé**

### Critères de validation

- Fonctionnalité sur desktop (1920x1080)
- Fonctionnalité sur tablette (768x1024)
- Fonctionnalité sur mobile (375x667)
- Navigation au clavier accessible
- Messages d'erreur clairs et utiles

## Documentation

### Références principales

- **[PRD.md](./PRD.md)** - Product Requirements Document
  - Objectifs métier
  - Périmètre fonctionnel
  - Roadmap produit
  - Règles de développement

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture Technique
  - Stack technique détaillée
  - Schéma de base de données
  - Structure du projet
  - Patterns et conventions
  - Guide de déploiement

## Context7

**Utilisation systématique obligatoire** : Toujours utiliser Context7 lorsque nécessaire pour :
- La génération de code
- Les étapes de configuration ou d'installation
- La documentation de bibliothèque/API

Cela signifie que je dois **automatiquement** :
1. Utiliser l'outil MCP Context7 `resolve-library-id` pour résoudre l'identifiant de bibliothèque
2. Utiliser l'outil MCP Context7 `query-docs` pour obtenir la documentation de bibliothèque à jour

**Sans que tu aies à le demander explicitement.**

Cette règle garantit :
- L'utilisation de documentation à jour
- Des exemples de code conformes aux dernières versions
- Des configurations et installations correctes
- Une cohérence dans l'implémentation des bibliothèques tierces

## Note importante sur les spécifications

**Toutes les spécifications doivent être rédigées en français**, y compris les specs OpenSpec (sections Purpose et Scenarios).

**Seuls les titres de Requirements doivent rester en anglais** avec les mots-clés SHALL/MUST pour la validation OpenSpec.

### Exemple de structure OpenSpec valide

```yaml
Purpose: |
  Créer un formulaire de gestion des marchés publics permettant...

Requirements:
  - id: REQ-001
    title: User SHALL be able to create a new marché
    description: |
      L'utilisateur doit pouvoir créer un nouveau marché avec tous les champs requis...
```

## Disciplines actives — instanciation projet

Les 5 contrôles du skill global `disciplines-actives` (`~/.claude/skills/disciplines-actives/`) s'appliquent avant **chaque action structurelle**, pas seulement au démarrage d'une session. Déclenchement automatique par hooks depuis le 21/07/2026 ; chaque application produit un bloc de preuve de 5 lignes dans la réponse.

- **17.1 Finalité** : outil de production STAM dont la raison d'être est le succès aux appels d'offres. Une action est légitime si elle sert un utilisateur réel **et/ou** améliore les chances d'une soumission. **La fiabilité des données n'est pas négociable** — une fonctionnalité sans utilisateur identifié est une dette, pas une amélioration.

- **17.2 Trace** : (a) commit git sur `main` · (b) Journal de décisions (vault Obsidian local, hors dépôt) · (c) `docs/plans/` ou `memory/checkpoint-*.md` selon la nature ; `PRD.md` / `ARCHITECTURE.md` si la décision change le périmètre ou l'architecture · (d) validation Abel dans le fil — **aucun issue tracker n'est utilisé sur ce projet** (vérifié le 21/07/2026), ne pas en supposer un.

- **17.3 Verdicts antérieurs** : Journal de décisions Obsidian **et** claude-mem (deux dépôts distincts, interroger les deux) · `docs/audit/` · `openspec/` pour les specs déjà tranchées.

- **17.4 Irréversible sur ce projet** — les quatre, par ordre de gravité :
  1. **Emails automatiques** (Vercel Cron → Nodemailer) — partent vers de vrais destinataires. Un email envoyé ne se rappelle pas. Ne jamais déclencher une règle d'envoi pour « tester » sur des données de production.
  2. **Ce dépôt est public** — tout secret, identifiant ou donnée client poussé est diffusé immédiatement, et un correctif ultérieur ne purge ni les caches distants ni les forks. Avant tout push : vérifier qu'aucune valeur réelle n'est en dur (y compris hors fichiers `.env`, qu'aucun `.gitignore` ne couvre), et qu'aucun chemin local ni information d'infrastructure n'est ajouté.
  3. **Base PostgreSQL de production** — les données réelles (marchés, cautions, pièces d'offre) ne se reconstituent pas. Vérifier l'existence d'une sauvegarde **avant** toute migration Prisma, jamais après.
  4. **Déploiement production** (`vercel --prod`) — techniquement rollback-able, mais ce que les utilisateurs ont vu ou saisi entre-temps ne l'est pas.

- **Lecture fraîche** : état réel de la base (pas le schéma supposé), branche et working tree courants, dernier déploiement Vercel, `git ls-files` avant toute affirmation sur ce qui est versionné.

---

**Dernière mise à jour** : 2026-07-21 (ajout de l'instanciation disciplines-actives)
