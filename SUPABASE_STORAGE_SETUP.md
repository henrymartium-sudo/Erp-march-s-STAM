# Guide de Configuration Supabase Storage

**Module** : Documents & Médias
**Date** : 2026-02-01
**Durée estimée** : 15-20 minutes

---

## 📋 Prérequis

- Compte Supabase actif (déjà configuré pour PostgreSQL)
- Accès au projet Supabase : `awsvkjdziwzknnvkpuyq`
- URL dashboard : https://supabase.com/dashboard/project/awsvkjdziwzknnvkpuyq

---

## 🔑 Étape 1 : Récupérer les Clés API (5 min)

### 1.1 Accéder aux Paramètres API

1. Aller sur https://supabase.com/dashboard/project/awsvkjdziwzknnvkpuyq/settings/api
2. Vous verrez 3 clés :
   - **Project URL** (déjà dans .env)
   - **anon public** (clé publique)
   - **service_role** (clé secrète - NE JAMAIS exposer au client)

### 1.2 Copier les Clés

**Copier la clé `anon public`** :
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3c3Zramr6aXd6a25udmtwdXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk5Njc...
```

**Copier la clé `service_role`** :
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3c3Zramr6aXd6a25udmtwdXlxIiwicm9sZSI6InNlcnZpY2Vfc...
```

### 1.3 Mettre à Jour .env

Ouvrir le fichier `.env` et remplacer les placeholders :

```env
# Remplacer ces lignes
NEXT_PUBLIC_SUPABASE_ANON_KEY="VOTRE_ANON_KEY_ICI"
SUPABASE_SERVICE_ROLE_KEY="VOTRE_SERVICE_ROLE_KEY_ICI"

# Par les vraies clés
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📦 Étape 2 : Créer le Bucket Storage (5 min)

### 2.1 Accéder à Storage

1. Aller sur https://supabase.com/dashboard/project/awsvkjdziwzknnvkpuyq/storage/buckets
2. Cliquer sur **"New bucket"**

### 2.2 Configuration du Bucket

Remplir le formulaire :

| Champ | Valeur |
|-------|--------|
| **Name** | `marches-documents` |
| **Public bucket** | ❌ NON (décoché) |
| **File size limit** | `10 MB` |
| **Allowed MIME types** | `application/pdf, image/jpeg, image/png, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

3. Cliquer sur **"Create bucket"**

### 2.3 Vérification

Vous devriez voir le bucket `marches-documents` dans la liste avec :
- 🔒 **Private** (cadenas)
- **0 objects**

---

## 🔐 Étape 3 : Configurer les Politiques RLS (10 min)

### 3.1 Accéder aux Politiques

1. Cliquer sur le bucket `marches-documents`
2. Aller dans l'onglet **"Policies"**
3. Cliquer sur **"New policy"**

### 3.2 Politique 1 : SELECT (Lecture)

**But** : Permettre aux utilisateurs authentifiés de lire les documents

1. Choisir **"For full customization"**
2. Remplir :
   - **Policy name** : `Authenticated users can read documents`
   - **Allowed operation** : `SELECT`
   - **Target roles** : `authenticated`
   - **USING expression** :
     ```sql
     bucket_id = 'marches-documents'
     ```
3. Cliquer sur **"Review"** puis **"Save policy"**

### 3.3 Politique 2 : INSERT (Upload)

**But** : Permettre aux utilisateurs authentifiés d'uploader des documents

1. Cliquer sur **"New policy"**
2. Choisir **"For full customization"**
3. Remplir :
   - **Policy name** : `Authenticated users can upload documents`
   - **Allowed operation** : `INSERT`
   - **Target roles** : `authenticated`
   - **WITH CHECK expression** :
     ```sql
     bucket_id = 'marches-documents'
     ```
4. Cliquer sur **"Review"** puis **"Save policy"**

### 3.4 Politique 3 : DELETE (Suppression)

**But** : Permettre aux utilisateurs authentifiés de supprimer leurs documents

1. Cliquer sur **"New policy"**
2. Choisir **"For full customization"**
3. Remplir :
   - **Policy name** : `Authenticated users can delete documents`
   - **Allowed operation** : `DELETE`
   - **Target roles** : `authenticated`
   - **USING expression** :
     ```sql
     bucket_id = 'marches-documents'
     ```
4. Cliquer sur **"Review"** puis **"Save policy"**

### 3.5 Politique 4 : UPDATE (Modification métadonnées)

**But** : Permettre aux utilisateurs authentifiés de modifier les métadonnées

1. Cliquer sur **"New policy"**
2. Choisir **"For full customization"**
3. Remplir :
   - **Policy name** : `Authenticated users can update documents`
   - **Allowed operation** : `UPDATE`
   - **Target roles** : `authenticated`
   - **USING expression** :
     ```sql
     bucket_id = 'marches-documents'
     ```
   - **WITH CHECK expression** :
     ```sql
     bucket_id = 'marches-documents'
     ```
4. Cliquer sur **"Review"** puis **"Save policy"**

---

## 🌐 Étape 4 : Configurer CORS (Optionnel)

Si vous rencontrez des erreurs CORS lors de l'upload :

1. Aller sur https://supabase.com/dashboard/project/awsvkjdziwzknnvkpuyq/settings/api
2. Descendre à **"CORS Configuration"**
3. Ajouter l'origine de développement :
   ```
   http://localhost:3000
   ```
4. Pour la production, ajouter l'URL Vercel plus tard

---

## ✅ Étape 5 : Tester la Configuration

### 5.1 Vérification des Variables

Dans le terminal, exécuter :

```bash
# Windows PowerShell
Get-Content .env | Select-String "SUPABASE"
```

Vous devriez voir :
```
NEXT_PUBLIC_SUPABASE_URL="https://awsvkjdziwzknnvkpuyq.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."
```

### 5.2 Test de Connexion (À faire après l'étape suivante)

Après avoir créé les Server Actions, nous testerons :
- Upload d'un fichier PDF test
- Génération d'URL signée
- Téléchargement du fichier
- Suppression du fichier

---

## 📊 Récapitulatif

| Élément | Statut |
|---------|--------|
| ✅ Clés API récupérées | |
| ✅ Bucket `marches-documents` créé | |
| ✅ Politique SELECT (lecture) | |
| ✅ Politique INSERT (upload) | |
| ✅ Politique DELETE (suppression) | |
| ✅ Politique UPDATE (modification) | |
| ✅ CORS configuré (si nécessaire) | |
| ✅ Variables .env mises à jour | |

---

## 🔧 Dépannage

### Erreur : "Invalid JWT"

**Cause** : Mauvaise clé API copiée

**Solution** :
1. Revérifier les clés dans Supabase Dashboard
2. S'assurer qu'il n'y a pas d'espaces avant/après la clé
3. Redémarrer le serveur Next.js : `npm run dev`

### Erreur : "Bucket not found"

**Cause** : Nom du bucket incorrect

**Solution** :
1. Vérifier que le bucket s'appelle exactement `marches-documents`
2. Vérifier dans Storage → Buckets

### Erreur : "Row Level Security policy violated"

**Cause** : Politiques RLS mal configurées

**Solution** :
1. Vérifier que les 4 politiques sont créées
2. Vérifier l'expression `bucket_id = 'marches-documents'`
3. Tester avec service_role key (bypass RLS)

---

## 📚 Ressources

- Documentation Supabase Storage : https://supabase.com/docs/guides/storage
- Documentation RLS Policies : https://supabase.com/docs/guides/storage/security/access-control
- Dashboard Supabase : https://supabase.com/dashboard/project/awsvkjdziwzknnvkpuyq

---

## 🎯 Prochaine Étape

Une fois cette configuration terminée :
1. ✅ Marquer cette checklist comme complétée
2. ➡️ Passer à la **Phase 2 : Migration Base de Données** (ajout du modèle Document)

---

**Dernière mise à jour** : 2026-02-01
**Contact Support Supabase** : https://supabase.com/support
