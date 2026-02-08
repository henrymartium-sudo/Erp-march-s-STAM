# 🧪 Plan de Test Méticuleux - MVP ERP Marchés STAM

**Date de création** : 2026-02-08
**Version MVP** : 100%
**Objectif** : Identifier les fonctionnalités manquantes, les bugs UX/UI et les problèmes techniques

---

## 📋 Table des Matières

1. [Méthodologie de Test](#méthodologie-de-test)
2. [Tests par Module](#tests-par-module)
3. [Tests UX/UI Transversaux](#tests-uxui-transversaux)
4. [Tests Techniques](#tests-techniques)
5. [Tests de Permissions RBAC](#tests-de-permissions-rbac)
6. [Tests d'Intégration (Workflows Métier)](#tests-dintégration-workflows-métier)
7. [Tests de Performance](#tests-de-performance)
8. [Tests d'Accessibilité](#tests-daccessibilité)
9. [Tests Edge Cases](#tests-edge-cases)
10. [Améliorations Identifiées](#améliorations-identifiées)
11. [Implications UX/UI](#implications-uxui)
12. [Implications Techniques](#implications-techniques)

---

## 🎯 Méthodologie de Test

### Environnements
- ✅ **Production** : https://erp-marches-stam.vercel.app
- ✅ **Local** : http://localhost:3000

### Utilisateurs de Test
| Rôle | Email | Permissions |
|------|-------|-------------|
| **ADMIN** | admin@erp-marches.local | Tout |
| **AVANCE** | avance@erp-marches.local | Lecture/Écriture (pas de suppression) |
| **EXPLOITATION** | exploitation@erp-marches.local | Lecture seule marchés |
| **VISITEUR** | visiteur@erp-marches.local | Lecture seule partout |

### Résolutions à Tester
- 📱 **Mobile** : 375x667 (iPhone SE)
- 📱 **Tablette** : 768x1024 (iPad)
- 💻 **Desktop** : 1920x1080
- 🖥️ **Large Desktop** : 2560x1440

### Navigateurs
- ✅ Chrome (prioritaire)
- ✅ Firefox
- ✅ Safari
- ✅ Edge

---

## 🔍 Tests par Module

### Module 1 : Authentification

#### Scénarios de Test

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| A.1 | Connexion avec credentials valides | 🔄 | CRITIQUE | |
| A.2 | Connexion avec credentials invalides | 🔄 | CRITIQUE | Message d'erreur clair ? |
| A.3 | Déconnexion | 🔄 | CRITIQUE | |
| A.4 | Redirection après connexion | 🔄 | HAUTE | Vers dashboard ou page demandée ? |
| A.5 | Session persistante (rafraîchissement page) | 🔄 | HAUTE | |
| A.6 | Expiration de session | 🔄 | MOYENNE | Timeout configuré ? |
| A.7 | Protection des routes non authentifiées | 🔄 | CRITIQUE | |
| A.8 | Message "Remember me" | 🔄 | BASSE | Fonctionnalité présente ? |
| A.9 | Récupération de mot de passe | ❌ | HAUTE | **MANQUANT** |
| A.10 | Changement de mot de passe | ❌ | HAUTE | **MANQUANT** |

**🚨 Améliorations Suggérées** :
- [ ] Ajouter récupération de mot de passe
- [ ] Ajouter changement de mot de passe dans profil utilisateur
- [ ] Ajouter timeout session configurable

---

### Module 2 : Dashboard

#### Scénarios de Test

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| D.1 | Affichage KPI Marchés | 🔄 | CRITIQUE | Calculs corrects ? |
| D.2 | Affichage KPI Cautions | 🔄 | CRITIQUE | |
| D.3 | Affichage KPI Véhicules | 🔄 | CRITIQUE | |
| D.4 | Graphiques de répartition | 🔄 | HAUTE | Interactifs ? |
| D.5 | Section alertes | 🔄 | CRITIQUE | Calculs dates corrects ? |
| D.6 | Actions rapides | 🔄 | HAUTE | Liens fonctionnels ? |
| D.7 | Activité récente | 🔄 | MOYENNE | Contenu pertinent ? |
| D.8 | Chargement dashboard (performance) | 🔄 | HAUTE | < 2 secondes ? |
| D.9 | Responsive mobile | 🔄 | CRITIQUE | KPIs lisibles ? |
| D.10 | Rafraîchissement données | 🔄 | MOYENNE | Auto-refresh ? |

**🎨 Points UX à Vérifier** :
- [ ] Hiérarchie visuelle des KPIs
- [ ] Couleurs alertes (rouge/orange/jaune)
- [ ] Accessibilité graphiques (labels, légendes)
- [ ] Skeleton loaders pendant chargement

---

### Module 3 : Marchés Publics

#### 3.1 Liste des Marchés

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| M.1 | Affichage liste vide | 🔄 | HAUTE | Message d'accueil ? |
| M.2 | Affichage liste avec données | 🔄 | CRITIQUE | |
| M.3 | Filtrage par statut | 🔄 | CRITIQUE | URL params ? |
| M.4 | Filtrage par type | 🔄 | CRITIQUE | |
| M.5 | Recherche textuelle | ❌ | HAUTE | **MANQUANT** |
| M.6 | Tri par colonnes | ❌ | MOYENNE | **MANQUANT** |
| M.7 | Pagination | ❌ | HAUTE | Si > 50 marchés |
| M.8 | Export Excel avec filtres | 🔄 | HAUTE | |
| M.9 | Actions rapides (voir/modifier) | 🔄 | HAUTE | |
| M.10 | Badge statut avec couleurs | 🔄 | MOYENNE | |
| M.11 | Responsive mobile | 🔄 | CRITIQUE | Tableau horizontal scroll ? |
| M.12 | Compteur résultats filtrés | 🔄 | MOYENNE | |

#### 3.2 Création de Marché

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| M.13 | Formulaire initial (champs obligatoires) | 🔄 | CRITIQUE | Validation Zod ? |
| M.14 | Validation numéro unique | 🔄 | CRITIQUE | Message erreur clair ? |
| M.15 | Sélection type marché | 🔄 | CRITIQUE | |
| M.16 | Sélection statut initial | 🔄 | CRITIQUE | Défaut = OPPORTUNITE ? |
| M.17 | Champs conditionnels par statut | 🔄 | CRITIQUE | **13 statuts** |
| M.18 | Validation dates (cohérence) | 🔄 | HAUTE | dateNotif < dateDepot ? |
| M.19 | Validation montant (> 0) | 🔄 | HAUTE | |
| M.20 | Calcul automatique dateFinPrevue | 🔄 | HAUTE | dateOS + delaiExec ? |
| M.21 | Sauvegarde brouillon | ❌ | MOYENNE | **MANQUANT** |
| M.22 | Message succès + redirection | 🔄 | HAUTE | Vers détail ou liste ? |
| M.23 | Gestion erreurs serveur | 🔄 | CRITIQUE | Message utilisateur clair ? |
| M.24 | Responsive mobile | 🔄 | CRITIQUE | Formulaire utilisable ? |

#### 3.3 Détail de Marché

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| M.25 | Affichage informations complètes | 🔄 | CRITIQUE | |
| M.26 | Section cautions associées | 🔄 | HAUTE | Liste + compteur |
| M.27 | Section documents associés | 🔄 | HAUTE | |
| M.28 | Section véhicules associés | 🔄 | HAUTE | |
| M.29 | Timeline du marché | ❌ | MOYENNE | **MANQUANT** |
| M.30 | Historique modifications | ❌ | BASSE | **MANQUANT** |
| M.31 | Actions rapides (modifier/supprimer) | 🔄 | HAUTE | |
| M.32 | Bouton "Créer caution" | 🔄 | HAUTE | Pré-rempli marcheId ? |
| M.33 | Bouton "Uploader document" | 🔄 | HAUTE | |
| M.34 | Bouton "Ajouter véhicule" | 🔄 | HAUTE | |
| M.35 | Export PDF du marché | ❌ | MOYENNE | **MANQUANT** |
| M.36 | Breadcrumb navigation | 🔄 | MOYENNE | |
| M.37 | Responsive mobile | 🔄 | CRITIQUE | |

#### 3.4 Modification de Marché

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| M.38 | Chargement données existantes | 🔄 | CRITIQUE | |
| M.39 | Modification champs simples | 🔄 | CRITIQUE | |
| M.40 | Changement de statut | 🔄 | CRITIQUE | Validation transitions ? |
| M.41 | Champs conditionnels dynamiques | 🔄 | CRITIQUE | |
| M.42 | Validation modifications | 🔄 | HAUTE | |
| M.43 | Message succès + redirection | 🔄 | HAUTE | |
| M.44 | Annulation modifications | 🔄 | MOYENNE | Confirmation ? |

#### 3.5 Suppression de Marché

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| M.45 | Confirmation avant suppression | 🔄 | CRITIQUE | Modal ? |
| M.46 | Suppression cascade (cautions/docs) | 🔄 | CRITIQUE | Prisma onDelete |
| M.47 | Message succès | 🔄 | HAUTE | |
| M.48 | Gestion erreurs (contraintes FK) | 🔄 | HAUTE | |

---

### Module 4 : Cautions

#### 4.1 Liste des Cautions

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| C.1 | Affichage liste | 🔄 | CRITIQUE | |
| C.2 | Filtrage par type | 🔄 | CRITIQUE | |
| C.3 | Filtrage par statut | 🔄 | CRITIQUE | |
| C.4 | Filtrage par marché | 🔄 | HAUTE | Autocomplete ? |
| C.5 | Recherche textuelle | ❌ | HAUTE | **MANQUANT** |
| C.6 | Timeline des échéances | 🔄 | HAUTE | Visuel clair ? |
| C.7 | Alertes visuelles (< 30j) | 🔄 | CRITIQUE | Badge rouge/orange ? |
| C.8 | Tri par date échéance | 🔄 | HAUTE | |
| C.9 | Export Excel | 🔄 | HAUTE | |
| C.10 | Pagination | ❌ | MOYENNE | Si > 50 cautions |
| C.11 | Statistiques résumé | 🔄 | MOYENNE | |
| C.12 | Responsive mobile | 🔄 | CRITIQUE | |

#### 4.2 Création de Caution

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| C.13 | Formulaire complet | 🔄 | CRITIQUE | |
| C.14 | Sélection marché | 🔄 | CRITIQUE | Autocomplete ? |
| C.15 | Validation référence unique | 🔄 | CRITIQUE | |
| C.16 | Validation dates (émission < échéance) | 🔄 | HAUTE | |
| C.17 | Validation montant > 0 | 🔄 | HAUTE | |
| C.18 | Calcul automatique échéance | ❌ | BASSE | durée type par TypeCaution ? |
| C.19 | Message succès | 🔄 | HAUTE | |
| C.20 | Responsive mobile | 🔄 | CRITIQUE | |

#### 4.3 Détail de Caution

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| C.21 | Affichage informations | 🔄 | CRITIQUE | |
| C.22 | Lien vers marché associé | 🔄 | HAUTE | |
| C.23 | Alerte échéance proche | 🔄 | CRITIQUE | Visuel clair ? |
| C.24 | Calcul jours restants | 🔄 | HAUTE | |
| C.25 | Actions (modifier/libérer) | 🔄 | HAUTE | |
| C.26 | Export PDF caution | ❌ | MOYENNE | **MANQUANT** |
| C.27 | Upload scan caution bancaire | 🔄 | HAUTE | Via Documents ? |

#### 4.4 Modification de Caution

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| C.28 | Chargement données | 🔄 | CRITIQUE | |
| C.29 | Changement statut | 🔄 | HAUTE | Workflow validé ? |
| C.30 | Validation modifications | 🔄 | HAUTE | |
| C.31 | Message succès | 🔄 | HAUTE | |

---

### Module 5 : Documents

#### 5.1 Liste des Documents

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| DO.1 | Affichage liste | 🔄 | CRITIQUE | |
| DO.2 | Statistiques types documents | 🔄 | MOYENNE | |
| DO.3 | Filtrage par type | 🔄 | CRITIQUE | |
| DO.4 | Filtrage par phase | 🔄 | HAUTE | |
| DO.5 | Filtrage par marché | 🔄 | HAUTE | |
| DO.6 | Filtrage par dates | 🔄 | MOYENNE | |
| DO.7 | Recherche textuelle | ❌ | HAUTE | **MANQUANT** |
| DO.8 | Tri par date upload | 🔄 | HAUTE | |
| DO.9 | Icônes par type MIME | 🔄 | MOYENNE | |
| DO.10 | Pagination | ❌ | MOYENNE | Si > 50 docs |
| DO.11 | Responsive mobile | 🔄 | CRITIQUE | |

#### 5.2 Upload de Document

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| DO.12 | Formulaire upload | 🔄 | CRITIQUE | |
| DO.13 | Drag & drop | ❌ | MOYENNE | **MANQUANT** |
| DO.14 | Sélection fichier | 🔄 | CRITIQUE | |
| DO.15 | Validation taille fichier | 🔄 | CRITIQUE | Max 10MB ? |
| DO.16 | Validation types MIME | 🔄 | CRITIQUE | PDF, images, Excel, Word |
| DO.17 | Progress bar upload | ❌ | HAUTE | **MANQUANT** |
| DO.18 | Association au marché | 🔄 | CRITIQUE | |
| DO.19 | Sélection type document | 🔄 | CRITIQUE | |
| DO.20 | Sélection phase | 🔄 | HAUTE | |
| DO.21 | Tags personnalisés | 🔄 | MOYENNE | |
| DO.22 | Date de validité | 🔄 | HAUTE | Pour cautions bancaires |
| DO.23 | Upload multiple fichiers | ❌ | HAUTE | **MANQUANT** |
| DO.24 | Message succès | 🔄 | HAUTE | |
| DO.25 | Gestion erreurs upload | 🔄 | CRITIQUE | Network fail ? |

#### 5.3 Détail de Document

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| DO.26 | Affichage métadonnées | 🔄 | CRITIQUE | |
| DO.27 | Prévisualisation PDF | 🔄 | HAUTE | Embed iframe ? |
| DO.28 | Prévisualisation images | 🔄 | HAUTE | |
| DO.29 | Téléchargement fichier | 🔄 | CRITIQUE | |
| DO.30 | Lien vers marché | 🔄 | HAUTE | |
| DO.31 | Historique versions | 🔄 | MOYENNE | Si documentParentId |
| DO.32 | Actions (modifier/supprimer) | 🔄 | HAUTE | |
| DO.33 | Responsive mobile | 🔄 | CRITIQUE | Preview OK ? |

#### 5.4 Versioning

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| DO.34 | Upload nouvelle version | 🔄 | HAUTE | Incrémentation version |
| DO.35 | Liste des versions | 🔄 | HAUTE | |
| DO.36 | Téléchargement version spécifique | 🔄 | MOYENNE | |
| DO.37 | Comparaison versions | ❌ | BASSE | **MANQUANT** |

#### 5.5 Soft Delete

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| DO.38 | Suppression logique | 🔄 | HAUTE | deleted = true |
| DO.39 | Exclusion docs supprimés | 🔄 | HAUTE | |
| DO.40 | Restauration document | ❌ | MOYENNE | **MANQUANT** |
| DO.41 | Suppression définitive | ❌ | BASSE | ADMIN uniquement |

---

### Module 6 : Véhicules

#### 6.1 Liste des Véhicules

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| V.1 | Affichage liste | 🔄 | CRITIQUE | |
| V.2 | Filtrage par statut | 🔄 | CRITIQUE | |
| V.3 | Filtrage par marché | 🔄 | HAUTE | |
| V.4 | Recherche par immatriculation | 🔄 | HAUTE | Debounced ? |
| V.5 | Tri par date livraison | 🔄 | HAUTE | |
| V.6 | Export Excel | 🔄 | HAUTE | |
| V.7 | Pagination | ❌ | MOYENNE | Si > 50 véhicules |
| V.8 | Badge statut avec couleurs | 🔄 | MOYENNE | |
| V.9 | Responsive mobile | 🔄 | CRITIQUE | |

#### 6.2 Création de Véhicule

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| V.10 | Formulaire complet | 🔄 | CRITIQUE | |
| V.11 | Validation immatriculation unique | 🔄 | CRITIQUE | |
| V.12 | Validation format immatriculation | ❌ | MOYENNE | Regex FR ? |
| V.13 | Sélection marché | 🔄 | HAUTE | Optionnel |
| V.14 | Sélection statut | 🔄 | CRITIQUE | |
| V.15 | Champs conditionnels (livraison) | 🔄 | HAUTE | |
| V.16 | Validation dates | 🔄 | HAUTE | |
| V.17 | Message succès | 🔄 | HAUTE | |
| V.18 | Responsive mobile | 🔄 | CRITIQUE | |

#### 6.3 Détail de Véhicule

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| V.19 | Affichage informations | 🔄 | CRITIQUE | |
| V.20 | Lien vers marché | 🔄 | HAUTE | Si associé |
| V.21 | Timeline livraison/réception | ❌ | MOYENNE | **MANQUANT** |
| V.22 | Documents associés | ❌ | HAUTE | **MANQUANT** |
| V.23 | Historique statuts | ❌ | BASSE | **MANQUANT** |
| V.24 | Actions (modifier/supprimer) | 🔄 | HAUTE | |
| V.25 | Export fiche véhicule PDF | ❌ | MOYENNE | **MANQUANT** |

#### 6.4 Modification de Véhicule

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| V.26 | Chargement données | 🔄 | CRITIQUE | |
| V.27 | Modification champs | 🔄 | CRITIQUE | |
| V.28 | Changement statut | 🔄 | HAUTE | Workflow validé ? |
| V.29 | Validation modifications | 🔄 | HAUTE | |
| V.30 | Message succès | 🔄 | HAUTE | |

---

### Module 7 : Alertes & Notifications

#### 7.1 Alertes Manuelles (Admin)

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| AL.1 | Page admin alertes | 🔄 | HAUTE | /admin/alertes |
| AL.2 | Liste destinataires | 🔄 | HAUTE | |
| AL.3 | Ajout destinataire | 🔄 | HAUTE | |
| AL.4 | Modification destinataire | 🔄 | MOYENNE | |
| AL.5 | Suppression destinataire | 🔄 | MOYENNE | |
| AL.6 | Activation/Désactivation | 🔄 | HAUTE | Toggle actif |
| AL.7 | Test envoi email | ❌ | HAUTE | **MANQUANT** |
| AL.8 | Validation email format | 🔄 | HAUTE | |

#### 7.2 Alertes Automatiques (Cron)

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| AL.9 | Configuration Vercel Cron | ❌ | CRITIQUE | **À CONFIGURER** |
| AL.10 | Route API /api/cron/alertes | ❌ | CRITIQUE | **MANQUANT** |
| AL.11 | Vérification CRON_SECRET | ❌ | CRITIQUE | **MANQUANT** |
| AL.12 | Détection cautions < 7j | ❌ | CRITIQUE | **MANQUANT** |
| AL.13 | Détection cautions < 30j | ❌ | HAUTE | **MANQUANT** |
| AL.14 | Détection marchés proche fin | ❌ | HAUTE | **MANQUANT** |
| AL.15 | Génération email HTML | ❌ | HAUTE | **MANQUANT** |
| AL.16 | Envoi via Nodemailer | ❌ | CRITIQUE | **MANQUANT** |
| AL.17 | Logs envois | ❌ | MOYENNE | **MANQUANT** |
| AL.18 | Gestion erreurs SMTP | ❌ | HAUTE | **MANQUANT** |

**🚨 Module Alertes Automatiques = INCOMPLET**

---

### Module 8 : Exports Excel

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| EX.1 | Export marchés (tous) | 🔄 | CRITIQUE | |
| EX.2 | Export marchés (filtrés) | 🔄 | HAUTE | |
| EX.3 | Export cautions (tous) | 🔄 | CRITIQUE | |
| EX.4 | Export cautions (filtrés) | 🔄 | HAUTE | |
| EX.5 | Export véhicules (tous) | 🔄 | CRITIQUE | |
| EX.6 | Export véhicules (filtrés) | 🔄 | HAUTE | |
| EX.7 | Nom fichier avec timestamp | 🔄 | MOYENNE | |
| EX.8 | Format colonnes (dates, montants) | 🔄 | HAUTE | |
| EX.9 | Colonnes lisibles (français) | 🔄 | HAUTE | |
| EX.10 | Téléchargement automatique | 🔄 | HAUTE | |
| EX.11 | Gestion erreurs | 🔄 | HAUTE | |
| EX.12 | Feedback utilisateur | 🔄 | HAUTE | Toast Sonner ? |
| EX.13 | Export multi-sheets | ❌ | BASSE | Tout en 1 fichier |

---

## 🎨 Tests UX/UI Transversaux

### Navigation

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| UI.1 | Menu latéral | 🔄 | CRITIQUE | |
| UI.2 | Logo cliquable (→ dashboard) | 🔄 | MOYENNE | |
| UI.3 | Active menu item | 🔄 | HAUTE | Style actif ? |
| UI.4 | Breadcrumbs | 🔄 | MOYENNE | |
| UI.5 | Bouton retour | 🔄 | HAUTE | Cohérent ? |
| UI.6 | Navigation mobile (hamburger) | 🔄 | CRITIQUE | |
| UI.7 | Fermeture menu mobile | 🔄 | HAUTE | |
| UI.8 | Menu utilisateur (profil) | 🔄 | HAUTE | |
| UI.9 | Indicateur rôle utilisateur | ❌ | MOYENNE | Badge rôle ? |

### Feedback Utilisateur

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| UI.10 | Toast succès | 🔄 | CRITIQUE | Sonner |
| UI.11 | Toast erreur | 🔄 | CRITIQUE | |
| UI.12 | Toast warning | 🔄 | HAUTE | |
| UI.13 | Modals de confirmation | 🔄 | CRITIQUE | |
| UI.14 | Loading spinners | 🔄 | HAUTE | Skeleton ? |
| UI.15 | Messages d'erreur formulaires | 🔄 | CRITIQUE | Inline ? |
| UI.16 | Messages liste vide | 🔄 | HAUTE | Call-to-action ? |
| UI.17 | Progress indicators | ❌ | MOYENNE | Uploads, exports |

### Responsive Design

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| UI.18 | Mobile 375px | 🔄 | CRITIQUE | |
| UI.19 | Tablette 768px | 🔄 | CRITIQUE | |
| UI.20 | Desktop 1920px | 🔄 | CRITIQUE | |
| UI.21 | Large desktop 2560px | 🔄 | MOYENNE | Pas de stretch |
| UI.22 | Tableaux responsive | 🔄 | CRITIQUE | Horizontal scroll ? |
| UI.23 | Formulaires responsive | 🔄 | CRITIQUE | Stacked mobile |
| UI.24 | Modals responsive | 🔄 | HAUTE | |
| UI.25 | Graphiques responsive | 🔄 | HAUTE | |

### Cohérence Visuelle

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| UI.26 | Palette de couleurs cohérente | 🔄 | HAUTE | |
| UI.27 | Typographie cohérente | 🔄 | HAUTE | |
| UI.28 | Espacements cohérents | 🔄 | MOYENNE | |
| UI.29 | Boutons cohérents | 🔄 | HAUTE | Primary/Secondary |
| UI.30 | Badges statuts cohérents | 🔄 | HAUTE | Couleurs sémantiques |
| UI.31 | Icônes cohérentes | 🔄 | MOYENNE | Lucide icons |
| UI.32 | Cards cohérentes | 🔄 | MOYENNE | |

### Performance Perçue

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| UI.33 | Skeleton loaders | ❌ | HAUTE | Dashboard, listes |
| UI.34 | Optimistic updates | ❌ | MOYENNE | Actions rapides |
| UI.35 | Debounced search | 🔄 | HAUTE | 300ms |
| UI.36 | Lazy loading images | ❌ | BASSE | Documents |

---

## ⚙️ Tests Techniques

### Performance

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| T.1 | Temps chargement dashboard | 🔄 | CRITIQUE | < 2s |
| T.2 | Temps chargement listes | 🔄 | HAUTE | < 1s |
| T.3 | Temps recherche | 🔄 | HAUTE | < 500ms |
| T.4 | Temps génération export | 🔄 | HAUTE | < 3s |
| T.5 | Bundle size | 🔄 | MOYENNE | Lighthouse |
| T.6 | Nombre requêtes API | 🔄 | HAUTE | Optimisé ? |
| T.7 | Waterfall réseau | 🔄 | MOYENNE | Chrome DevTools |
| T.8 | Memory leaks | 🔄 | BASSE | |

### Base de Données

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| T.9 | Index performants | 🔄 | HAUTE | Prisma schema |
| T.10 | N+1 queries | 🔄 | HAUTE | Prisma includes |
| T.11 | Contraintes FK | 🔄 | CRITIQUE | onDelete |
| T.12 | Transactions atomiques | ❌ | HAUTE | Créations complexes |
| T.13 | Connexions pool | 🔄 | HAUTE | Vercel config |

### Sécurité

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| T.14 | Validation Zod serveur | 🔄 | CRITIQUE | Toutes Server Actions |
| T.15 | Sanitization inputs | 🔄 | CRITIQUE | XSS |
| T.16 | SQL injection | ✅ | CRITIQUE | Prisma protège |
| T.17 | CSRF protection | ✅ | CRITIQUE | NextAuth |
| T.18 | Rate limiting | ❌ | HAUTE | API routes |
| T.19 | File upload validation | 🔄 | CRITIQUE | MIME, taille |
| T.20 | Environment variables | 🔄 | CRITIQUE | Pas exposées client |
| T.21 | HTTPS only | ✅ | CRITIQUE | Vercel |
| T.22 | Secure cookies | ✅ | CRITIQUE | NextAuth |

### Gestion des Erreurs

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| T.23 | Erreurs Prisma | 🔄 | CRITIQUE | Unique constraint |
| T.24 | Erreurs réseau | 🔄 | HAUTE | Timeout, offline |
| T.25 | Erreurs upload | 🔄 | HAUTE | |
| T.26 | Erreurs SMTP | ❌ | HAUTE | Alertes |
| T.27 | Error boundaries React | ❌ | HAUTE | **MANQUANT** |
| T.28 | Logging serveur | ❌ | MOYENNE | **MANQUANT** |
| T.29 | Monitoring (Sentry ?) | ❌ | BASSE | **MANQUANT** |

### Build & Déploiement

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| T.30 | Build local | ✅ | CRITIQUE | npm run build |
| T.31 | Build Vercel | ✅ | CRITIQUE | |
| T.32 | Autodeploy GitHub | ✅ | CRITIQUE | |
| T.33 | Variables d'environnement prod | ✅ | CRITIQUE | 24 vars |
| T.34 | Logs Vercel | 🔄 | HAUTE | |
| T.35 | Rollback possible | 🔄 | HAUTE | |

---

## 🔒 Tests de Permissions RBAC

### ADMIN

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| P.1 | Créer marché | 🔄 | CRITIQUE | |
| P.2 | Modifier marché | 🔄 | CRITIQUE | |
| P.3 | Supprimer marché | 🔄 | CRITIQUE | |
| P.4 | Créer caution | 🔄 | CRITIQUE | |
| P.5 | Modifier caution | 🔄 | CRITIQUE | |
| P.6 | Supprimer caution | 🔄 | CRITIQUE | |
| P.7 | Upload document | 🔄 | CRITIQUE | |
| P.8 | Supprimer document | 🔄 | CRITIQUE | |
| P.9 | Créer véhicule | 🔄 | CRITIQUE | |
| P.10 | Modifier véhicule | 🔄 | CRITIQUE | |
| P.11 | Supprimer véhicule | 🔄 | CRITIQUE | |
| P.12 | Gérer alertes | 🔄 | CRITIQUE | /admin/alertes |

### AVANCE

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| P.13 | Créer marché | 🔄 | CRITIQUE | ✅ OUI |
| P.14 | Modifier marché | 🔄 | CRITIQUE | ✅ OUI |
| P.15 | Supprimer marché | 🔄 | CRITIQUE | ❌ NON |
| P.16 | Créer caution | 🔄 | CRITIQUE | ✅ OUI |
| P.17 | Modifier caution | 🔄 | CRITIQUE | ✅ OUI |
| P.18 | Supprimer caution | 🔄 | CRITIQUE | ❌ NON |
| P.19 | Upload document | 🔄 | CRITIQUE | ✅ OUI |
| P.20 | Supprimer document | 🔄 | CRITIQUE | ❌ NON |
| P.21 | Créer véhicule | 🔄 | CRITIQUE | ✅ OUI |
| P.22 | Modifier véhicule | 🔄 | CRITIQUE | ✅ OUI |
| P.23 | Supprimer véhicule | 🔄 | CRITIQUE | ❌ NON |
| P.24 | Accès admin alertes | 🔄 | HAUTE | ❌ NON |

### EXPLOITATION

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| P.25 | Lire marchés | 🔄 | CRITIQUE | ✅ OUI |
| P.26 | Créer marché | 🔄 | CRITIQUE | ❌ NON |
| P.27 | Modifier marché | 🔄 | CRITIQUE | ❌ NON |
| P.28 | Lire cautions | 🔄 | HAUTE | ❌ NON ? |
| P.29 | Lire documents | 🔄 | HAUTE | ❌ NON ? |
| P.30 | Lire véhicules | 🔄 | HAUTE | ❌ NON ? |

**⚠️ Permissions EXPLOITATION à clarifier**

### VISITEUR

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| P.31 | Lire marchés | 🔄 | CRITIQUE | ✅ OUI |
| P.32 | Lire cautions | 🔄 | CRITIQUE | ✅ OUI |
| P.33 | Lire documents | 🔄 | CRITIQUE | ✅ OUI |
| P.34 | Lire véhicules | 🔄 | CRITIQUE | ✅ OUI |
| P.35 | Boutons actions masqués | 🔄 | CRITIQUE | Créer/Modifier |
| P.36 | Exports autorisés | 🔄 | HAUTE | ✅ OUI |

---

## 🔄 Tests d'Intégration (Workflows Métier)

### Workflow 1 : Soumission Marché

| # | Étape | Statut | Notes |
|---|-------|--------|-------|
| W1.1 | Créer marché (OPPORTUNITE) | 🔄 | |
| W1.2 | Uploader DAO/DRP | 🔄 | |
| W1.3 | Créer caution PROVISOIRE | 🔄 | |
| W1.4 | Uploader scan caution | 🔄 | |
| W1.5 | Passer statut DOSSIER_EN_PREP | 🔄 | |
| W1.6 | Passer statut OFFRE_DEPOSEE | 🔄 | |
| W1.7 | Vérifier alertes caution | 🔄 | |

### Workflow 2 : Attribution Marché

| # | Étape | Statut | Notes |
|---|-------|--------|-------|
| W2.1 | Passer statut ATTRIBUE_PROV | 🔄 | |
| W2.2 | Créer caution DEFINITIVE | 🔄 | |
| W2.3 | Libérer caution PROVISOIRE | 🔄 | |
| W2.4 | Uploader courrier attribution | 🔄 | |
| W2.5 | Passer statut ATTRIBUE_DEF | 🔄 | |

### Workflow 3 : Exécution Marché

| # | Étape | Statut | Notes |
|---|-------|--------|-------|
| W3.1 | Uploader ordre de service | 🔄 | |
| W3.2 | Passer statut EN_EXECUTION | 🔄 | |
| W3.3 | Créer véhicule | 🔄 | |
| W3.4 | Livrer véhicule | 🔄 | Changer statut |
| W3.5 | Uploader bon de livraison | 🔄 | |
| W3.6 | Réception provisoire | 🔄 | |
| W3.7 | Réception définitive | 🔄 | |

### Workflow 4 : Clôture Marché

| # | Étape | Statut | Notes |
|---|-------|--------|-------|
| W4.1 | Tous véhicules livrés | 🔄 | |
| W4.2 | Passer statut EXECUTE_ATTENTE | 🔄 | |
| W4.3 | Libérer cautions | 🔄 | |
| W4.4 | Uploader attestations bonne fin | 🔄 | |
| W4.5 | Passer statut CLOTURE | 🔄 | |
| W4.6 | Vérifier garanties libérées | 🔄 | |

### Workflow 5 : Export & Reporting

| # | Étape | Statut | Notes |
|---|-------|--------|-------|
| W5.1 | Filtrer marchés (EN_EXECUTION) | 🔄 | |
| W5.2 | Exporter Excel | 🔄 | |
| W5.3 | Vérifier données exportées | 🔄 | |
| W5.4 | Filtrer cautions (ACTIVE) | 🔄 | |
| W5.5 | Exporter Excel cautions | 🔄 | |

---

## 🚀 Tests de Performance

### Métriques Lighthouse

| # | Métrique | Cible | Statut | Notes |
|---|----------|-------|--------|-------|
| L.1 | Performance | ≥ 90 | 🔄 | |
| L.2 | Accessibility | ≥ 90 | 🔄 | |
| L.3 | Best Practices | ≥ 90 | 🔄 | |
| L.4 | SEO | ≥ 80 | 🔄 | |
| L.5 | First Contentful Paint | < 1.8s | 🔄 | |
| L.6 | Largest Contentful Paint | < 2.5s | 🔄 | |
| L.7 | Time to Interactive | < 3.8s | 🔄 | |
| L.8 | Cumulative Layout Shift | < 0.1 | 🔄 | |

### Tests de Charge

| # | Test | Statut | Notes |
|---|------|--------|-------|
| LC.1 | 10 marchés | 🔄 | |
| LC.2 | 100 marchés | 🔄 | Pagination ? |
| LC.3 | 1000 marchés | ❌ | |
| LC.4 | Upload 10 docs simultanés | 🔄 | |
| LC.5 | Export 1000 lignes | 🔄 | |

---

## ♿ Tests d'Accessibilité

### Navigation Clavier

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| A.1 | Tab navigation | 🔄 | CRITIQUE | Ordre logique |
| A.2 | Shift+Tab backward | 🔄 | HAUTE | |
| A.3 | Enter pour valider | 🔄 | CRITIQUE | Formulaires |
| A.4 | Esc pour fermer modals | 🔄 | HAUTE | |
| A.5 | Flèches dans selects | 🔄 | HAUTE | |
| A.6 | Skip to content | ❌ | MOYENNE | **MANQUANT** |
| A.7 | Focus visible | 🔄 | CRITIQUE | Outline |

### Sémantique HTML

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| A.8 | Headings hiérarchie | 🔄 | HAUTE | h1 → h2 → h3 |
| A.9 | Landmarks (nav, main) | 🔄 | HAUTE | |
| A.10 | Alt text images | 🔄 | CRITIQUE | |
| A.11 | Labels formulaires | 🔄 | CRITIQUE | |
| A.12 | ARIA labels boutons icônes | 🔄 | HAUTE | |
| A.13 | ARIA live regions | ❌ | MOYENNE | Alertes |

### Lecteurs d'Écran

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| A.14 | NVDA (Windows) | ❌ | HAUTE | |
| A.15 | JAWS (Windows) | ❌ | BASSE | |
| A.16 | VoiceOver (Mac) | ❌ | MOYENNE | |
| A.17 | Annonces toast | ❌ | HAUTE | |
| A.18 | Annonces erreurs | 🔄 | CRITIQUE | |

### Contraste

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| A.19 | Texte sur fond | 🔄 | CRITIQUE | ≥ 4.5:1 (WCAG AA) |
| A.20 | Badges statuts | 🔄 | HAUTE | |
| A.21 | Liens vs texte | 🔄 | HAUTE | |
| A.22 | Disabled states | 🔄 | MOYENNE | |

---

## 🐛 Tests Edge Cases

### Données Limites

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| E.1 | Marché sans cautions | 🔄 | HAUTE | |
| E.2 | Marché sans documents | 🔄 | HAUTE | |
| E.3 | Marché sans véhicules | 🔄 | HAUTE | |
| E.4 | Caution sans document scan | 🔄 | HAUTE | |
| E.5 | Véhicule sans marché | 🔄 | HAUTE | |
| E.6 | Document sans marché | 🔄 | MOYENNE | |
| E.7 | Texte très long (objet marché) | 🔄 | HAUTE | Truncate ? |
| E.8 | Montant 0 | 🔄 | HAUTE | Validation ? |
| E.9 | Dates dans le passé lointain | 🔄 | MOYENNE | |
| E.10 | Dates dans le futur lointain | 🔄 | MOYENNE | |

### Erreurs Réseau

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| E.11 | Offline (service worker ?) | ❌ | BASSE | |
| E.12 | Timeout requête | 🔄 | HAUTE | |
| E.13 | 500 serveur | 🔄 | HAUTE | |
| E.14 | 404 route | 🔄 | HAUTE | |
| E.15 | Upload interrompu | 🔄 | HAUTE | |

### Concurrence

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| E.16 | Modification simultanée | ❌ | MOYENNE | 2 users |
| E.17 | Suppression pendant consultation | ❌ | HAUTE | |
| E.18 | Upload même fichier 2x | 🔄 | MOYENNE | |

### Navigateurs

| # | Test | Statut | Priorité | Notes |
|---|------|--------|----------|-------|
| E.19 | Chrome (dernier) | 🔄 | CRITIQUE | |
| E.20 | Firefox (dernier) | 🔄 | HAUTE | |
| E.21 | Safari (dernier) | 🔄 | HAUTE | Mac/iOS |
| E.22 | Edge (dernier) | 🔄 | MOYENNE | |
| E.23 | Chrome mobile | 🔄 | CRITIQUE | Android |
| E.24 | Safari mobile | 🔄 | CRITIQUE | iOS |

---

## ✅ Améliorations Identifiées

### 🔴 Priorité CRITIQUE

1. **Alertes Automatiques (Cron)**
   - Créer route API `/api/cron/alertes`
   - Configurer Vercel Cron Job
   - Implémenter logique détection échéances
   - Génération emails HTML
   - Envoi via Nodemailer

2. **Récupération Mot de Passe**
   - Page "Mot de passe oublié"
   - Génération token reset
   - Email avec lien reset
   - Page reset password

3. **Error Boundaries React**
   - Composant ErrorBoundary global
   - Pages erreur personnalisées (404, 500)
   - Logs erreurs client

4. **Validation Format Immatriculation**
   - Regex format FR (AB-123-CD)
   - Validation côté serveur et client

### 🟠 Priorité HAUTE

5. **Recherche Textuelle**
   - Marchés : numéro, objet, autorité
   - Cautions : référence, banque
   - Documents : nom, description
   - Véhicules : immatriculation, marque, modèle

6. **Pagination**
   - Marchés (si > 50)
   - Cautions (si > 50)
   - Documents (si > 50)
   - Véhicules (si > 50)
   - Cursor-based ou offset ?

7. **Progress Bar Upload**
   - Feedback visuel upload
   - Pourcentage progression
   - Possibilité annuler

8. **Timeline Entité**
   - Timeline marché (historique statuts)
   - Timeline véhicule (livraison → réception)
   - Timeline caution

9. **Sauvegarde Brouillon**
   - LocalStorage ou DB ?
   - Auto-save formulaires longs
   - Restauration brouillon

10. **Export PDF**
    - Fiche marché PDF
    - Fiche véhicule PDF
    - Caution PDF

### 🟡 Priorité MOYENNE

11. **Tri Colonnes Tableaux**
    - Tri ascendant/descendant
    - Multi-colonnes

12. **Upload Multiple Fichiers**
    - Drag & drop zone
    - Sélection multiple
    - Upload batch

13. **Restauration Documents**
    - Liste docs supprimés (soft delete)
    - Bouton restaurer
    - Suppression définitive (ADMIN)

14. **Skeleton Loaders**
    - Dashboard
    - Listes
    - Formulaires

15. **Historique Modifications**
    - Audit trail marchés
    - Qui a modifié quoi et quand

16. **Indicateur Rôle Utilisateur**
    - Badge rôle dans menu utilisateur
    - Couleur par rôle

17. **Profil Utilisateur**
    - Page profil
    - Changement mot de passe
    - Paramètres utilisateur

18. **Notifications In-App**
    - Bell icon avec compteur
    - Liste notifications
    - Mark as read

### 🟢 Priorité BASSE

19. **Monitoring (Sentry)**
    - Intégration Sentry
    - Tracking erreurs prod

20. **Logging Serveur**
    - Winston ou Pino
    - Logs structurés

21. **Optimistic Updates**
    - Actions instantanées UI
    - Rollback si erreur

22. **Lazy Loading Images**
    - Documents (preview)
    - Next.js Image component

23. **Export Multi-Sheets**
    - Tout exporter en 1 fichier Excel
    - Sheets : Marchés, Cautions, Véhicules

---

## 📊 Implications UX/UI

### 1. Navigation & Structure

**Problèmes Potentiels** :
- Manque de breadcrumb sur certaines pages
- Menu mobile peut être amélioré (animations)
- Pas d'indicateur de page active clair

**Impact UX** :
- 🟠 **Moyen** : Utilisateurs peuvent se perdre dans l'arborescence
- Navigation moins intuitive sur mobile

**Solutions** :
1. Breadcrumb systématique sur toutes les pages de détail/édition
2. Highlight menu item actif (background color)
3. Animations menu mobile (slide-in/out)

**Effort** : 🟢 Faible (2-3h)

---

### 2. Feedback Utilisateur

**Problèmes Potentiels** :
- Pas de progress bar uploads
- Pas de skeleton loaders (flash de contenu vide)
- Toasts peuvent être manqués (durée trop courte ?)

**Impact UX** :
- 🔴 **Fort** : Utilisateurs ne savent pas si action en cours
- Frustration sur uploads longs
- Perception de lenteur

**Solutions** :
1. Progress bar avec pourcentage pour uploads
2. Skeleton loaders partout (dashboard, listes)
3. Durée toast configurable (succès 3s, erreur 5s)
4. Optimistic updates pour actions rapides

**Effort** : 🟡 Moyen (1 jour)

---

### 3. Formulaires

**Problèmes Potentiels** :
- Champs conditionnels peuvent être confus (apparition/disparition)
- Validation inline pas toujours claire
- Pas de sauvegarde brouillon (perte données si refresh)

**Impact UX** :
- 🟠 **Moyen** : Frustration perte données
- Temps de saisie long sans sauvegarde

**Solutions** :
1. Animation smooth pour champs conditionnels
2. Messages validation inline sous chaque champ
3. Auto-save brouillon toutes les 30s
4. Confirmation avant quitter page si formulaire modifié

**Effort** : 🟡 Moyen (1 jour)

---

### 4. Tableaux & Listes

**Problèmes Potentiels** :
- Pas de tri colonnes
- Pas de pagination (problème si > 100 items)
- Horizontal scroll mobile pas évident

**Impact UX** :
- 🟠 **Moyen** : Difficile de trouver données spécifiques
- Performance dégradée avec beaucoup de données

**Solutions** :
1. Tri ascendant/descendant sur toutes les colonnes pertinentes
2. Pagination avec sélecteur 10/25/50/100 items
3. Sticky headers tableaux mobile
4. Indicateur scroll horizontal (shadow)

**Effort** : 🟡 Moyen (1 jour)

---

### 5. Recherche

**Problèmes Potentiels** :
- Pas de recherche textuelle globale
- Filtres statiques (pas de combinaisons avancées)
- Pas de sauvegarde recherches fréquentes

**Impact UX** :
- 🔴 **Fort** : Difficile de trouver un marché/caution spécifique
- Temps perdu à naviguer

**Solutions** :
1. Barre recherche globale (Cmd+K)
2. Recherche plein texte sur chaque module
3. Filtres combinables (ET/OU)
4. Suggestions autocomplétion
5. Recherches sauvegardées (favoris)

**Effort** : 🔴 Élevé (2-3 jours)

---

### 6. Responsive Design

**Problèmes Potentiels** :
- Formulaires longs difficilement utilisables sur mobile
- Tableaux difficiles à lire (scroll horizontal)
- Graphiques dashboard peuvent être trop petits

**Impact UX** :
- 🟠 **Moyen** : Frustration utilisateurs mobiles
- Peut forcer utilisation desktop uniquement

**Solutions** :
1. Formulaires stacked sur mobile (1 colonne)
2. Tableaux en cards sur mobile (mode liste)
3. Graphiques responsive avec labels adaptatifs
4. Boutons actions en bas sticky sur mobile

**Effort** : 🟡 Moyen (1-2 jours)

---

### 7. Accessibilité

**Problèmes Potentiels** :
- Navigation clavier perfectible
- Pas de skip to content
- Annonces lecteurs d'écran manquantes
- Contrastes à vérifier

**Impact UX** :
- 🟠 **Moyen** : Utilisateurs avec handicap exclus
- Non-conformité WCAG

**Solutions** :
1. Skip to content link
2. ARIA live regions pour toasts
3. ARIA labels sur tous les boutons icônes
4. Test contraste automatique (eslint-plugin-jsx-a11y)
5. Focus trap dans modals

**Effort** : 🟡 Moyen (1 jour)

---

### 8. Cohérence Visuelle

**Problèmes Potentiels** :
- Espacements peuvent varier
- Tailles boutons/badges pas toujours cohérentes
- Couleurs statuts à standardiser

**Impact UX** :
- 🟢 **Faible** : Perçu comme moins professionnel
- Courbe d'apprentissage légèrement plus longue

**Solutions** :
1. Design tokens (Tailwind config)
2. Documentation design system
3. Audit visuel complet
4. Standardisation badges statuts

**Effort** : 🟢 Faible (1 jour)

---

## ⚙️ Implications Techniques

### 1. Alertes Automatiques (Cron)

**Architecture** :
```
Vercel Cron Job (quotidien, 7h)
   ↓
/api/cron/alertes (API Route)
   ↓
Vérification CRON_SECRET
   ↓
Prisma : Requêtes cautions/marchés
   ↓
Détection échéances (< 7j, < 30j, < 60j)
   ↓
Génération emails HTML (React Email ?)
   ↓
Envoi Nodemailer (SMTP)
   ↓
Logs (DB table AlertLog ?)
```

**Dépendances Requises** :
- `nodemailer` (déjà installé ?)
- `@react-email/components` (optionnel, pour templates)
- Variables env : `CRON_SECRET`, `SMTP_*` (déjà configurées)

**Configuration Vercel** :
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/alertes",
    "schedule": "0 7 * * *"
  }]
}
```

**Sécurité** :
- Vérifier `CRON_SECRET` dans headers
- Rate limiting (éviter abus)
- Logs d'envoi (table AlertLog)

**Effort** : 🔴 Élevé (1 jour)

**Risques** :
- SMTP peut échouer (Gmail, rate limits)
- Emails spam (SPF/DKIM à configurer)
- Performance (beaucoup de cautions)

---

### 2. Recherche Textuelle

**Approches Possibles** :

#### Option A : Recherche SQL Simple (Prisma)
```typescript
// Avantage : Simple, pas de dépendance
// Inconvénient : Performance limitée, pas de ranking

await prisma.marche.findMany({
  where: {
    OR: [
      { numero: { contains: query, mode: 'insensitive' } },
      { objet: { contains: query, mode: 'insensitive' } },
      { autoriteContractanteNom: { contains: query, mode: 'insensitive' } }
    ]
  }
})
```

**Effort** : 🟢 Faible (4h)
**Performance** : 🟡 Moyenne (OK jusqu'à 1000 enregistrements)

#### Option B : Full-Text Search PostgreSQL
```sql
-- Avantage : Performant, ranking, accents
-- Inconvénient : Setup index, migrations

ALTER TABLE marches ADD COLUMN search_vector tsvector;
CREATE INDEX idx_marches_search ON marches USING GIN(search_vector);

-- Prisma raw query
await prisma.$queryRaw`
  SELECT * FROM marches
  WHERE search_vector @@ plainto_tsquery('french', ${query})
  ORDER BY ts_rank(search_vector, plainto_tsquery('french', ${query})) DESC
`
```

**Effort** : 🟡 Moyen (1 jour)
**Performance** : 🟢 Élevée (jusqu'à 100K enregistrements)

#### Option C : Algolia / MeiliSearch (SaaS)
```typescript
// Avantage : Très performant, typo-tolerance, facettes
// Inconvénient : Coût, dépendance externe, sync DB

import { MeiliSearch } from 'meilisearch'
const client = new MeiliSearch({ host, apiKey })
await client.index('marches').search(query)
```

**Effort** : 🔴 Élevé (2 jours + sync)
**Performance** : 🟢 Excellente
**Coût** : 💰 $29/mois (MeiliSearch Cloud)

**Recommandation** : **Option A** pour MVP, **Option B** si > 1000 marchés

---

### 3. Pagination

**Architecture** :

#### Option A : Offset-Based
```typescript
// Avantage : Simple, page numbers
// Inconvénient : Performance dégradée avec offset élevé

const page = parseInt(searchParams.page) || 1
const pageSize = parseInt(searchParams.pageSize) || 25

const [marches, total] = await Promise.all([
  prisma.marche.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize
  }),
  prisma.marche.count()
])
```

**Effort** : 🟢 Faible (4h)

#### Option B : Cursor-Based
```typescript
// Avantage : Performance constante, infinite scroll
// Inconvénient : Pas de page numbers

const marches = await prisma.marche.findMany({
  take: 25,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined
})
```

**Effort** : 🟡 Moyen (1 jour)

**Recommandation** : **Option A** (offset) pour interface standard avec numéros de pages

**Composants UI** :
- `components/ui/pagination.tsx` (shadcn)
- Sélecteur page size (10/25/50/100)
- Info "Affichage X-Y de Z résultats"

---

### 4. Upload Multiple & Progress

**Architecture** :
```typescript
// Client
const uploadFiles = async (files: File[]) => {
  const formData = new FormData()
  files.forEach(file => formData.append('files', file))

  const xhr = new XMLHttpRequest()
  xhr.upload.onprogress = (e) => {
    setProgress(Math.round((e.loaded / e.total) * 100))
  }
  xhr.open('POST', '/api/upload')
  xhr.send(formData)
}

// Server Action
export async function uploadMultipleDocuments(formData: FormData) {
  const files = formData.getAll('files') as File[]

  const results = await Promise.all(
    files.map(file => uploadToSupabase(file))
  )

  return { success: true, uploaded: results }
}
```

**Composant UI** :
```tsx
<UploadZone
  multiple
  onProgress={(percent) => setProgress(percent)}
  onComplete={(files) => toast.success(`${files.length} fichiers uploadés`)}
/>
```

**Dépendances** :
- `react-dropzone` (drag & drop)
- Pas de lib supplémentaire pour progress (XMLHttpRequest natif)

**Effort** : 🟡 Moyen (1 jour)

---

### 5. Export PDF

**Approches** :

#### Option A : @react-pdf/renderer (déjà dans package.json)
```typescript
import { Document, Page, Text, View, pdf } from '@react-pdf/renderer'

const MarchePDF = ({ marche }) => (
  <Document>
    <Page>
      <View>
        <Text>Marché {marche.numero}</Text>
        {/* ... */}
      </View>
    </Page>
  </Document>
)

// Server Action
const blob = await pdf(<MarchePDF marche={marche} />).toBlob()
```

**Avantage** : Déjà installé, syntaxe React
**Inconvénient** : Styling limité
**Effort** : 🟡 Moyen (1 jour pour templates)

#### Option B : Puppeteer (headless Chrome)
```typescript
import puppeteer from 'puppeteer'

const browser = await puppeteer.launch()
const page = await browser.newPage()
await page.goto(`${process.env.APP_URL}/marches/${id}/print`)
const pdf = await page.pdf()
```

**Avantage** : Rendu HTML parfait
**Inconvénient** : Coût Vercel (serverless function size)
**Effort** : 🟡 Moyen

**Recommandation** : **Option A** (@react-pdf/renderer)

---

### 6. Récupération Mot de Passe

**Flux** :
1. Page "Mot de passe oublié"
2. User saisit email
3. Server génère token unique (crypto.randomBytes)
4. Stockage token en DB (table `PasswordReset`)
5. Envoi email avec lien `/reset-password?token=xxx`
6. User clique lien, saisit nouveau password
7. Validation token (expiré < 1h ?)
8. Update password, suppression token

**Schema Prisma** :
```prisma
model PasswordReset {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([token])
}
```

**Sécurité** :
- Token crypto-safe (32 bytes)
- Expiration 1h
- Rate limiting (max 3 demandes/heure)
- Supprimer tokens après utilisation

**Effort** : 🟡 Moyen (1 jour)

---

### 7. Error Boundaries & Monitoring

**Architecture** :
```tsx
// app/error.tsx (Next.js 15 error boundary)
'use client'

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <div>
      <h2>Une erreur est survenue</h2>
      <button onClick={reset}>Réessayer</button>
    </div>
  )
}

// app/global-error.tsx (fallback global)
export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body>
        <h2>Erreur critique</h2>
      </body>
    </html>
  )
}
```

**Sentry Setup** :
```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
})
```

**Effort** : 🟢 Faible (4h)
**Coût Sentry** : Gratuit jusqu'à 5K events/mois

---

### 8. Performance & Optimizations

**Optimisations Rapides** :

1. **Next.js Image Component**
```tsx
// Au lieu de <img>
import Image from 'next/image'

<Image
  src={doc.storageUrl}
  alt={doc.nom}
  width={200}
  height={150}
  loading="lazy"
/>
```

2. **React Server Components**
```tsx
// Déjà utilisé, mais vérifier :
// - Pas d'état client inutile
// - Fetch data au niveau page, pas composant
// - Streaming avec Suspense
```

3. **Prisma Includes Optimisés**
```typescript
// ❌ Mauvais (N+1)
const marches = await prisma.marche.findMany()
for (const m of marches) {
  m.cautions = await prisma.caution.findMany({ where: { marcheId: m.id } })
}

// ✅ Bon (1 query)
const marches = await prisma.marche.findMany({
  include: {
    cautions: true,
    documents: true
  }
})
```

4. **Debounce Search**
```typescript
// Déjà implémenté (useDebounce 300ms) ✅
```

5. **Bundle Analysis**
```bash
npm run build -- --analyze
# Identifier grosses dépendances
# Lazy load composants lourds
```

**Effort Total** : 🟢 Faible (1 jour)

---

### 9. Rate Limiting

**Approche** :
```typescript
// middleware.ts ou API route
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // max 100 requests per windowMs
})

// Ou solution Next.js native avec Upstash Redis
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s')
})
```

**Effort** : 🟡 Moyen (1 jour)
**Coût** : Gratuit (Upstash 10K requests/jour)

---

### 10. Tests E2E (Playwright)

**Structure** :
```typescript
// tests/e2e/marches.spec.ts
import { test, expect } from '@playwright/test'

test('créer un marché complet', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name=email]', 'admin@erp-marches.local')
  await page.fill('[name=password]', 'Admin123!')
  await page.click('button[type=submit]')

  await page.goto('/marches/nouveau')
  await page.fill('[name=numero]', 'M-TEST-001')
  // ...
  await page.click('button[type=submit]')

  await expect(page).toHaveURL(/\/marches\/[a-z0-9]+/)
})
```

**Coverage Cible** :
- ✅ Auth flow (login/logout)
- ✅ CRUD marchés
- ✅ CRUD cautions
- ✅ Upload document
- ✅ Exports Excel
- ✅ Permissions RBAC

**Effort** : 🔴 Élevé (3-4 jours)

---

## 📝 Synthèse & Recommandations

### Tâches Immédiates (Sprint 1 - 3 jours)

1. ✅ **Tests Manuels Complets** (1 jour)
   - Suivre ce plan de test
   - Documenter bugs trouvés
   - Prioriser correctifs

2. 🔴 **Alertes Automatiques** (1 jour)
   - Route API Cron
   - Configuration Vercel
   - Templates emails

3. 🟠 **Recherche Textuelle** (0.5 jour)
   - Option A (Prisma simple)
   - Sur marchés/cautions/véhicules

4. 🟠 **Pagination** (0.5 jour)
   - Offset-based
   - Composant UI shadcn

### Sprint 2 (4 jours)

5. 🟠 **Upload Multiple & Progress** (1 jour)
6. 🟠 **Export PDF** (1 jour)
7. 🟠 **Récupération Password** (1 jour)
8. 🟠 **Error Boundaries** (0.5 jour)
9. 🟠 **Timeline Entités** (0.5 jour)

### Sprint 3 (3 jours)

10. 🟡 **Profil Utilisateur** (0.5 jour)
11. 🟡 **Sauvegarde Brouillon** (1 jour)
12. 🟡 **Skeleton Loaders** (0.5 jour)
13. 🟡 **Tri Colonnes** (0.5 jour)
14. 🟡 **Tests E2E Playwright** (0.5 jour setup initial)

### Backlog (Après MVP+)

15. 🟢 **Monitoring Sentry**
16. 🟢 **Logging Structuré**
17. 🟢 **Rate Limiting**
18. 🟢 **Optimistic Updates**
19. 🟢 **Historique Modifications**

---

## 🎯 Prochaines Étapes

1. **Exécuter Tests Manuels** (suivre ce plan)
2. **Créer Issues GitHub** pour chaque bug/amélioration
3. **Prioriser** avec l'équipe métier
4. **Planifier Sprint 1**

---

**Document vivant** - Mettre à jour au fur et à mesure des tests et implémentations.
