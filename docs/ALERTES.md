# Système d'Alertes Automatiques

Ce document décrit le système d'alertes automatiques de l'ERP Marchés STAM.

## 📋 Vue d'ensemble

Le système envoie automatiquement des emails quotidiens pour signaler :

1. **Cautions proches de l'échéance** (< 30 jours)
   - Cautions actives sans mainlevée
   - Montant et date d'échéance
   - Référence du marché associé

2. **Marchés en fin d'exécution** (< 60 jours)
   - Marchés en cours d'exécution
   - Statuts concernés : EN_COURS_EXECUTION, NOTIFICATION, RECEPTION_PROVISOIRE

## ⚙️ Configuration

### Variables d'environnement requises

Ajouter ces variables dans Vercel (Settings > Environment Variables) :

```env
# Configuration SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-application
SMTP_FROM="ERP Marchés STAM <noreply@votredomaine.com>"

# Destinataires des alertes (séparés par virgule)
ALERT_EMAIL_TO="responsable1@example.com,responsable2@example.com"

# Sécurité du cron job
CRON_SECRET=votre-secret-aleatoire-genere
```

### Générer CRON_SECRET

```bash
# Linux/Mac
openssl rand -hex 32

# Windows (PowerShell)
[Convert]::ToBase64String([byte[]]$(Get-Random -Count 32))

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Configuration Gmail

1. Activer la validation en 2 étapes sur votre compte Google
2. Créer un mot de passe d'application :
   - Aller sur https://myaccount.google.com/apppasswords
   - Sélectionner "Autre" et entrer "ERP STAM"
   - Copier le mot de passe généré dans `SMTP_PASS`

## 🕐 Planification

Le cron job est configuré dans `vercel.json` :

```json
{
  "crons": [{
    "path": "/api/cron/daily-alerts",
    "schedule": "0 7 * * 1-5"
  }]
}
```

### Format du cron expression

```
┌───────────── minute (0-59)
│ ┌───────────── heure (0-23)
│ │ ┌───────────── jour du mois (1-31)
│ │ │ ┌───────────── mois (1-12)
│ │ │ │ ┌───────────── jour de la semaine (0-6, 0=dimanche)
│ │ │ │ │
* * * * *
```

**Configuration actuelle** : `0 7 * * 1-5`
- **7h UTC** (8h heure de Paris/France)
- **Du lundi au vendredi** uniquement
- **Tous les jours du mois**
- **Tous les mois**

### Modifier l'horaire

Exemples de configurations :

```json
// Tous les jours à 8h (France) = 7h UTC
"schedule": "0 7 * * *"

// Tous les jours ouvrés à 9h (France) = 8h UTC
"schedule": "0 8 * * 1-5"

// Deux fois par jour (8h et 17h France) = 7h et 16h UTC
"schedule": "0 7,16 * * 1-5"

// Tous les lundis à 8h (France) = 7h UTC
"schedule": "0 7 * * 1"
```

**Important** : Vercel Cron utilise le **fuseau horaire UTC**. Ajuster en conséquence :
- France (UTC+1 hiver / UTC+2 été) : soustraire 1 ou 2 heures

## 🧪 Tests

### Test local (sans envoyer d'email)

```bash
# Démarrer le serveur de développement
npm run dev

# Tester la détection des alertes (retourne JSON, n'envoie pas d'email)
curl http://localhost:3000/api/test-alerts
```

### Test avec envoi d'email

```bash
# Ajouter les variables SMTP dans .env
# Puis appeler l'API avec le CRON_SECRET

curl -H "Authorization: Bearer votre-cron-secret" \
  http://localhost:3000/api/cron/daily-alerts
```

### Créer des données de test

Pour tester les alertes, créer des données avec des échéances proches :

```typescript
// Dans Prisma Studio ou via un script
// Caution qui expire dans 15 jours
await prisma.caution.create({
  data: {
    reference: "TEST-CAUTION-001",
    type: "DEFINITIVE",
    montant: 50000,
    dateEmission: new Date(),
    dateEcheance: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // +15j
    marcheId: "...",
  }
});

// Marché qui se termine dans 45 jours
await prisma.marche.create({
  data: {
    reference: "TEST-MARCHE-001",
    objet: "Test marché",
    montant: 100000,
    dateNotification: new Date(),
    dateFinExecution: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // +45j
    statut: "EN_COURS_EXECUTION",
    // ... autres champs
  }
});
```

## 📊 Monitoring

### Logs Vercel

Consulter les logs des cron jobs :

```bash
# CLI Vercel
vercel logs --follow

# Ou via l'interface web
# https://vercel.com/[votre-team]/[votre-projet]/logs
```

### Logs de l'API route

L'API route `/api/cron/daily-alerts` log automatiquement :

```
✅ Cron job terminé avec succès en 1234ms
   - 3 caution(s) alertée(s)
   - 2 marché(s) alerté(s)
```

### Vérifier les exécutions

Vercel Dashboard > Project > Cron Jobs :
- Historique des exécutions
- Statut (success/failure)
- Durée d'exécution
- Logs détaillés

## 🔒 Sécurité

1. **CRON_SECRET** : Seules les requêtes avec le bon Bearer token peuvent déclencher le cron
2. **SMTP_PASS** : Stocker uniquement dans les variables d'environnement Vercel (jamais dans le code)
3. **SMTP_FROM** : Utiliser une adresse `noreply@` dédiée
4. **ALERT_EMAIL_TO** : Limiter aux adresses email officielles de l'entreprise

## 🚨 Troubleshooting

### Email non reçu

1. **Vérifier les logs Vercel** : Y a-t-il des erreurs ?
2. **Vérifier SMTP_PASS** : Mot de passe d'application valide ?
3. **Vérifier ALERT_EMAIL_TO** : Adresses correctes ?
4. **Vérifier le dossier spam** : L'email peut être filtré

### Cron ne se déclenche pas

1. **Vérifier vercel.json** : Fichier présent et valide ?
2. **Vérifier le déploiement** : Le cron est configuré après déploiement ?
3. **Vérifier l'horaire** : Convertir UTC correctement ?
4. **Consulter Vercel Dashboard** : Cron Jobs > Logs

### Erreur 401 Unauthorized

- Vérifier que `CRON_SECRET` est bien configuré dans Vercel
- Le secret doit être identique dans `.env` local et dans Vercel

### Erreur SMTP

```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Solution** : Utiliser un mot de passe d'application Gmail (pas le mot de passe du compte)

## 📧 Template des emails

Les emails contiennent :

- **En-tête** : Logo + Date du jour
- **Section cautions** : Liste des cautions proches échéance avec badges orange
- **Section marchés** : Liste des marchés en fin d'exécution avec badges rouges
- **Résumé** : Compteur total
- **Footer** : Informations système

Format responsive (mobile + desktop).

## 📝 Fichiers concernés

```
lib/
  config/
    email.ts              # Configuration Nodemailer
  email/
    templates.ts          # Templates HTML des emails
  actions/
    alertes.ts            # Server actions (détection + envoi)

app/
  api/
    cron/
      daily-alerts/
        route.ts          # API route pour Vercel Cron

vercel.json               # Configuration cron job
```

## 🔄 Désactiver temporairement les alertes

### Option 1 : Supprimer le cron de vercel.json

```json
{
  "crons": []
}
```

Puis redéployer.

### Option 2 : Laisser ALERT_EMAIL_TO vide

Si `ALERT_EMAIL_TO` est vide ou non configuré, les emails ne seront pas envoyés (mais le cron s'exécutera quand même).

### Option 3 : Via Vercel Dashboard

Project > Settings > Cron Jobs > Désactiver le cron

---

**Dernière mise à jour** : 2026-02-07
