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

- MVP is 99% complete, production-ready with Dashboard enrichi deployed
- Real production data exists (50 marchés, 7 cautions)
- Dashboard enrichi Phases 1-3 deployed and functional in production
- Always verify against real data counts in production
- Planning documents are valuable artifacts to preserve
- Vercel deployments are automatic from `main` branch
- Fast-forward merge preferred for clean git history

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

## Links to Detailed Topics

*No additional topic files created yet*
