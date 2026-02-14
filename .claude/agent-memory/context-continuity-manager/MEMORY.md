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

## Notes on This Project

- MVP is 98% complete, nearing production readiness
- Real production data exists (50 marchés, 7 cautions)
- Next phase focuses on Dashboard enrichment
- Always verify against real data counts in production
- Planning documents are valuable artifacts to preserve

## Session History

### 2026-02-14: Migration Excel + Dashboard Planning
- **Completed**: Excel → PostgreSQL migration (50 marchés, 7 cautions)
- **Schema fixes**: Float → Decimal for amounts, optional relations
- **Cleanup**: Removed temporary scripts and dependencies (xlsx, unpdf)
- **Artifact**: PLAN_DASHBOARD_ENRICHI.md created (8h30 roadmap)
- **Snapshot**: SESSION_SNAPSHOT_2026-02-14.md

## Links to Detailed Topics

*No additional topic files created yet*
