# ERP Marchés STAM - État du Projet

**Dernière mise à jour**: 2026-02-14 16:35
**Version**: MVP 99%
**Production**: ✅ DEPLOYED
**URL**: https://erp-marches-stam.vercel.app

---

## Vue d'Ensemble Rapide

### ✅ Modules Complétés (100%)
- **Marchés** - Backend + Frontend + Pagination + Recherche + Export Excel
- **Cautions** - Backend + Frontend + Pagination + Recherche + Export Excel
- **Documents** - Backend + Frontend + Pagination + Recherche + Export Excel
- **Véhicules** - Backend + Frontend + Pagination + Recherche + Export Excel
- **Auth & Permissions** - NextAuth v5 + RBAC (4 rôles)
- **Alertes Email** - Vercel Cron + Nodemailer + UI Admin
- **Dashboard Enrichi** - Phases 1-3 (Status Charts + Montants Chart) avec Recharts

### 🚧 En Cours / Optionnel
- Dashboard Phases 4-6 (optionnel selon feedback utilisateurs)
- Tests E2E Playwright (planifié Sprint 4)

### ⏳ À Venir
- Exports Excel avancés (Sprint 3)
- Alertes Niveau 2 (Sprint 3)
- Tests utilisateurs finaux
- Documentation utilisateur

---

## Données Production

### Entités Réelles (Migrées depuis Excel 2026-02-14)
- **50 marchés** réels
  - 18 clôturés
  - 11 infructueux
  - 10 en exécution
  - 5 annulés
  - 6 autres statuts
- **7 cautions** réelles
  - Types variés (soumission, bonne exécution, restitution avance)
- **Montant total**: ~245M XOF
- **Utilisateur migration**: `cm74buvfo0000n41dh23wjh6d`

### Utilisateurs Test Production
Voir `GUIDE_TEST_UTILISATEURS.md` pour credentials complètes:
- ADMIN: admin@stam.com
- AVANCE: avance@stam.com
- EXPLOITATION: exploitation@stam.com
- VISITEUR: visiteur@stam.com

---

## Architecture Technique

### Stack
- **Frontend**: React 19 + Next.js 15.1.6 + shadcn/ui + Tailwind CSS + Recharts 2.15.0
- **Backend**: Next.js App Router + Server Actions
- **Database**: PostgreSQL + Prisma 7.3.0
- **Storage**: Supabase Storage
- **Auth**: NextAuth.js v5
- **Email**: Vercel Cron + Nodemailer
- **Deployment**: Vercel (Washington, D.C. - iad1)

### Performance Actuelle
- **Build Time**: 67 seconds
- **First Load JS**: 224 kB
- **Dashboard JS**: +8 kB (Recharts optimisé)
- **TypeScript**: ✅ No errors
- **Deployment**: Automatique depuis `main` branch

---

## Git & Branches

### Branche Actuelle
- **main** (production)

### Derniers Commits
```
4ee7624 - feat(dashboard): Implémenter Phase 3 - Widget Montants Mensuels
4779764 - feat(dashboard): Implémenter Phases 1+2 - Setup + Status Charts
3ba4ce8 - docs(session): Documenter Sprint 1 P4 - Pagination complète
f90ded4 - docs(memory): Mettre à jour statut pagination à 100%
17b5562 - feat(pagination): Implémenter pagination Documents + Véhicules
```

### Stratégie Merge
- **Préférée**: Fast-forward merge (historique linéaire)
- **Alternative**: Squash merge pour features multi-commits
- **Éviter**: Merge commits sauf si nécessaire

---

## Documentation Projet

### Documents Essentiels (À Lire en Premier)
1. **CLAUDE.md** - Guide développement + contraintes + règles
2. **PRD.md** - Product Requirements Document
3. **ARCHITECTURE.md** - Architecture technique détaillée
4. **GUIDE_TEST_UTILISATEURS.md** - Credentials + checklist validation

### Logs de Session
- **SESSION.md** - Journal Sprint 1 complet (tous modules)
- **SESSION_DASHBOARD_2026-02-14.md** - Implémentation dashboard détaillée

### Snapshots de Continuité
- **SESSION_SNAPSHOT_2026-02-14.md** - Migration Excel + Planning Dashboard
- **SESSION_SNAPSHOT_DEPLOYMENT_2026-02-14.md** - Déploiement Dashboard (CE FICHIER EST LE PLUS RÉCENT)

### Plans d'Implémentation
- **PLAN_DASHBOARD_ENRICHI.md** - Dashboard 6 phases (8h30 estimé)

### Mémoire Agent
- **`.claude/agent-memory/context-continuity-manager/MEMORY.md`** - Patterns et leçons apprises
- **`.claude/agent-memory/context-continuity-manager/snapshots-index.md`** - Index snapshots

---

## Fichiers Clés par Module

### Dashboard Enrichi (Récent)
```
app/(dashboard)/page.tsx                 - Dashboard principal (RSC)
components/dashboard/
  ├── status-charts.tsx                  - Widgets Pie Charts (164 lignes)
  └── montants-chart.tsx                 - Widget Bar Chart (158 lignes)
components/ui/chart.tsx                  - Composants Recharts shadcn/ui
lib/dashboard/
  ├── stats.ts                           - Backend stats (Prisma aggregations)
  └── types.ts                           - TypeScript interfaces
```

### Auth & Permissions
```
lib/auth/
  ├── auth.config.ts                     - NextAuth configuration
  └── providers.ts                       - Credentials provider
lib/utils/permissions.ts                 - RBAC helpers
middleware.ts                            - Edge middleware (cookie check)
```

### Modules Métier
```
lib/actions/
  ├── marches.ts                         - Server Actions marchés
  ├── cautions.ts                        - Server Actions cautions
  ├── documents.ts                       - Server Actions documents
  └── vehicules.ts                       - Server Actions véhicules
lib/utils/
  ├── search.ts                          - Recherche textuelle
  └── pagination.ts                      - Utilitaires pagination
```

---

## Environnement & Déploiement

### Variables Environnement Requises
```
# Database
DATABASE_URL

# NextAuth
NEXTAUTH_URL
NEXTAUTH_SECRET

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Email (Gmail SMTP)
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
SMTP_FROM
ALERT_EMAIL_TO
```

### Commandes Utiles

#### Développement Local
```bash
npm run dev              # Start dev server
npm run build            # Build production
npm run start            # Start production locally
npx prisma studio        # Database GUI
npx prisma db push       # Push schema changes
```

#### Déploiement Vercel
```bash
vercel --prod            # Deploy to production (remote build)
vercel env ls            # List environment variables
vercel logs              # View deployment logs
```

#### Git Workflow
```bash
git checkout -b feature/nom-feature    # Nouvelle feature
# ... développement ...
git checkout main
git merge feature/nom-feature          # Fast-forward merge
git push origin main                   # Trigger Vercel deploy
```

---

## Prochaines Étapes Recommandées

### Priorité HAUTE (Validation Production)
1. **Tests utilisateurs dashboard** (2h)
   - Tester avec 4 rôles différents
   - Vérifier graphiques sur données réelles
   - Collecter feedback métier
   - Valider responsive design

2. **Monitoring production** (1h)
   - Vercel Analytics
   - Logs erreurs
   - Performance dashboard
   - Validation modules existants

### Priorité MOYENNE (Améliorations)
3. **Dashboard Phases 4-6** (4h30 - optionnel)
   - Widget Cautions à Libérer (Table)
   - Widget Performance Soumissions (Line Chart)
   - Widget Documents Expirants (Alert Cards)
   - **Décision selon feedback utilisateurs**

4. **Tests E2E Playwright** (2h)
   - Navigation dashboard
   - Interactions graphiques
   - Accessibilité
   - Messages erreur

### Priorité BASSE (Documentation)
5. **Documentation utilisateur** (1h)
6. **Mise à jour roadmap** (30min)

---

## Contacts & Ressources

### Production
- **Application**: https://erp-marches-stam.vercel.app
- **Vercel Project**: prj_CMfXkhrGaZVN6xbyJGRl0qdEf8Aw
- **Vercel Team**: team_38g8LtNCRD8PCg4PTFPeKrDS

### Support
- **GitHub**: Repository principal (synced avec Vercel)
- **Documentation**: Fichiers CLAUDE.md, PRD.md, ARCHITECTURE.md
- **Snapshots**: `.claude/agent-memory/context-continuity-manager/`

---

## Reprise Rapide

### Si Nouvelle Session de Développement
1. Lire `SESSION_SNAPSHOT_DEPLOYMENT_2026-02-14.md` (état le plus récent)
2. Vérifier `git status` et `git log --oneline -5`
3. Tester dashboard en production: https://erp-marches-stam.vercel.app
4. Consulter "NEXT STEPS" dans le snapshot
5. Décider selon feedback utilisateurs

### Si Problème en Production
1. Vérifier Vercel logs: `vercel logs`
2. Vérifier Vercel Analytics: dashboard Vercel
3. Tester avec credentials test (GUIDE_TEST_UTILISATEURS.md)
4. Si besoin rollback: voir "RESUMPTION CHECKLIST" dans snapshot

### Si Nouvelle Feature
1. Consulter PLAN_*.md existants ou créer nouveau plan
2. Créer branche feature depuis main
3. Suivre patterns dans MEMORY.md
4. Documenter dans SESSION.md
5. Créer snapshot avant merge

---

**Projet maintenu avec ❤️ par Context Continuity Manager Agent**
**Agent ID**: a1d117a
**Dernière session**: 2026-02-14 (Migration + Dashboard + Déploiement)
