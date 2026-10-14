# Mail « échéances du matin » — conception

Date : 2026-10-14. Statut : cadrage et maquette validés, rien de construit. Plan associé : [2026-10-14-mail-echeances-matin-plan.md](./2026-10-14-mail-echeances-matin-plan.md).

## Problème

Le mail de suivi existant (`runOpportuniteReportingCron`, gabarit `lib/email/opportunite-reporting-templates.ts`) envoie **toutes** les opportunités, sans filtre ni fenêtre. Il ne permet pas de savoir en moins d'une minute, chaque matin, quelles offres sont à rendre dans les 7 prochains jours. Les offres sont aujourd'hui doublées dans une feuille Google qui envoie un mail à 8 h. L'ERP doit devenir la **source unique** ; la feuille est coupée le jour de la mise en service.

## Critère de succès

Savoir chaque matin, en moins d'une minute, quelles offres sont à rendre dans les 7 jours. Vérification un mois après la mise en service.

## Décisions (validées dans le fil, 2026-10-14)

| # | Décision |
|---|---|
| 1 | Un champ `reportType` sur `OpportuniteReportingRule` (`SUIVI` par défaut, `ECHEANCES_MATIN`) : migration additive. L'ancien mail n'est pas modifié. |
| 2 | La feuille Google est coupée à la mise en service : pas de filet. Compensations : mail envoyé même vide, envoi de test à un seul destinataire, alerte d'échec du service de déclenchement vérifiée. |
| 3 | Par offre : référence, objet, autorité, échéance à l'heure près, délai restant, statut, **montant proposé** (pas l'estimé), avancement du dossier, bouton « Ouvrir la fiche ». |
| 4 | Montant : « À définir » sans montant ; total partiel suivi des lots manquants nommés ; total simple sinon. |
| 5 | Objet du mail qui résume la situation (« 3 offres à rendre : 1 aujourd'hui ou demain, 2 dans la semaine »). |
| 6 | Mail court : cartes complètes pour les blocs rouge et orange, jamais coupées ; lignes compactes pour « Dans les 7 jours » au-delà de 5 offres ; au-delà de 15 offres au total, un bouton renvoie vers la liste de l'ERP. |
| 7 | Plusieurs destinataires par règle : un envoi individuel par destinataire (adresses non exposées entre elles, un échec n'empêche pas les autres). |

## Règles

- **Offre à rendre** : statut dans `IDENTIFIEE`, `EN_ANALYSE`, `GO`, `DOSSIER_EN_PREPARATION` (= `STATUTS_AVANT_SOUMISSION`) et `dateLimite` renseignée. `GO` signifie « on y va », pas « dossier complet ». Les statuts de soumission, d'attribution et de clôture ne figurent jamais dans le mail.
- **Échéance effective** : `dateLimite` avec son heure ; minuit exact (UTC) = heure non renseignée = 23 h 59 le jour de la date limite. Fuseau : Lomé = UTC+0 = serveur.
- **Blocs** (une offre dans un seul bloc, calculé à l'heure d'envoi) : *À régulariser* (échéance effective passée) ; *Aujourd'hui et demain* ; *Dans les 7 jours* (du surlendemain à J+7 inclus). Au-delà de J+7 : absente.
- **Alerte** : offre « détectée » (`IDENTIFIEE`, `EN_ANALYSE`) dont l'échéance tombe d'aujourd'hui à J+2 : en gras et marquée « À décider ». Jamais dans le bloc rouge.
- **Tri** : dans chaque bloc, de l'échéance effective la plus proche à la plus lointaine.
- **Mail vide** : envoyé quand même (« Rien à rendre dans les 7 prochains jours »).
- **Déclenchement** : le cron horaire existant (déclenché par un service externe) appelle déjà `runOpportuniteReportingCron` ; la règle choisit l'heure (8 h pour ce mail).

## Hors périmètre

- Compteur d'offres manquées, statut « déposé en retard ».
- Modification ou remplacement du mail de suivi existant.
- Complétude du dossier de l'offre ; notifications autres que le mail.
- Test de rendu dans les clients de messagerie (Gmail, Outlook) : un envoi réel à l'adresse de l'administrateur le remplace, avec son accord.

## Points de vigilance

- **Première exécution** : les offres anciennes restées à un statut « avant soumission » avec une date limite passée apparaîtront toutes dans « À régulariser ». C'est voulu (le mail force la régularisation), mais le premier mail peut être long : compter ces offres en lecture seule avant d'activer la règle.
- **Une seule dépendance externe** (le déclencheur horaire) : l'absence du mail à 8 h est le signal de panne. L'alerte d'échec du service doit pointer sur la boîte de l'administrateur.
- **Heure limite** : portée par `dateLimite` (PR « heure limite de dépôt »). Sans heure saisie, 23 h 59 s'applique.
- **Contraintes du dépôt public** : aucune adresse, aucun secret ni valeur réelle dans le code, les tests, les exemples et les messages de commit ; destinataires et URL de l'application viennent de la configuration.
