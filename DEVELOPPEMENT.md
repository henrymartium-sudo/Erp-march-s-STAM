# Guide de Développement - ERP Marchés Publics

## 🚀 Démarrage Rapide

### Démarrer le serveur de développement

```bash
# Option 1 : Démarrage normal
npm run dev

# Option 2 : Démarrage avec nettoyage automatique (recommandé)
npm run dev:clean
```

Le serveur sera accessible sur : **http://localhost:3000**

## 🧹 Nettoyage et Maintenance

### Scripts de nettoyage disponibles

```bash
# Nettoyer tous les processus Node.js
npm run clean

# Ou utiliser le script batch (Windows)
.\scripts\clean-dev.bat
```

### Commandes de base de données

```bash
# Générer le Prisma Client
npm run db:generate

# Pousser le schéma vers la BDD (développement)
npm run db:push

# Appliquer les migrations (production)
npm run db:migrate

# Ouvrir Prisma Studio (interface graphique)
npm run db:studio
```

## 🔧 Résolution de Problèmes

### Port 3000 déjà utilisé

Si vous voyez ce message :
```
Port 3000 is in use by process XXXX, using available port 3001 instead.
```

**Solution :**
```bash
npm run clean
npm run dev
```

### Erreur de connexion à la base de données (ECONNREFUSED)

**Solution :**
```bash
npm run db:generate
npm run db:migrate
```

### Le serveur ne répond pas

1. Arrêter tous les processus Node.js
2. Vérifier que le port 3000 est libre
3. Redémarrer proprement

```bash
npm run dev:clean
```

## 📁 Structure des Routes

```
/                        → Redirige vers /marches
/marches                 → Liste des marchés
/marches/nouveau         → Créer un nouveau marché
/marches/[id]            → Détail d'un marché
/marches/[id]/edit       → Éditer un marché
```

## 🛠️ Workflow de Développement Recommandé

### Avant de commencer une session

1. Nettoyer l'environnement
   ```bash
   npm run clean
   ```

2. Mettre à jour les dépendances si nécessaire
   ```bash
   npm install
   ```

3. Vérifier que la base de données est à jour
   ```bash
   npm run db:generate
   ```

4. Démarrer le serveur
   ```bash
   npm run dev
   ```

### Après le développement

- Les processus Node.js seront automatiquement arrêtés à la fermeture du terminal
- Si vous devez arrêter manuellement : `Ctrl + C` ou `npm run clean`

## 📋 Bonnes Pratiques

- ✅ Toujours utiliser `npm run dev:clean` pour démarrer une nouvelle session
- ✅ Vérifier que le port 3000 est libre avant de démarrer
- ✅ Régénérer le Prisma Client après modification du schéma
- ✅ Tester sur mobile/tablette pendant le développement (responsive)
- ✅ Suivre les guidelines de CLAUDE.md et PRD.md

## 🔗 Références

- [PRD.md](./PRD.md) - Spécifications produit
- [CLAUDE.md](./CLAUDE.md) - Guide de développement avec Claude
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Documentation technique

---

**Dernière mise à jour** : 2026-01-31
