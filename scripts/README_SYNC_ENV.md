# 🔄 Script de Synchronisation Vercel Environment Variables

Script professionnel pour synchroniser automatiquement vos variables d'environnement avec Vercel via leur API REST.

## 🎯 Fonctionnalités

- ✅ **Mise à jour automatique** des variables existantes
- ✅ **Création** de nouvelles variables
- ✅ **Validation** des valeurs (détection `\n`, guillemets superflus)
- ✅ **Support multi-environnements** (production, preview, development)
- ✅ **Mode dry-run** (simulation sans modification)
- ✅ **Logs colorés et détaillés**
- ✅ **Masquage des valeurs sensibles** dans les logs
- ✅ **Gestion d'erreurs robuste**

## 📋 Prérequis

### 1. Créer un Token Vercel

1. Visitez https://vercel.com/account/tokens
2. Cliquez sur **"Create Token"**
3. Nom : `ERP-Sync-Env` (ou autre)
4. Scope : **Full Account** (nécessaire pour modifier les variables)
5. Expiration : Choisissez selon vos besoins
6. Copiez le token généré

### 2. Exporter le Token

**Windows (PowerShell)** :
```powershell
$env:VERCEL_TOKEN="votre_token_ici"
```

**Windows (CMD)** :
```cmd
set VERCEL_TOKEN=votre_token_ici
```

**Linux/macOS** :
```bash
export VERCEL_TOKEN="votre_token_ici"
```

## 🚀 Usage

### Mode Simulation (Dry-Run) - Recommandé pour le premier essai

Teste les modifications sans les appliquer :

```bash
node scripts/sync-vercel-env.js --dry-run
```

**Sortie attendue** :
```
🚀 SYNCHRONISATION VARIABLES VERCEL - ERP MARCHÉS STAM
============================================================

⚠️  MODE DRY-RUN ACTIVÉ (simulation uniquement)

[1/4] Récupération des variables existantes
✅ 8 variable(s) trouvée(s)

[2/4] Validation des nouvelles valeurs
✅ Toutes les valeurs sont valides

[3/4] Planification des modifications
  → Mettre à jour SMTP_HOST = smtp.gmail.com
  → Mettre à jour SMTP_PORT = 587
  → Mettre à jour SMTP_USER = henrymartium@gmail.com
  → Mettre à jour SMTP_PASS = vsjz***ipsr
  ...

⚠️  MODE DRY-RUN : Aucune modification effectuée
```

### Mode Production - Applique les modifications

⚠️ **Attention** : Cette commande modifie réellement les variables sur Vercel !

```bash
node scripts/sync-vercel-env.js
```

**Sortie attendue** :
```
[4/4] Application des modifications
✅ Mis à jour : SMTP_HOST
✅ Mis à jour : SMTP_PORT
✅ Mis à jour : SMTP_USER
✅ Mis à jour : SMTP_PASS
...

============================================================
📊 RÉSUMÉ DE LA SYNCHRONISATION
============================================================
✅ 8 variable(s) synchronisée(s)

🎉 Synchronisation terminée avec succès !

💡 Prochaines étapes :
   1. Redéployez votre application : vercel --prod
   2. Vérifiez les logs de déploiement
   3. Testez l'envoi d'emails depuis /admin/alertes
```

## 🔧 Configuration

Les variables à synchroniser sont définies dans le script (`scripts/sync-vercel-env.js`) :

```javascript
const CONFIG = {
  projectId: 'prj_CMfXkhrGaZVN6xbyJGRl0qdEf8Aw',
  teamId: 'team_38g8LtNCRD8PCg4PTFPeKrDS',

  variables: {
    'SMTP_HOST': {
      value: 'smtp.gmail.com',
      target: ['production', 'preview', 'development'],
    },
    'SMTP_PASS': {
      value: 'votre_mot_de_passe',
      target: ['production', 'preview', 'development'],
      sensitive: true, // Masqué dans les logs
    },
    // ... autres variables
  },
};
```

### Ajouter une nouvelle variable

1. Ouvrez `scripts/sync-vercel-env.js`
2. Ajoutez votre variable dans `CONFIG.variables` :

```javascript
'MA_NOUVELLE_VAR': {
  value: 'ma_valeur',
  target: ['production', 'preview', 'development'],
  sensitive: false, // true pour masquer dans les logs
},
```

3. Lancez le script

## 🐛 Dépannage

### Erreur : `VERCEL_TOKEN manquante`

**Cause** : Le token n'est pas exporté dans votre terminal.

**Solution** :
```bash
export VERCEL_TOKEN="votre_token"  # Linux/Mac
$env:VERCEL_TOKEN="votre_token"    # Windows PowerShell
```

### Erreur : `getaddrinfo ENOTFOUND api.vercel.com`

**Cause** : Problème de connexion réseau ou proxy.

**Solutions** :
1. Vérifiez votre connexion Internet
2. Désactivez temporairement votre VPN
3. Vérifiez les paramètres proxy de votre système

### Erreur : `403 Forbidden` ou `401 Unauthorized`

**Cause** : Token invalide ou expiré.

**Solution** :
1. Générez un nouveau token sur https://vercel.com/account/tokens
2. Assurez-vous d'avoir sélectionné **Full Account** scope
3. Exportez le nouveau token

### Erreur : `Validation échouée`

**Cause** : Une valeur contient des caractères invalides (`\n`, guillemets superflus).

**Solution** :
1. Vérifiez les erreurs de validation affichées
2. Corrigez les valeurs dans `CONFIG.variables`
3. Relancez le script

## 📊 Workflow Recommandé

```bash
# 1. Tester en mode dry-run
node scripts/sync-vercel-env.js --dry-run

# 2. Si tout est OK, appliquer les modifications
node scripts/sync-vercel-env.js

# 3. Redéployer en production
vercel --prod

# 4. Vérifier les logs de déploiement
vercel logs --follow

# 5. Tester l'envoi d'emails
# → Accédez à https://erp-marches-stam.vercel.app/admin/alertes
# → Cliquez sur "Envoyer maintenant"
```

## 🔐 Sécurité

- ✅ Les valeurs sensibles sont marquées `sensitive: true` et masquées dans les logs
- ✅ Le token Vercel n'est jamais committé (uniquement en variable d'environnement)
- ✅ Les valeurs sont chiffrées par Vercel (type: `encrypted`)
- ✅ Validation stricte des valeurs avant envoi

## 📝 Logs

Le script affiche des logs colorés et détaillés :

- 🟢 **Vert** : Succès
- 🔴 **Rouge** : Erreur
- 🟡 **Jaune** : Avertissement
- 🔵 **Bleu** : Information
- 🟦 **Cyan** : Étape en cours

## 🤝 Support

En cas de problème :
1. Vérifiez les logs d'erreur
2. Consultez la section **Dépannage**
3. Vérifiez la documentation API Vercel : https://vercel.com/docs/rest-api

---

**Version** : 1.0.0
**Dernière mise à jour** : 2026-02-09
