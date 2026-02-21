# Testing E2E Patterns - Playwright + PostgreSQL

## Critical Lessons (2026-02-16)

### NEVER Use PgBouncer for Playwright Tests

**Problem**: PgBouncer with limited connection pool + parallel Playwright workers = connection exhaustion

**Symptoms**:
```
DriverAdapterError: connection failure during authentication
P1017: Server has closed the connection
FATAL: no more connections allowed (max_client_conn)
```

**Solution**: Always use direct PostgreSQL connection for tests

```env
# .env (production)
DATABASE_URL="postgresql://...@host:6543/postgres"  # PgBouncer

# .env.test (tests)
DATABASE_URL="postgresql://...@host:5432/postgres"  # Direct connection
```

### Playwright Configuration for Database Tests

**Always configure Playwright to use .env.test**:

```typescript
// playwright.config.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

// CRITICAL: Load .env.test before any other config
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

export default defineConfig({
  workers: 1, // ALWAYS 1 for DB-dependent tests
  timeout: 30000, // 30s sufficient for DB queries
  retries: 0, // Tests should be deterministic
  // ...
});
```

**Why workers: 1?**
- Prevents connection pool exhaustion
- Eliminates race conditions in DB state
- Makes tests more reproducible
- Small performance cost (~10-15s) for high stability gain

### Test Users Pattern

**Email Convention**: `<role>@<project>.local`
- Domain `.local` is non-routable (RFC 6762)
- Clear separation from production users
- Easy to filter: `WHERE email LIKE '%@erp-marches.local'`

**Password Convention**: `<Role>123!`
- Strong enough for production DB
- Consistent pattern easy to remember
- Bcrypt with 10 rounds

**Example**:
```typescript
const TEST_USERS = {
  admin: { email: 'admin@erp-marches.local', password: 'Admin123!' },
  avance: { email: 'avance@erp-marches.local', password: 'Avance123!' },
  exploitation: { email: 'exploitation@erp-marches.local', password: 'Exploitation123!' },
  visiteur: { email: 'visiteur@erp-marches.local', password: 'Visiteur123!' },
};
```

### SQL Scripts vs Node.js Scripts

**ALWAYS prefer SQL for one-shot operations**:

**Advantages**:
- ✅ No additional dependencies
- ✅ Direct execution in Supabase/pgAdmin SQL Editor
- ✅ Better traceability (SQL history in dashboard)
- ✅ Idempotent with `ON CONFLICT DO NOTHING`
- ✅ No risk of polluting package.json

**SQL Pattern**:
```sql
-- Idempotent user creation
INSERT INTO "User" (id, email, password, "emailVerified", role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@erp-marches.local',
  '$2a$10$...', -- Pre-hashed password
  NOW(),
  'ADMIN',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
```

**Node.js Alternative** (only if SQL not possible):
```javascript
// scripts/create-test-users.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const users = [
  { email: 'admin@erp-marches.local', password: 'Admin123!', role: 'ADMIN' },
  // ...
];

for (const user of users) {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  await prisma.user.upsert({
    where: { email: user.email },
    update: {},
    create: {
      email: user.email,
      password: hashedPassword,
      role: user.role,
      emailVerified: new Date(),
    },
  });
}
```

### Environment File Security

**NEVER commit .env.test**:

```gitignore
# .gitignore
.env.test
.env.*.local
```

**ALWAYS create .env.test.example**:

```env
# .env.test.example
# Copy to .env.test and fill in actual values

# Database - Direct connection (NOT PgBouncer)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=no-verify"

# NextAuth (same as .env)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<same-as-production>"

# Supabase (same as .env)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

### Test User Creation Workflow

**Phase 1: Verify Environment**
```bash
# Check .env.test exists
test -f .env.test && echo "OK" || echo "MISSING"

# Verify connection string (should be port 5432)
grep "5432" .env.test
```

**Phase 2: Create Users (SQL - RECOMMENDED)**
1. Open Supabase Dashboard → SQL Editor
2. Create new query
3. Paste script from `scripts/create-test-users.sql`
4. Execute
5. Verify: `4 rows inserted` or `NOTICE: user already exists`

**Phase 3: Validate Users (Node.js)**
```bash
# Check users exist with correct passwords
node scripts/check-test-users.js

# Expected output:
# ✅ admin@erp-marches.local - Role: ADMIN - Password valid
# ✅ avance@erp-marches.local - Role: AVANCE - Password valid
# ✅ exploitation@erp-marches.local - Role: EXPLOITATION - Password valid
# ✅ visiteur@erp-marches.local - Role: VISITEUR - Password valid
```

### Documentation Pattern

**ALWAYS create a guide for manual steps**:

Structure:
```markdown
# GUIDE_EXECUTION_SECURISEE.md

## Phase 1: Vérification Environnement
- [ ] Check .env.test exists
- [ ] Verify database connection
- [ ] Test Playwright config

## Phase 2: Création Utilisateurs (RECOMMANDÉ: SQL)
- [ ] Open Supabase SQL Editor
- [ ] Copy-paste scripts/create-test-users.sql
- [ ] Execute
- [ ] Verify output

## Phase 3: Validation
- [ ] Run check script
- [ ] Run tests
- [ ] Verify results
```

**Benefits**:
- Clear step-by-step instructions
- Checkboxes for progress tracking
- Security warnings highlighted
- Alternative approaches documented

### Test Helpers Pattern

**Create reusable test helpers**:

```typescript
// tests/helpers/dashboard.ts

export async function loginAs(page: Page, role: 'admin' | 'avance' | 'exploitation' | 'visiteur') {
  const credentials = {
    admin: { email: 'admin@erp-marches.local', password: 'Admin123!' },
    avance: { email: 'avance@erp-marches.local', password: 'Avance123!' },
    exploitation: { email: 'exploitation@erp-marches.local', password: 'Exploitation123!' },
    visiteur: { email: 'visiteur@erp-marches.local', password: 'Visiteur123!' },
  };

  await page.goto('/login');
  await page.fill('input[name="email"]', credentials[role].email);
  await page.fill('input[name="password"]', credentials[role].password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

export async function checkDashboardLoaded(page: Page) {
  await expect(page.locator('h1:has-text("Tableau de bord")')).toBeVisible();
  await expect(page.locator('[data-testid="kpi-cards"]')).toBeVisible();
}
```

**Usage**:
```typescript
// tests/dashboard/permissions.spec.ts
import { loginAs, checkDashboardLoaded } from '../helpers/dashboard';

test('ADMIN can access dashboard', async ({ page }) => {
  await loginAs(page, 'admin');
  await checkDashboardLoaded(page);
});
```

## Common Pitfalls

### Pitfall 1: Writing tests before creating test users
**Impact**: All tests fail, wasted debugging time
**Solution**: ALWAYS create test users BEFORE writing E2E tests

### Pitfall 2: Using production .env for tests
**Impact**: Connection pool exhaustion, flaky tests
**Solution**: Separate .env.test with direct PostgreSQL connection

### Pitfall 3: Multiple workers with DB tests
**Impact**: Race conditions, connection errors, non-reproducible failures
**Solution**: ALWAYS use workers: 1 for DB-dependent tests

### Pitfall 4: Hardcoding credentials in tests
**Impact**: Security risk, hard to maintain
**Solution**: Centralize credentials in test helpers or .env.test

### Pitfall 5: Not documenting manual steps
**Impact**: Knowledge loss, resumption friction
**Solution**: Create detailed GUIDE_*.md for any manual operations

## Performance Considerations

### Test Execution Time
- **Workers: 1**: ~2-3 minutes for 78 tests
- **Workers: 2**: Faster but unstable (connection errors)
- **Tradeoff**: Stability > Speed for E2E tests

### Connection Pool Sizing
- **PgBouncer**: ~20-30 connections (production)
- **Direct PostgreSQL**: ~100 connections (tests)
- **Recommendation**: Direct connection for tests, PgBouncer for production

### Build vs Runtime
- **Build time**: Use production DATABASE_URL (PgBouncer)
- **Test time**: Use test DATABASE_URL (direct PostgreSQL)
- **Separation**: .env for build, .env.test for tests

## Maintenance

### Updating Test Users
```sql
-- Update password
UPDATE "User"
SET password = '$2a$10$NEW_HASH',
    "updatedAt" = NOW()
WHERE email = 'admin@erp-marches.local';
```

### Deleting Test Users
```sql
-- Clean up test users
DELETE FROM "User"
WHERE email LIKE '%@erp-marches.local';
```

### Verifying Test Users
```sql
-- List all test users
SELECT id, email, role, "createdAt"
FROM "User"
WHERE email LIKE '%@erp-marches.local'
ORDER BY role;
```

## Checklist for New E2E Test Suites

Before writing tests:
- [ ] Create .env.test with direct PostgreSQL connection
- [ ] Configure Playwright to load .env.test
- [ ] Set workers: 1 in playwright.config.ts
- [ ] Create test users in database (via SQL script)
- [ ] Validate test users (via check script)
- [ ] Create test helpers (loginAs, etc.)
- [ ] Document manual steps in GUIDE_*.md
- [ ] Add .env.test to .gitignore
- [ ] Create .env.test.example for documentation
- [ ] Write first smoke test (login/redirect)
- [ ] Validate smoke test passes
- [ ] Write remaining tests

After writing tests:
- [ ] Run full suite (npx playwright test)
- [ ] Verify all tests pass
- [ ] Check execution time (<5 minutes acceptable)
- [ ] Review test coverage
- [ ] Document any known issues
- [ ] Update SESSION.md with results
- [ ] Create snapshot if major milestone

## Integration with CI/CD

### GitHub Actions Example
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Create .env.test
        run: |
          echo "DATABASE_URL=${{ secrets.TEST_DATABASE_URL }}" >> .env.test
          echo "NEXTAUTH_URL=${{ secrets.NEXTAUTH_URL }}" >> .env.test
          echo "NEXTAUTH_SECRET=${{ secrets.NEXTAUTH_SECRET }}" >> .env.test

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Secrets to Configure
- `TEST_DATABASE_URL` - Direct PostgreSQL connection (port 5432)
- `NEXTAUTH_URL` - Test environment URL
- `NEXTAUTH_SECRET` - Same as production

## Troubleshooting

### Issue: "connection failure during authentication"
**Cause**: Using PgBouncer instead of direct connection
**Fix**: Update .env.test to use port 5432 instead of 6543

### Issue: "P1017: Server has closed the connection"
**Cause**: Too many parallel connections (multiple workers)
**Fix**: Set workers: 1 in playwright.config.ts

### Issue: "Invalid credentials" in all tests
**Cause**: Test users not created in database
**Fix**: Execute scripts/create-test-users.sql in Supabase SQL Editor

### Issue: ".env.test not loaded by Playwright"
**Cause**: Missing dotenv.config() in playwright.config.ts
**Fix**: Add dotenv import and config at top of file

### Issue: "Tests pass locally but fail in CI"
**Cause**: Different DATABASE_URL or missing .env.test
**Fix**: Configure secrets in GitHub Actions, create .env.test in CI step

## References

- Playwright Docs: https://playwright.dev/
- PgBouncer Docs: https://www.pgbouncer.org/
- Supabase Docs: https://supabase.com/docs
- RFC 6762 (.local domains): https://tools.ietf.org/html/rfc6762
