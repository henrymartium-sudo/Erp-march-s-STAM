# 🚀 Guide de Démarrage Rapide - Synchronisation Vercel

## Étape 1 : Créer un Token Vercel (2 min)

1. **Ouvrez** : https://vercel.com/account/tokens
2. **Cliquez** sur **"Create Token"**
3. **Remplissez** :
   - **Name** : `ERP-Sync-Env`
   - **Scope** : **✅ Full Account** (important !)
   - **Expiration** : No Expiration (ou selon vos besoins)
4. **Cliquez** sur **"Create Token"**
5. **Copiez** le token affiché (vous ne pourrez plus le voir après !)

## Étape 2 : Exporter le Token (30 sec)

Choisissez selon votre terminal :

### Windows PowerShell (Recommandé)
```powershell
$env:VERCEL_TOKEN="votre_token_copié"
```

### Windows CMD
```cmd
set VERCEL_TOKEN=votre_token_copié
```

### Linux / macOS / Git Bash
```bash
export VERCEL_TOKEN="votre_token_copié"
```

## Étape 3 : Tester en Mode Simulation (1 min)

```bash
npm run env:sync:dry
```

**Résultat attendu** :
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
  ...

⚠️  MODE DRY-RUN : Aucune modification effectuée
```

## Étape 4 : Appliquer les Modifications (1 min)

Si tout est OK à l'étape 3 :

```bash
npm run env:sync
```

**Résultat attendu** :
```
[4/4] Application des modifications
✅ Mis à jour : SMTP_HOST
✅ Mis à jour : SMTP_PORT
...

============================================================
📊 RÉSUMÉ DE LA SYNCHRONISATION
============================================================
✅ 8 variable(s) synchronisée(s)

🎉 Synchronisation terminée avec succès !
```

## Étape 5 : Redéployer en Production (2 min)

```bash
vercel --prod
```

OU utiliser le script combo (sync + deploy) :

```bash
npm run env:deploy
```

## Étape 6 : Tester l'Envoi d'Emails (1 min)

1. **Accédez** à : https://erp-marches-stam.vercel.app/admin/alertes
2. **Connectez-vous** avec un compte ADMIN
3. **Sélectionnez** des destinataires
4. **Cliquez** sur **"Envoyer maintenant"**
5. **Vérifiez** que vous recevez le toast : ✅ "Email envoyé à X destinataire(s)"

## 🎯 Résumé des Commandes

| Commande | Description |
|----------|-------------|
| `npm run env:sync:dry` | Tester sans modifier (recommandé en premier) |
| `npm run env:sync` | Synchroniser les variables sur Vercel |
| `npm run env:deploy` | Synchroniser + déployer en prod (combo) |
| `vercel --prod` | Déployer manuellement en production |

## ❌ Problèmes Courants

### "VERCEL_TOKEN manquante"
➜ **Solution** : Retournez à l'Étape 2 et exportez le token

### "getaddrinfo ENOTFOUND"
➜ **Solution** : Vérifiez votre connexion Internet ou désactivez le VPN

### "403 Forbidden"
➜ **Solution** : Vérifiez que le scope est **Full Account** lors de la création du token

### "Validation échouée"
➜ **Solution** : Ouvrez `scripts/sync-vercel-env.js` et corrigez les valeurs signalées

## 📝 Temps Total : ~7 minutes

✅ Création token : 2 min
✅ Export token : 30 sec
✅ Test dry-run : 1 min
✅ Synchronisation : 1 min
✅ Déploiement : 2 min
✅ Test envoi email : 1 min

---

**💡 Astuce** : Sauvegardez votre token Vercel dans un gestionnaire de mots de passe sécurisé (1Password, Bitwarden, etc.) pour le réutiliser ultérieurement.

**🔐 Sécurité** : Ne commitez JAMAIS le token dans Git. Il doit rester dans votre terminal uniquement.
