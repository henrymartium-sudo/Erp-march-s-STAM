# Context Continuity Manager - Memory

## Effective Snapshot Patterns

### Migration Session Pattern (2026-02-14)
When handling large data migrations from Excel to PostgreSQL:
- Create temporary migration scripts in `scripts/data/`
- Use dedicated migration user for traceability
- Clean up temporary dependencies and scripts after successful migration
- Document migration results (number of entities migrated)
- Create detailed implementation plans immediately after migration

### Dashboard Planning Structure
Effective dashboard planning includes:
- Widget-based decomposition (W1, W2, etc.)
- Time estimates per widget (granular: 1h, 2h)
- Priority matrix (HAUTE, MOYENNE, BASSE)
- Complete technical architecture (file structure, dependencies)
- Phase-based implementation plan with clear steps
- Responsive design specifications (mobile, tablet, desktop)

### Dashboard Implementation Pattern (2026-02-14)
When implementing dashboard with charts (Recharts):
- Use shadcn/ui chart components for optimal integration
- Separate backend (Server Components) from frontend (Client Components)
- Backend: Prisma aggregations (groupBy, count) in `lib/dashboard/stats.ts`
- Frontend: Client components in `components/dashboard/*.tsx`
- Create `lib/dashboard/types.ts` for shared TypeScript interfaces
- Test responsive design thoroughly before deployment
- Document time overhead (+20% for documentation and testing)

## Project-Specific Context Requirements

### Always Capture for This Project
1. **Database State**: Number of real entities (marchés, cautions, documents, véhicules)
2. **Migration Status**: What data has been migrated vs. test data
3. **Prisma Schema Changes**: Any relation or field type modifications
4. **Dependency Changes**: npm packages added/removed
5. **Planning Artifacts**: Location of PLAN_*.md files created

### Critical Files for Resumption
- `SESSION.md` - Sprint progress tracking
- `MEMORY.md` (in `.claude\projects\...`) - Global project memory
- `PLAN_*.md` - Implementation plans for features
- `GUIDE_TEST_UTILISATEURS.md` - Test credentials and validation
- `SESSION_SNAPSHOT_*.md` - Complete state snapshots at major milestones
- `SESSION_DASHBOARD_*.md` - Detailed session logs for specific features

## Common Resumption Challenges

### Challenge: Large Migration Context
**Solution**: Break down into clear phases:
1. Pre-migration validation (schema compatibility)
2. Migration execution (one-shot scripts)
3. Post-migration cleanup (temporary files/deps)
4. Next steps planning (detailed implementation plan)

### Challenge: Complex Feature Planning
**Solution**: Create standalone PLAN_*.md files with:
- Complete widget/feature inventory
- Technical stack requirements (new dependencies)
- File structure with exact paths
- Code examples for each component
- Validation checklist

## Patterns That Work Well

### Migration Snapshot Structure
```markdown
## MIGRATION COMPLETED
- Source: [Excel file description]
- Target: [PostgreSQL tables]
- Entities migrated: [exact counts]
- Schema changes: [list modifications]
- Cleanup done: [files removed, deps removed]
- Migration user: [ID and purpose]
```

### Feature Planning Snapshot Structure
```markdown
## PLAN CREATED
- Feature: [name]
- Plan file: [exact path]
- Estimated duration: [hours]
- Widgets/phases: [count and breakdown]
- Dependencies to install: [list]
- Next immediate step: [actionable task]
```

### Deployment Snapshot Structure
```markdown
## DEPLOYMENT COMPLETED
- Feature: [name and scope]
- Commits: [list with hashes and messages]
- Merge strategy: [fast-forward, squash, rebase]
- Build status: [time, size, errors]
- Production URL: [verify accessibility]
- Performance: [First Load JS, bundle size delta]
- Files modified: [exact paths and roles]
- Next steps: [user testing, monitoring, optional features]
```

## Notes on This Project

- MVP 100% complet + Refonte Frontend UI/UX déployée (2026-02-17)
- Real production data exists (50 marchés, 7 cautions)
- Dashboard enrichi + Refonte STAM design system deployed and functional in production
- Always verify against real data counts in production
- Planning documents are valuable artifacts to preserve
- Vercel deployments are automatic from `main` branch
- Fast-forward merge preferred for clean git history
- Améliorations MVP: 7/10 features terminées (F1-F7) — PROCHAIN: F8 Brouillons Auto-Save (4h)
- Plan complet: `memory/plan-ameliorations.md` — `memory/checkpoint-souviens-toi.md` pour reprise rapide

## Session History

### 2026-02-14 Morning: Migration Excel + Dashboard Planning
- **Completed**: Excel → PostgreSQL migration (50 marchés, 7 cautions)
- **Schema fixes**: Float → Decimal for amounts, optional relations
- **Cleanup**: Removed temporary scripts and dependencies (xlsx, unpdf)
- **Artifact**: PLAN_DASHBOARD_ENRICHI.md created (8h30 roadmap)
- **Snapshot**: SESSION_SNAPSHOT_2026-02-14.md

### 2026-02-14 Afternoon: Dashboard Enrichi Implementation + Deployment
- **Completed**: Phases 1-3 Dashboard (Setup + Status Charts + Montants Chart)
- **Stack**: Recharts 2.15.0 + shadcn/ui chart components
- **Components**: `status-charts.tsx` (164L), `montants-chart.tsx` (158L)
- **Backend**: `lib/dashboard/stats.ts` (getStatusStats, getMontantsMensuels)
- **Merge**: feature/dashboard-enrichi → main (fast-forward)
- **Deploy**: Vercel SUCCESS (67s build, 224 kB First Load JS)
- **Artifacts**: SESSION_DASHBOARD_2026-02-14.md (detailed log)
- **Snapshot**: SESSION_SNAPSHOT_DEPLOYMENT_2026-02-14.md
- **Time**: 4h15 (vs 3h30 estimated, +20% overhead documentation/testing)
- **Status**: ✅ PRODUCTION READY at https://erp-marches-stam.vercel.app

### 2026-02-16: Tests E2E Configuration + DB Connection Fix
- **Problem**: 77/78 tests E2E échouaient avec erreurs connexion DB (PgBouncer)
- **Root Cause**: PgBouncer (port 6543) + 2 workers Playwright = pool exhaustion
- **Solution**: Connexion directe PostgreSQL (port 5432) via .env.test + workers: 1
- **Artifacts**:
  - `.env.test` (connexion directe DB)
  - `scripts/create-test-users.sql` (script SQL utilisateurs test)
  - `GUIDE_EXECUTION_SECURISEE.md` (guide 3 phases création utilisateurs)
- **Scripts**: manage-test-users.js, check-test-users.js (Node.js alternatives)
- **Snapshot**: SESSION_SNAPSHOT_E2E_CONFIG_2026-02-16.md
- **Resolution**: Erreurs connexion DB → 0, utilisateurs test prêts à créer
- **Blocker**: Tests validés après création manuelle utilisateurs (Supabase SQL Editor)

### 2026-02-17: Refonte Frontend Déployée + Plan Améliorations MVP
- **Commits pushés**: `96d4749` (feat refonte, 46 fichiers +2328/-1404) + `6d882da` (docs checkpoint)
- **Tests Playwright prod**: Login split-screen validée. Auth E2E échoue car users test non seedés prod
- **Tests manuels**: Paliers 1-8 validés par l'utilisateur
- **Plan créé**: 10 features (~29h) dans `memory/plan-ameliorations.md`
- **État**: Prêt à démarrer Groupe 1 — Error boundaries en premier

### 2026-02-18 Matin: Améliorations MVP F1-F6 complètes
- **Commit**: `9b816fd` — feat(ameliorations): F5 Page Profil + F6 Permissions EXPLOITATION
- **F1-F4**: Error Boundaries + Badge Rôle + Toast wrapper + Récupération MDP (commit `d5e6a9a`)
- **F5 Page Profil**: `app/(dashboard)/profil/page.tsx` + `ProfilClient.tsx` + `lib/actions/auth/change-password.ts`
- **F6 Permissions**: `canWrite(role)` + `isExploitation(role)` dans `lib/utils/permissions.ts` — 8 fichiers touchés

### 2026-02-18 Après-midi: F7 Workflow Statuts + fix Suspense
- **Commit**: `589d2d5` — feat(ameliorations): F7 Workflow Statuts + fix Suspense reset-password
- **Créé**: `lib/utils/workflow-statuts.ts` (isTransitionValid + getAvailableStatuts + isTerminal)
- **Modifié**: `lib/actions/marches.ts` — validation transition avant updateMarche()
- **Modifié**: `components/marches/marche-form.tsx` — Select filtré + désactivé si terminal
- **Fix build**: `app/(auth)/reset-password/` scindé en page.tsx + ResetPasswordContent.tsx (Suspense)
- **Progression**: 7/10 features (70%) — PROCHAIN: F8 Brouillons Auto-Save (4h)
- **Checkpoint**: `memory/checkpoint-souviens-toi.md` + `memory/session-2026-02-18-F7.md`

## Links to Detailed Topics

### Testing Patterns
See `testing-e2e-patterns.md` for detailed Playwright + PostgreSQL patterns

### Documentation Navigation
See `INDEX_DOCUMENTATION_SESSIONS.md` (project root) for complete documentation index with:
- All snapshots chronologically organized
- Guides by use case (reprise, execution, planning)
- Navigation by role (developer, QA, devops, product owner)
- Quick links to critical documents
