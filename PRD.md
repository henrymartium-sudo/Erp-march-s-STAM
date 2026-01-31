# Application de gestion et de suivi des marchés publics  
## Côté soumissionnaire – Secteur automobile

---

## 1. Objectif général de l’application

Construire une application dédiée à la **gestion complète du cycle de vie des marchés publics**, côté **soumissionnaire**, spécialisée dans :

- la fourniture de **véhicules neufs**,
- les **contrats de maintenance et d’entretien**,
- avec un fort accent sur la **sécurisation de l’exécution contractuelle**, la **gestion des cautions** et la **réduction des risques opérationnels**.

L’application vise à :
- centraliser l’information,
- réduire les erreurs et oublis,
- accélérer la réponse aux appels d’offres,
- sécuriser l’exécution des marchés,
- fournir des outils d’aide à la décision à moyen et long terme.

---

## 2. Périmètre métier

### 2.1 Type de marchés
- Marchés ponctuels
- Marchés en continu
- Intervention quasi exclusive en tant que **titulaire**
- Pas de groupement ni de sous-traitance (possibilité future)

### 2.2 Nature des prestations
- Fourniture de véhicules neufs exclusivement
- Contrats :
  - maintenance
  - entretien
- Contrats mixtes : rares mais possibles

### 2.3 Typologie contractuelle
- Marchés à bons de commande
- Marchés à tranches (fermes / conditionnelles)
- Reconduction tacite : possible à l’avenir

---

## 3. Principes directeurs de conception

### Principe n°1 — Donnée maîtrisée
Toute information doit être :
- structurée,
- rattachée à un marché et à une phase,
- traçable dans le temps,
- filtrable.

### Principe n°2 — Exploitabilité
Toute donnée saisie doit pouvoir être :
- affichée dans un tableau de bord,
- utilisée dans un rapport,
- exportée,
- comparée dans le temps,
- réimportée sous forme structurée.

---

## 4. Utilisateurs et rôles

- **Administrateur complet** (ex. responsable marchés)
- **Utilisateur avancé** (équipe passation)
- **Utilisateur exploitation** (garantie technique, exécution)
- **Visiteur** (DG, direction – lecture seule)

Les droits sont différenciés par :
- lecture / écriture,
- accès aux rapports,
- accès aux paramètres.

---

## 5. Architecture fonctionnelle (vue d’ensemble)

### Blocs fonctionnels principaux
1. Référentiel Marché
2. Veille & opportunités
3. Cycle de vie et statuts
4. Dossier administratif
5. Cautions & garanties
6. Exécution du marché (véhicules)
7. Facturation (traçabilité)
8. Documents & médias
9. Tableaux de bord & alertes
10. Reporting & analyses
11. Import / export de données
12. Paramètres & identification

---

## 6. Filtres (transversal)

Chaque écran listant des données doit proposer des filtres, notamment :
- marché,
- statut,
- période (dates),
- autorité contractante,
- type de marché,
- responsable interne.

Les filtres doivent être cohérents entre :
- affichage,
- rapports,
- exports,
- extractions.

---

## 7. Gestion des documents et médias

### Types de médias
- DAO / DRP
- Offres déposées
- Courriers (attribution, rejet, résiliation)
- Cautions bancaires scannées
- Attestations de bonne fin

### Règles
- Chaque document est rattaché à :
  - un marché,
  - une phase,
  - un type.
- Versioning et historique conservés.
- Dates de validité suivies avec alertes.

---

## 8. Gestion des cautions et garanties (objet métier central)

Types gérés :
- Caution de soumission
- Caution de capacité financière
- Caution de bonne exécution
- Caution d’avance de démarrage
- Caution de retenue de garantie

Attributs :
- marché associé
- phase du marché
- banque
- montant
- date d’émission
- date d’expiration
- statut (active / à libérer / libérée)

---

## 9. Cycle de vie du marché (statuts)

Statuts possibles :
1. Opportunité identifiée
2. Dossier en préparation
3. Offre déposée
4. En attente d’attribution
5. Attribué provisoirement
6. Attribué définitivement
7. En attente de livraison / OS
8. En exécution
9. Exécuté – en attente garanties
10. Clôturé
11. Résilié / annulé / infructueux

---

## 10. Reporting, analyses et exports

### Niveaux de reporting
- **Opérationnel** : suivi quotidien, risques, délais
- **Managérial** : volume de marchés, taux de succès
- **Stratégique** : comparaisons annuelles, tendances

### Périodes
- mensuelle
- trimestrielle
- semestrielle
- annuelle
- multi-annuelle comparative

### Formats
- PDF (lecture, partage)
- Excel (analyse, retraitement)

---

## 11. Import / export de données

### Exports
- données filtrées (marchés, cautions, documents)
- extraction brute pour audit ou analyse externe

### Imports / téléversement
- marchés historiques
- cautions
- documents
- mises à jour en masse

Avec :
- prévisualisation,
- validation,
- traçabilité des imports.

---

## 12. Paramètres et identification

- Gestion des utilisateurs et rôles
- Paramètres globaux (types de marchés, types de cautions, statuts)
- Prévu dès la conception (même si enrichi plus tard)

---

## 13. Règles de développement

### Utilisation systématique de Context7

**Règle obligatoire** : Toujours utiliser Context7 lorsque nécessaire pour :
- la génération de code,
- les étapes de configuration ou d'installation,
- la documentation de bibliothèque/API.

Cela signifie que Claude doit **automatiquement** :
1. Utiliser l'outil MCP Context7 `resolve-library-id` pour résoudre l'identifiant de bibliothèque
2. Utiliser l'outil MCP Context7 `query-docs` pour obtenir la documentation de bibliothèque à jour

**Sans que l'utilisateur ait à le demander explicitement.**

Cette règle garantit :
- l'utilisation de documentation à jour,
- des exemples de code conformes aux dernières versions,
- des configurations et installations correctes,
- une cohérence dans l'implémentation des bibliothèques tierces.

---

# 14. Roadmap produit

## MVP — Fonctionner sans risque
- Référentiel marché
- Statuts essentiels
- Dossier administratif
- Cautions & garanties
- Exécution véhicules (livraison, réceptions)
- Documents & médias
- Tableaux de bord simples
- Gestion utilisateurs basique

## V1 — Professionnaliser
- Veille & opportunités
- Montage de l’offre
- Statuts avancés
- Facturation (traçabilité)
- Filtres avancés
- Exports simples (PDF / Excel)
- Alertes email automatiques

## V2 — Piloter et décider
- Reporting avancé
- Comparaisons multi-annuelles
- Import de données
- Tableaux de bord personnalisables
- Capitalisation et analyses stratégiques
- Exécution maintenance (optionnelle)

## Hors-périmètre
- Comptabilité et paiements bancaires réels
- Signature électronique
- Gestion des groupements
- Portail autorité contractante
- IA prédictive
- Intégrations ERP lourdes

---

## 15. Finalité du produit

L’application n’est pas un simple outil de suivi, mais :

> **un système de maîtrise du risque contractuel, opérationnel et documentaire pour un soumissionnaire automobile.**

---
