# 📝 Guide: Créer les utilisateurs de test

## 🎯 Objectif

Créer les **4 utilisateurs de test** nécessaires pour exécuter les **75 tests E2E Dashboard**:

| Email | Password | Rôle |
|-------|----------|------|
| `admin@erp-marches.local` | `Admin123!` | ADMIN |
| `avance@erp-marches.local` | `Avance123!` | AVANCE |
| `exploitation@erp-marches.local` | `Exploitation123!` | EXPLOITATION |
| `visiteur@erp-marches.local` | `Visiteur123!` | VISITEUR |

## 🚀 Méthode 1: Via Supabase Dashboard (Recommandé)

### Étape 1: Ouvrir Supabase Dashboard

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet ERP Marchés STAM
3. Cliquer sur **SQL Editor** dans la sidebar

### Étape 2: Exécuter le script SQL

1. Cliquer sur **New query**
2. Ouvrir le fichier `scripts/create-test-users.sql`
3. **Copier tout le contenu** (Ctrl+A → Ctrl+C)
4. **Coller** dans l'éditeur SQL de Supabase
5. Cliquer sur **Run** (ou F5)

### Étape 3: Vérifier la création

Vous devriez voir un résultat comme:

```
id                email                           name              role
test-admin-001    admin@erp-marches.local         Admin Test        ADMIN
test-avance-001   avance@erp-marches.local        Avance Test       AVANCE
test-exploitation exploitation@erp-marches.local  Exploitation Test EXPLOITATION
test-visiteur-001 visiteur@erp-marches.local      Visiteur Test     VISITEUR

✅ 4 rows
```

---

## 🛠️ Méthode 2: Via Supabase CLI (Alternative)

### Prérequis

```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase
```

### Exécution

```bash
# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref <votre-project-ref>

# Exécuter le script SQL
supabase db execute --file scripts/create-test-users.sql
```

---

## 💻 Méthode 3: Via psql (PostgreSQL local)

Si vous utilisez PostgreSQL en local:

```bash
# Exécuter le script
psql $DATABASE_URL -f scripts/create-test-users.sql

# Ou en une ligne
cat scripts/create-test-users.sql | psql $DATABASE_URL
```

---

## 🔧 Méthode 4: Via Prisma Studio (Manuel)

### Étape 1: Ouvrir Prisma Studio

```bash
npx prisma studio
```

### Étape 2: Créer chaque utilisateur

1. Cliquer sur le modèle **User** dans la sidebar
2. Cliquer sur **Add record**
3. Remplir les champs:

**Utilisateur 1 - ADMIN**:
```
id:        test-admin-001
email:     admin@erp-marches.local
name:      Admin Test
password:  $2b$10$UatN8q4PNR.ypcmIYf9wt.1zfxhoE9/cCt6NkwlYpNiW1d5q8KnlK
role:      ADMIN
```

**Utilisateur 2 - AVANCE**:
```
id:        test-avance-001
email:     avance@erp-marches.local
name:      Avance Test
password:  $2b$10$KP8.OCXfUHfa/VdYW3GHwedcRWKx63U451tsyujVDWOV4LiP3mKHi
role:      AVANCE
```

**Utilisateur 3 - EXPLOITATION**:
```
id:        test-exploitation-001
email:     exploitation@erp-marches.local
name:      Exploitation Test
password:  $2b$10$oQ36jFf9hCmGSFN3BhoX.e6UNVfBp.YhU4cVKECVlb2bKoG4vqlJ2
role:      EXPLOITATION
```

**Utilisateur 4 - VISITEUR**:
```
id:        test-visiteur-001
email:     visiteur@erp-marches.local
name:      Visiteur Test
password:  $2b$10$y8T1Nd3J5NN0ro3PU75u4.iGq/W1dBkpMzxZKt.8W5Py/djPhRVn2
role:      VISITEUR
```

4. Cliquer sur **Save 4 changes**

---

## ✅ Vérification

### Via Supabase Dashboard

1. Aller dans **Table Editor**
2. Sélectionner la table **users**
3. Filtrer: `email` LIKE `%erp-marches.local`
4. Vous devriez voir les 4 utilisateurs

### Via Script Node.js

```bash
# Créer un script de vérification rapide
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const users = await prisma.user.findMany({
    where: { email: { contains: 'erp-marches.local' } },
    select: { email: true, role: true }
  });
  console.log('✅ Utilisateurs trouvés:', users.length);
  users.forEach(u => console.log('  -', u.email, '(' + u.role + ')'));
  await prisma.\$disconnect();
}

verify();
"
```

Résultat attendu:
```
✅ Utilisateurs trouvés: 4
  - admin@erp-marches.local (ADMIN)
  - avance@erp-marches.local (AVANCE)
  - exploitation@erp-marches.local (EXPLOITATION)
  - visiteur@erp-marches.local (VISITEUR)
```

---

## 🧪 Tester le login

Une fois les utilisateurs créés, testez la connexion:

### Test manuel

1. Aller sur https://erp-marches-stam.vercel.app/login
2. Se connecter avec `admin@erp-marches.local` / `Admin123!`
3. Vérifier l'accès au dashboard

### Test Playwright

```bash
# Lancer les tests dashboard
npx playwright test tests/dashboard/auth.spec.ts --project=chromium

# Résultat attendu
Running 5 tests using 1 worker
  ✔ 1 [chromium] › tests/dashboard/auth.spec.ts:10:7 › devrait rediriger... (2s)
  ✔ 2 [chromium] › tests/dashboard/auth.spec.ts:18:7 › devrait afficher ADMIN (3s)
  ✔ 3 [chromium] › tests/dashboard/auth.spec.ts:30:7 › devrait afficher AVANCE (3s)
  ✔ 4 [chromium] › tests/dashboard/auth.spec.ts:37:7 › devrait afficher EXPLOITATION (3s)
  ✔ 5 [chromium] › tests/dashboard/auth.spec.ts:44:7 › devrait afficher VISITEUR (3s)

  5 passed (14s)
```

---

## 🐛 Problèmes courants

### Erreur: Email already exists

**Cause**: Les utilisateurs existent déjà

**Solution**: Le script utilise `ON CONFLICT DO UPDATE`, donc re-exécuter le script met simplement à jour les mots de passe.

### Erreur: Permission denied

**Cause**: Pas les droits SQL sur Supabase

**Solution**: Vérifier que vous êtes admin du projet Supabase

### Erreur: Invalid password hash

**Cause**: Le hash bcrypt est mal copié

**Solution**: Vérifier que le hash commence par `$2b$10$` et fait ~60 caractères

### Les tests timeout encore

**Cause**: Base de données production, mais tests tournent en local avec DATABASE_URL local

**Solution**:
1. Configurer `PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app` pour tester en production
2. Ou créer aussi les utilisateurs en base locale

---

## 📊 Récapitulatif

| Méthode | Difficulté | Temps | Recommandé |
|---------|------------|-------|------------|
| Supabase Dashboard | ⭐ Facile | 2 min | ✅ OUI |
| Supabase CLI | ⭐⭐ Moyen | 3 min | Si CLI installé |
| psql | ⭐⭐ Moyen | 2 min | Si PostgreSQL local |
| Prisma Studio | ⭐⭐⭐ Difficile | 10 min | Dernière option |

---

## 🎯 Prochaine étape

Une fois les utilisateurs créés:

```bash
# Lancer tous les tests dashboard
npx playwright test tests/dashboard/ --project=chromium

# Résultat attendu: 75 tests passent ✅
```

---

**Fichiers créés pour vous**:
- ✅ `scripts/create-test-users.sql` - Script SQL prêt à l'emploi
- ✅ `scripts/generate-password-hashes.js` - Générateur de hash (si besoin)
- ✅ `package.json` - Script `npm run db:seed` configuré (nécessite connexion DB)

**Recommandation**: Utiliser la **Méthode 1 (Supabase Dashboard)** pour un résultat rapide et garanti! 🚀
