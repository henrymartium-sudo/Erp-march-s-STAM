# Configuration Vercel - Système d'Alertes

## Variables d'Environnement à Ajouter

### 🔗 Accès : https://vercel.com/your-team/erp-marches-stam/settings/environment-variables

---

## 1. Configuration SMTP (Gmail)

### SMTP_HOST
- **Valeur** : `smtp.gmail.com`
- **Environment** : ✅ Production, ✅ Preview, ✅ Development

### SMTP_PORT
- **Valeur** : `587`
- **Environment** : ✅ Production, ✅ Preview, ✅ Development

### SMTP_SECURE
- **Valeur** : `false`
- **Environment** : ✅ Production, ✅ Preview, ✅ Development

### SMTP_USER
- **Valeur** : `henrymartium@gmail.com`
- **Environment** : ✅ Production, ✅ Preview, ✅ Development

### SMTP_PASS
- **Valeur** : `vsjzokuhjdyoipsr`
- **Environment** : ✅ Production, ✅ Preview, ✅ Development
- **⚠️ IMPORTANT** : Cocher "Sensitive" lors de l'ajout

### SMTP_FROM
- **Valeur** : `"ERP Marchés STAM <henrymartium@gmail.com>"`
- **Environment** : ✅ Production, ✅ Preview, ✅ Development

---

## 2. Configuration Destinataires

### ALERT_EMAIL_TO
- **Valeur** : `honoreatsu@gmail.com`
- **Environment** : ✅ Production, ✅ Preview, ✅ Development
- **Note** : Email destinataire initial pour les tests

---

## 3. Sécurité

### CRON_SECRET
- **Valeur** : `0a7441df1b1dd68baf9889552839b992e3525bddfae5b9112ba87e829e0ec2de`
- **Environment** : ✅ Production, ✅ Preview, ✅ Development
- **⚠️ IMPORTANT** : Cocher "Sensitive" lors de l'ajout
- **Note** : Actuellement non utilisé (cron désactivé), mais configuré pour réactivation future

---

## 📋 Instructions Pas à Pas

1. **Ouvrir Vercel Dashboard**
   - Aller sur https://vercel.com
   - Sélectionner le projet "erp-marches-stam"

2. **Accéder aux Variables**
   - Settings → Environment Variables

3. **Ajouter chaque variable**
   - Cliquer sur "Add New"
   - Nom : copier depuis ce fichier
   - Valeur : copier depuis ce fichier
   - Environment : sélectionner Production, Preview, Development
   - Sensitive : cocher pour SMTP_PASS et CRON_SECRET
   - Cliquer "Save"

4. **Vérifier**
   - 9 variables au total doivent être configurées
   - Toutes marquées pour les 3 environnements

---

## ✅ Après Configuration

Une fois les variables ajoutées :

1. **Redéployer** (automatique ou manuel via Vercel)
2. **Appliquer migration Prisma** (table AlerteDestinataire)
3. **Tester** :
   - Connexion à l'application
   - Aller sur `/admin/alertes`
   - Ajouter des destinataires
   - Prévisualiser et envoyer un email de test

---

**Dernière mise à jour** : 2026-02-07
