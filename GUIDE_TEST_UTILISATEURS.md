# 🧪 Guide - Créer les utilisateurs de test en production

## Étape 1 : Accéder à Supabase SQL Editor

1. Va sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionne ton projet
3. Dans le menu latéral, clique sur **SQL Editor**

## Étape 2 : Exécuter le script SQL

1. Dans SQL Editor, crée une **New Query**
2. Copie-colle le contenu du fichier `prisma/seed-test-users.sql`
3. Clique sur **Run** (ou `Ctrl+Enter`)

✅ Le script va créer 4 utilisateurs de test

## Étape 3 : Vérifier la création

Tu devrais voir un résultat comme :

```
id                name                email                                role
test-admin-001    Admin Test          admin@erp-marches.local             ADMIN
test-avance-001   Avance Test         avance@erp-marches.local            AVANCE
...
```

## Étape 4 : Tester l'application

### 🔗 Lien de l'application
https://erp-marches-stam-m9mr7v33q-abel-atsus-projects.vercel.app

### 👤 Credentials de test

#### 1. **ADMIN** (tous les droits)
- **Email** : `admin@erp-marches.local`
- **Password** : `Admin123!`
- **Permissions** : Créer, modifier, supprimer tout

#### 2. **AVANCE** (lecture/écriture)
- **Email** : `avance@erp-marches.local`
- **Password** : `Avance123!`
- **Permissions** : Créer, modifier (pas de suppression)

#### 3. **EXPLOITATION** (lecture seule marchés)
- **Email** : `exploitation@erp-marches.local`
- **Password** : `Exploitation123!`
- **Permissions** : Lecture seule sur marchés

#### 4. **VISITEUR** (lecture seule)
- **Email** : `visiteur@erp-marches.local`
- **Password** : `Visiteur123!`
- **Permissions** : Lecture seule partout

---

## 🎯 Que tester ?

### Module Marchés (100%)
- ✅ Liste des marchés avec filtres
- ✅ Création d'un nouveau marché
- ✅ Détail d'un marché
- ✅ Modification d'un marché
- ✅ Suppression d'un marché (ADMIN uniquement)
- ✅ 13 statuts dynamiques avec champs conditionnels

### Module Cautions (100%) 🆕
- ✅ Liste des cautions avec filtres avancés
- ✅ Timeline des échéances
- ✅ Création d'une nouvelle caution
- ✅ Détail d'une caution avec alertes
- ✅ Modification d'une caution
- ✅ Système d'alerte (CRITIQUE ≤7j, ATTENTION ≤30j)
- ✅ Intégration dans la page marché

### Module Documents (100%) 🆕
- ✅ Liste des documents avec statistiques
- ✅ Upload de fichiers (PDF, images, Excel, Word)
- ✅ Filtres avancés (type, phase, dates)
- ✅ Prévisualisation PDF/images
- ✅ Téléchargement de documents
- ✅ Suppression (soft delete)
- ✅ Versioning (si plusieurs versions uploadées)
- ✅ Intégration dans la page marché

### Authentification & Permissions
- ✅ Connexion avec différents rôles
- ✅ Vérifier les restrictions par rôle
- ✅ VISITEUR ne peut pas créer/modifier/supprimer

---

## 🐛 Problèmes connus

Si tu rencontres des problèmes :

1. **Erreur de connexion** : Vérifie que les utilisateurs ont bien été créés (SELECT dans Supabase)
2. **Permissions refusées** : Certains rôles ne peuvent pas tout faire (c'est normal)
3. **Upload de fichiers** : Vérifie que Supabase Storage est bien configuré

---

## 📊 Statistiques déployées

- **Branche** : `feat/mvp-cautions-priorite`
- **Dernier commit** : `eb11703` - test(e2e): Setup Playwright + Documents tests
- **MVP Progression** : 87%
- **Modules terminés** : Marchés, Cautions, Documents, Auth/RBAC

---

**Bon test ! 🚀**
