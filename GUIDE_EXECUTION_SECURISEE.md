# 🔒 Guide d'Exécution Sécurisée - Création Utilisateurs de Test

## 📋 RÉCAPITULATIF DES 3 PHASES

### ✅ Phase 1 : **VÉRIFICATION** (5 min) - Lecture seule
### 🔧 Phase 2 : **CRÉATION** (3 min) - Avec transaction sécurisée
### 🧪 Phase 3 : **VALIDATION** (5 min) - Tests de connexion

---

## 🎯 PHASE 1 : VÉRIFICATION (⚠️ LECTURE SEULE)

**Objectif** : Analyser l'état actuel de la base de données **SANS RIEN MODIFIER**

### Étape 1.1 : Ouvrir Supabase SQL Editor

1. **Aller sur** : https://supabase.com/dashboard
2. **Se connecter** avec votre compte
3. **Sélectionner** le projet **ERP Marchés STAM**
4. **Cliquer** sur **"SQL Editor"** (sidebar gauche)
5. **Cliquer** sur **"New query"**

---

### Étape 1.2 : Exécuter le Script de Vérification

1. **Ouvrir** le fichier : `scripts/verify-test-users.sql`
2. **Copier** tout le contenu (Ctrl+A → Ctrl+C)
3. **Coller** dans l'éditeur SQL de Supabase (Ctrl+V)
4. **Cliquer** sur **"Run"** (ou F5)

---

### Étape 1.3 : Analyser les Résultats

Vous verrez **3 sections de résultats** :

#### Section 1 : **Tous les utilisateurs existants**
```
📊 TOUS LES UTILISATEURS EXISTANTS
Total | id | email | name | role | createdAt
```

**➡️ Notez le nombre total d'utilisateurs**

---

#### Section 2 : **Vérification utilisateurs de test**
```
📋 VÉRIFICATION UTILISATEURS DE TEST
Statut | Email | Rôle Attendu | ID Attendu | ID Actuel | Rôle Actuel
✅ EXISTE | admin@erp-marches.local | ADMIN | test-admin-001 | ... | ...
❌ MANQUANT | avance@erp-marches.local | AVANCE | test-avance-001 | null | null
...
```

**➡️ Comptez le nombre de ❌ MANQUANT**

---

#### Section 3 : **Résumé**
```
📊 RÉSUMÉ
Utilisateurs Test Existants | Utilisateurs Test Manquants | Total Attendus
```

---

### ✅ Décision Phase 1

**SI** `Utilisateurs Test Manquants = 0` :
- ✅ **TOUS LES UTILISATEURS EXISTENT DÉJÀ**
- ℹ️ **Aucune action requise**
- 🎯 **Passez directement à la PHASE 3 (Validation)**

**SI** `Utilisateurs Test Manquants > 0` :
- ❌ **Des utilisateurs manquent**
- 📝 **Passez à la PHASE 2 (Création)**

---

## 🔧 PHASE 2 : CRÉATION SÉCURISÉE (⚠️ AVEC TRANSACTION)

**Objectif** : Créer UNIQUEMENT les utilisateurs manquants avec sécurité maximale

### ⚠️ RÈGLES DE SÉCURITÉ

- ✅ **Transaction** : Rollback automatique si erreur
- ✅ **Idempotence** : `ON CONFLICT DO UPDATE` (peut être exécuté plusieurs fois)
- ✅ **Pas de suppression** : Aucun DELETE, TRUNCATE ou DROP
- ✅ **Logging** : Chaque opération est tracée

---

### Étape 2.1 : Ouvrir Nouvelle Requête SQL

1. **Dans Supabase SQL Editor**, cliquer sur **"New query"**
2. **Effacer** le contenu par défaut

---

### Étape 2.2 : Exécuter le Script de Création Sécurisé

1. **Ouvrir** le fichier : `scripts/create-test-users-safe.sql`
2. **Copier** tout le contenu (Ctrl+A → Ctrl+C)
3. **Coller** dans l'éditeur SQL (Ctrl+V)
4. **Vérifier** une dernière fois que c'est le bon script
5. **Cliquer** sur **"Run"** (ou F5)

---

### Étape 2.3 : Vérifier les Résultats en Direct

Vous verrez **plusieurs sections de résultats** s'afficher séquentiellement :

#### 1. **Début de transaction**
```
🚀 DÉBUT DE LA TRANSACTION
Horodatage
```

#### 2. **État AVANT insertion**
```
💾 BACKUP : État AVANT insertion
Total Utilisateurs Existants
```

#### 3. **Création des utilisateurs** (4 résultats)
```
✅ ADMIN créé/mis à jour | id | email | role
✅ AVANCE créé/mis à jour | id | email | role
✅ EXPLOITATION créé/mis à jour | id | email | role
✅ VISITEUR créé/mis à jour | id | email | role
```

**➡️ Vous devez voir 4 lignes avec ✅**

#### 4. **État APRÈS insertion**
```
📊 VÉRIFICATION : État APRÈS insertion
Total Utilisateurs
```

#### 5. **Liste complète des utilisateurs de test**
```
📋 LISTE COMPLÈTE DES UTILISATEURS DE TEST
id | email | name | role | createdAt | updatedAt
test-admin-001 | admin@erp-marches.local | Admin Test | ADMIN | ...
test-avance-001 | avance@erp-marches.local | Avance Test | AVANCE | ...
test-exploitation-001 | exploitation@erp-marches.local | Exploitation Test | EXPLOITATION | ...
test-visiteur-001 | visiteur@erp-marches.local | Visiteur Test | VISITEUR | ...
```

**➡️ Vous devez voir exactement 4 lignes**

#### 6. **Confirmation finale**
```
✅ TRANSACTION VALIDÉE (COMMIT)
Horodatage Fin
```

---

### ✅ Validation Phase 2

**SI tout s'est bien passé** :
- ✅ Les 4 utilisateurs apparaissent dans la liste
- ✅ Le message "TRANSACTION VALIDÉE (COMMIT)" s'affiche
- 🎯 **Passez à la PHASE 3 (Validation)**

**SI une erreur est survenue** :
- ❌ Un message d'erreur s'affiche
- ⚠️ La transaction a été **ROLLBACK automatiquement**
- 🔄 **Aucune donnée n'a été modifiée**
- 📞 **Contactez le support avec le message d'erreur**

---

## 🧪 PHASE 3 : VALIDATION (Tests de Connexion)

**Objectif** : Vérifier que les 4 utilisateurs fonctionnent correctement

### Étape 3.1 : Test de Connexion Manuel

#### Test 1 : **ADMIN**

1. **Aller sur** : https://erp-marches-stam.vercel.app/login
2. **Se connecter** :
   - Email : `admin@erp-marches.local`
   - Mot de passe : `Admin123!`
3. **Vérifier** : Arrivée sur le Dashboard
4. **Se déconnecter**

#### Test 2 : **AVANCE**

1. **Se connecter** :
   - Email : `avance@erp-marches.local`
   - Mot de passe : `Avance123!`
2. **Vérifier** : Arrivée sur le Dashboard
3. **Se déconnecter**

#### Test 3 : **EXPLOITATION**

1. **Se connecter** :
   - Email : `exploitation@erp-marches.local`
   - Mot de passe : `Exploitation123!`
2. **Vérifier** : Arrivée sur le Dashboard
3. **Se déconnecter**

#### Test 4 : **VISITEUR**

1. **Se connecter** :
   - Email : `visiteur@erp-marches.local`
   - Mot de passe : `Visiteur123!`
2. **Vérifier** : Arrivée sur le Dashboard
3. **Se déconnecter**

---

### Étape 3.2 : Lancer les Tests E2E (Optionnel)

Si vous avez **Playwright** installé :

```bash
# Installer Playwright (si pas déjà fait)
npx playwright install

# Lancer les tests dashboard
npx playwright test tests/dashboard/ --project=chromium

# Résultat attendu : 75 tests passent ✅
```

---

## 📊 RÉCAPITULATIF DES CREDENTIALS

| Email | Mot de passe | Rôle | ID |
|-------|--------------|------|-----|
| `admin@erp-marches.local` | `Admin123!` | ADMIN | `test-admin-001` |
| `avance@erp-marches.local` | `Avance123!` | AVANCE | `test-avance-001` |
| `exploitation@erp-marches.local` | `Exploitation123!` | EXPLOITATION | `test-exploitation-001` |
| `visiteur@erp-marches.local` | `Visiteur123!` | VISITEUR | `test-visiteur-001` |

---

## 🐛 TROUBLESHOOTING

### Problème 1 : "Email already exists"

**Cause** : L'utilisateur existe déjà

**Solution** : C'est normal ! Le script utilise `ON CONFLICT DO UPDATE`, il met simplement à jour le mot de passe et le rôle.

---

### Problème 2 : "Permission denied"

**Cause** : Vous n'avez pas les droits SQL sur Supabase

**Solution** : Vérifiez que vous êtes **Owner** ou **Admin** du projet Supabase

---

### Problème 3 : "Invalid password hash"

**Cause** : Le hash bcrypt est mal copié/collé

**Solution** : Vérifiez que le hash commence par `$2b$10$` et fait environ 60 caractères

---

### Problème 4 : "Connection refused" lors des tests

**Cause** : Les tests tournent en local mais la base est en production

**Solution** : Vérifiez la variable d'environnement `DATABASE_URL` dans `.env.local`

---

## ✅ CHECKLIST FINALE

Avant de dire "TERMINÉ", vérifiez :

- [ ] ✅ Phase 1 exécutée (script `verify-test-users.sql`)
- [ ] ✅ Phase 2 exécutée SI nécessaire (script `create-test-users-safe.sql`)
- [ ] ✅ Message "TRANSACTION VALIDÉE (COMMIT)" affiché
- [ ] ✅ 4 utilisateurs de test visibles dans la base
- [ ] ✅ Test de connexion ADMIN réussi
- [ ] ✅ Test de connexion AVANCE réussi
- [ ] ✅ Test de connexion EXPLOITATION réussi
- [ ] ✅ Test de connexion VISITEUR réussi

---

## 🎯 PROCHAINE ÉTAPE

Une fois tous les tests manuels validés, vous pouvez :

1. **Lancer les tests E2E Dashboard** :
   ```bash
   npx playwright test tests/dashboard/ --project=chromium
   ```

2. **Résultat attendu** : **75 tests passent** ✅

---

## 📝 NOTES IMPORTANTES

### ⚠️ Sécurité

- Les mots de passe sont **hachés avec bcrypt** (rounds=10)
- Les utilisateurs de test utilisent le domaine `@erp-marches.local` (non-production)
- Les IDs sont préfixés `test-` pour identification facile

### 🔄 Idempotence

- Le script peut être **exécuté plusieurs fois** sans danger
- `ON CONFLICT DO UPDATE` met à jour le mot de passe si l'email existe déjà
- Aucun doublon ne sera créé

### 💾 Backup

- Le script affiche l'**état AVANT** et **APRÈS** insertion
- En cas de problème, **ROLLBACK automatique**
- Aucune donnée existante n'est supprimée

---

**🚀 Prêt à commencer ? Ouvrez Supabase Dashboard et suivez la Phase 1 !**
