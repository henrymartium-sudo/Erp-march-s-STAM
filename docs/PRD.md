# PRD — Cautions éditables dans les opportunités à partir de « Dossier en préparation »

## Problème

Une caution n'arrive pas qu'une fois le marché obtenu. Elle est reçue à plusieurs étapes de la mise en concurrence. La caution de soumission et la caution de capacité financière arrivent pendant la préparation du dossier, avant la soumission. La garantie de bonne exécution, la caution de demande d'avance de démarrage et la caution de retenue de garantie arrivent après l'obtention du marché ou son attribution définitive.

Le module « Cautions & Garanties » actuel ne sert bien que le second cas. Depuis un marché, on ajoute une caution déjà rattachée à ce marché. Depuis le module, la caution est créée sans aucun lien. Il n'existe aucun moyen de la rattacher ensuite, et aucun lien avec les opportunités. Les deux cautions qui conditionnent le dépôt de l'offre n'ont donc nulle part où vivre au moment où elles sont reçues. Le risque est de déposer sans caution valide, ou avec une caution qui expire avant la fin de l'évaluation des offres.

## Solution

L'utilisateur peut gérer les cautions de soumission et de capacité financière directement depuis l'opportunité, dès que le dossier est en préparation.

- Il **crée** une caution depuis l'opportunité, déjà rattachée à elle, ou il **rattache** une caution déjà créée dans le module et encore sans lien.
- La page du marché offre le même double geste, **créer** ou **rattacher**. Pour un marché issu d'une opportunité, elle propose les cautions de bonne exécution, d'avance de démarrage et de retenue de garantie. Pour un marché sans opportunité d'origine, elle propose les cinq types, puisqu'aucune opportunité ne peut porter les deux cautions d'avant le dépôt.
- Quand une opportunité débouche sur un marché, ses cautions apparaissent automatiquement sur la page du marché, sans ressaisie. Elles restent rattachées à l'opportunité d'origine pour garder l'historique.
- Les alertes d'échéance existantes couvrent aussi ces cautions.

## Utilisateur cible

Les personnes de STAM qui montent les dossiers d'offre et suivent les cautions. Elles reçoivent la caution de la banque avant le dépôt et doivent s'assurer qu'elle est valide jusqu'à l'évaluation des offres. Les rôles ADMIN et AVANCE créent, modifient et rattachent. Les autres rôles consultent seulement, comme pour l'opportunité elle-même.

## User Stories

1. US-1 : En tant qu'ADMIN ou AVANCE, je veux voir les cautions d'une opportunité depuis sa page, afin de savoir d'un coup d'œil où en sont les garanties du dossier.
2. US-2 : En tant qu'ADMIN ou AVANCE, je veux créer une caution de soumission depuis une opportunité dont le dossier est en préparation, afin de l'enregistrer dès que la banque me la remet.
3. US-3 : En tant qu'ADMIN ou AVANCE, je veux créer une caution de capacité financière depuis une opportunité, avec le même formulaire, afin de suivre cette garantie avant la soumission.
4. US-4 : En tant qu'ADMIN ou AVANCE, je veux rattacher à une opportunité une caution déjà créée dans le module et encore sans lien, afin de ne pas la ressaisir.
5. US-5 : En tant qu'ADMIN ou AVANCE, je veux retrouver les cautions d'une opportunité sur la page du marché issu de cette opportunité, afin de suivre la caution de soumission jusqu'à sa libération.
6. US-6 : En tant qu'ADMIN ou AVANCE, je veux créer ou rattacher depuis la page d'un marché une caution de bonne exécution, d'avance de démarrage ou de retenue de garantie (et, pour un marché sans opportunité d'origine, de soumission ou de capacité financière), afin de tout gérer au même endroit.
7. US-7 : En tant qu'ADMIN ou AVANCE, je veux modifier ou changer le statut d'une caution depuis l'opportunité ou le marché, afin de la tenir à jour (active, expirée, libérée, appelée).
8. US-8 : En tant qu'ADMIN ou AVANCE, je veux détacher une caution rattachée par erreur, afin de la rattacher ailleurs sans la supprimer.
9. US-9 : En tant qu'EXPLOITATION ou VISITEUR, je veux consulter les cautions d'une opportunité sans pouvoir les modifier, afin de garder la même règle que pour l'opportunité.
10. US-10 : En tant qu'ADMIN ou AVANCE, je veux être alerté par e-mail avant l'échéance d'une caution rattachée à une opportunité, afin de ne pas déposer ou attendre une attribution avec une garantie périmée.
11. US-11 : En tant qu'ADMIN ou AVANCE, je veux voir un message clair quand une opportunité n'a encore aucune caution, avec les deux gestes proposés (créer ou rattacher), afin de savoir quoi faire.
12. US-12 : En tant qu'ADMIN ou AVANCE, je veux que la liste de rattachement ne me propose que des cautions sans lien et d'un type compatible, afin de ne pas rattacher la mauvaise.

## Critères de succès

- Une caution de soumission créée depuis une opportunité en dossier en préparation apparaît dans la liste de cette opportunité et dans le module « Cautions & Garanties » dès l'enregistrement.
- Une caution sans lien, rattachée à une opportunité, disparaît de la liste des cautions sans lien et apparaît sur l'opportunité.
- Après la création d'un marché issu d'une opportunité, ses cautions apparaissent sur la page du marché sans aucune saisie.
- Un utilisateur sans droit d'écriture ne voit aucun bouton de création, de modification ou de rattachement.
- Une caution rattachée à une opportunité dont l'échéance approche déclenche l'alerte selon les règles existantes, au même seuil que les autres cautions.
- Depuis la page d'un marché issu d'une opportunité, les trois types d'après attribution se créent ou se rattachent, et les deux types de soumission ne sont pas proposés. Un message renvoie vers l'opportunité d'origine pour ceux-là.
- Depuis la page d'un marché sans opportunité d'origine, les cinq types se créent ou se rattachent.
- Les cautions déjà saisies sur des marchés, quel que soit leur type, restent visibles et modifiables avec leur type d'origine.
- Le jour de la mise en ligne, aucun e-mail d'alerte supplémentaire n'est envoyé pour des cautions déjà échues ou déjà alertées avant la mise en ligne.

## Hors périmètre

- La pièce « Caution de soumission » du dossier d'offre ne se met pas à jour automatiquement, et la progression du dossier ne change pas. Elle reste manuelle, la caution est visible à côté.
- Aucune nouvelle règle d'alerte, ni nouveau destinataire.
- Pas de création des cautions de bonne exécution, d'avance de démarrage ou de retenue de garantie depuis une opportunité.
- Pas de rattachement d'une même caution à plusieurs opportunités.
- Pas de nouveau type de caution, pas de modification des statuts existants.
- Pas de dépôt ni de gestion du document scanné de la caution dans cette version.
- Pas de reprise ou de correction automatique des cautions existantes.

## Décisions d'implémentation

- Depuis une opportunité, seuls la caution de soumission et la caution de capacité financière sont proposées.
- La section « Cautions » de l'opportunité est visible dès le statut « Dossier en préparation » et pour tous les statuts suivants. Aucune saisie n'est proposée avant ce statut.
- Depuis la page d'un marché issu d'une opportunité, seuls les trois types d'après attribution sont proposés. Les types de soumission n'y sont pas affichés en grisé : un court message indique qu'ils se gèrent depuis l'opportunité d'origine, avec un lien vers elle.
- Depuis la page d'un marché sans opportunité d'origine (marchés saisis directement ou historiques), les cinq types sont proposés, car il n'existe aucune opportunité pour porter les deux cautions d'avant le dépôt.
- Les cautions déjà saisies sur des marchés restent visibles et modifiables avec leur type d'origine, même si ce type n'est plus proposé à la création.
- Le double geste se présente par deux boutons : « Créer » et « Rattacher ». Le formulaire de création est le même que dans le module, avec le rattachement déjà fait et non modifiable à ce moment-là.
- Le rattachement propose uniquement des cautions sans lien. Une caution est rattachée à une seule opportunité ou à un seul marché.
- Les cautions d'une opportunité s'affichent sur la page du marché qui en est issu, marquées comme venant de l'opportunité. Elles se modifient depuis la caution elle-même, pas depuis deux endroits qui divergeraient.
- Détacher une caution la remet sans lien. Elle n'est pas supprimée.
- Le montant, la banque, les dates et les statuts sont ceux du module actuel.
- Une caution de soumission rattachée à une opportunité peut passer au statut « Libérée », pour la suivre jusqu'à sa libération. L'interdiction actuelle de libérer une caution de soumission reste en vigueur pour les cautions de marché.
- Un état vide explicite s'affiche quand il n'y a aucune caution.
- Les droits suivent ceux de l'opportunité : ADMIN et AVANCE écrivent, les autres consultent.

## Notes complémentaires

- Les 8 cautions existantes n'ont peut-être pas de marché. Elles pourront être rattachées après coup. Je n'ai pas vérifié l'état réel des données de production.
- La fonctionnalité change la structure des données de production, qui sont réelles et ne se reconstituent pas. Une sauvegarde sera nécessaire avant la mise en ligne.
- À vérifier avant la mise en ligne : que les règles d'alerte existantes ne partent pas en rafale le premier jour sur des cautions déjà échues. Les e-mails partent vers de vrais destinataires et ne se rappellent pas.
- Il faudra confirmer que la page du marché propose aujourd'hui toutes les cautions rattachées, y compris celles des types de soumission.
- Hypothèse : une caution de soumission peut rester utile après l'attribution (suivi jusqu'à libération), d'où son affichage sur le marché.
