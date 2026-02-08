# 🔔 Configuration Alertes Automatiques - Vercel

**Date** : 2026-02-08
**Sprint** : Sprint 1 - Fondations Critiques
**Statut** : ✅ Code prêt - Configuration Vercel requise

---

## 📋 Vue d'Ensemble

Le système d'alertes automatiques est maintenant fonctionnel avec :
- ✅ Détection cautions **CRITIQUES** (< 7 jours) et **ATTENTION** (< 30 jours)
- ✅ Détection marchés en fin d'exécution (< 60 jours)
- ✅ Email HTML professionnel avec niveaux de criticité (rouge/orange)
- ✅ Cron job configuré : **Lundis 7h** (fuseau UTC)
- ✅ Validation CRON_SECRET pour sécurité
- ✅ Logging structuré

---

## 🚀 Configuration Vercel (15 min)

### Étape 1 : Ajouter Variables d'Environnement

Se rendre sur : https://vercel.com/henrymartium-sudo/erp-marches-stam/settings/environment-variables

**Variables à ajouter** :

#### 🔐 Sécurité Cron

```env
CRON_SECRET=***REMOVED-CRON-SECRET***
```

**Type** : Encrypted
**Environnements** : Production, Preview, Development

---

#### 📧 Configuration SMTP

**Option 1 : Gmail (Recommandé pour tests)**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=<app-password-généré>
SMTP_FROM="ERP Marchés STAM <noreply@stam.com>"
```

**Note** : Pour Gmail, créer un mot de passe d'application :
1. https://myaccount.google.com/apppasswords
2. Sélectionner "Autre (nom personnalisé)"
3. Nommer "ERP Marchés STAM"
4. Copier le mot de passe généré (16 caractères sans espaces)

**Option 2 : SendGrid (Recommandé pour production)**

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=<votre-api-key-sendgrid>
SMTP_FROM="ERP Marchés STAM <noreply@stam.com>"
```

**Note** : SendGrid offre 100 emails/jour gratuits.
Créer une clé API : https://app.sendgrid.com/settings/api_keys

**Option 3 : Mailtrap (Recommandé pour tests)**

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<votre-username-mailtrap>
SMTP_PASS=<votre-password-mailtrap>
SMTP_FROM="ERP Marchés STAM <noreply@stam.com>"
```

**Note** : Mailtrap capture tous les emails (pas d'envoi réel).
Gratuit : https://mailtrap.io

---

#### 📬 Destinataires Alertes

```env
ALERT_EMAIL_TO=admin@stam.com,directeur@stam.com
```

**Format** : Plusieurs emails séparés par virgules (sans espaces)
**Type** : Plain Text
**Environnements** : Production, Preview, Development

---

### Étape 2 : Vérifier le Déploiement

Après avoir ajouté les variables :

1. **Redéployer l'application** (automatique si push GitHub)
2. **Vérifier les logs Vercel** : https://vercel.com/henrymartium-sudo/erp-marches-stam/logs

---

### Étape 3 : Tester le Cron Job Manuellement

**Via Vercel CLI** :

```bash
# Installer Vercel CLI si nécessaire
npm i -g vercel

# Se connecter
vercel login

# Lier le projet
vercel link

# Déclencher le cron manuellement
curl -X GET "https://erp-marches-stam.vercel.app/api/cron/daily-alerts" \
  -H "Authorization: Bearer ***REMOVED-CRON-SECRET***"
```

**Via Postman/Insomnia** :

```
GET https://erp-marches-stam.vercel.app/api/cron/daily-alerts
Header: Authorization: Bearer ***REMOVED-CRON-SECRET***
```

**Réponse attendue (succès)** :

```json
{
  "success": true,
  "message": "Alertes quotidiennes envoyées",
  "data": {
    "cautionsCount": 2,
    "marchesCount": 1,
    "duration": "1234ms",
    "timestamp": "2026-02-08T10:30:00.000Z"
  }
}
```

---

## 📊 Fonctionnement

### Schedule Cron

```
"0 7 * * 1"
 │ │ │ │ └─ Jour de la semaine (1 = Lundi)
 │ │ │ └─── Mois (tous)
 │ │ └───── Jour du mois (tous)
 │ └─────── Heure UTC (7h = 8h CET en hiver, 9h CEST en été)
 └───────── Minute (0)
```

**Fréquence** : Tous les lundis à 7h UTC (8h/9h heure française selon saison)

### Détection Alertes

**Cautions** :
- 🔴 **CRITIQUE** : Échéance < 7 jours (bordure rouge)
- 🟠 **ATTENTION** : Échéance < 30 jours (bordure orange)

**Marchés** :
- 🔴 Fin d'exécution < 60 jours

**Filtres** :
- Cautions : Statut = ACTIVE uniquement
- Marchés : Statut = EN_EXECUTION ou EXECUTE_ATTENTE_GARANTIES

---

## 🧪 Tests

### Test 1 : Vérifier SMTP (local)

```bash
# Terminal local
npm run dev

# Autre terminal
curl -X GET "http://localhost:3000/api/cron/daily-alerts" \
  -H "Authorization: Bearer ***REMOVED-CRON-SECRET***"
```

**Vérifier** :
- Logs console : `✅ Email d'alertes envoyé avec succès`
- Boîte email destinataires

### Test 2 : Vérifier Cron Production

**Après déploiement** :
1. Aller sur Vercel > Deployments > Dernière production > Functions
2. Vérifier que la route `/api/cron/daily-alerts` est présente
3. Consulter les logs lors du prochain lundi 7h UTC

**Logs attendus** :

```
🔔 Démarrage du cron job quotidien d'alertes...
✅ Email d'alertes envoyé avec succès : <1234567890@smtp.gmail.com>
   - 3 caution(s) proche(s) échéance
   - 1 marché(s) en fin d'exécution
   - Destinataires : admin@stam.com, directeur@stam.com
✅ Cron job terminé avec succès en 1234ms
```

---

## 🔧 Dépannage

### Erreur : `Configuration manquante : CRON_SECRET`

**Solution** : Ajouter la variable `CRON_SECRET` sur Vercel et redéployer.

### Erreur : `Unauthorized`

**Solution** : Vérifier que le header `Authorization: Bearer <CRON_SECRET>` est correct.

### Erreur : `Variables d'environnement manquantes pour SMTP`

**Solution** : Ajouter toutes les variables SMTP (HOST, PORT, USER, PASS, FROM, SECURE).

### Erreur : `Aucun destinataire configuré`

**Solution** : Ajouter la variable `ALERT_EMAIL_TO` avec au moins un email.

### Emails non reçus (Gmail)

**Solutions** :
1. Vérifier que le mot de passe d'application est correct (16 caractères)
2. Vérifier que l'authentification à 2 facteurs est activée sur le compte Gmail
3. Vérifier le dossier Spam/Courrier indésirable
4. Consulter les logs Vercel pour voir les erreurs SMTP

### Cron ne se déclenche pas

**Solutions** :
1. Vérifier que `vercel.json` est bien déployé (voir fichier sur Vercel)
2. Vérifier les logs Vercel à l'heure du cron
3. Attendre le prochain lundi 7h UTC
4. Tester manuellement avec curl pour valider le code

---

## 📝 Prochaines Étapes

Une fois configuré, les prochaines améliorations prévues :

1. **Envoi Manuel ADMIN** (Sprint 1 - Priorité 2)
   - Bouton dans `/admin/alertes` pour déclencher envoi à la demande
   - Utile pour tests et envois exceptionnels

2. **Historique Alertes** (Sprint 2)
   - Enregistrer les alertes envoyées en base de données
   - Tableau de bord historique

3. **Personnalisation Destinataires** (Sprint 3)
   - Configuration par type d'alerte
   - Abonnement utilisateur

---

## 🎯 Checklist Activation

- [ ] Ajouter `CRON_SECRET` sur Vercel
- [ ] Ajouter variables SMTP (HOST, PORT, USER, PASS, FROM, SECURE)
- [ ] Ajouter `ALERT_EMAIL_TO` avec email(s) destinataire(s)
- [ ] Redéployer l'application (push GitHub ou redeploy manuel)
- [ ] Tester manuellement avec curl
- [ ] Vérifier réception email
- [ ] Attendre prochain lundi 7h pour validation automatique
- [ ] Vérifier logs Vercel après exécution cron

---

**Besoin d'aide ?** Consulter :
- Documentation Vercel Cron : https://vercel.com/docs/cron-jobs
- Documentation Nodemailer : https://nodemailer.com/
- Logs temps réel : https://vercel.com/henrymartium-sudo/erp-marches-stam/logs

**Dernière mise à jour** : 2026-02-08
