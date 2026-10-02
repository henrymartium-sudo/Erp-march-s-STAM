# Plan : Cautions éditables dans les opportunités à partir de « Dossier en préparation »

> PRD source : `docs/PRD.md`

## Décisions architecturales

Décisions durables qui s'appliquent à toutes les phases :

- **Routes** : aucune nouvelle page. Une section « Cautions » est ajoutée aux pages détail existantes de l'opportunité et du marché. La création réutilise la page et le formulaire existants de caution, avec un paramètre d'opportunité sur le modèle du paramètre de marché.
- **Schéma** : un lien facultatif de la caution vers l'opportunité, ajouté sans toucher aux données existantes, avec un index. Une caution a une opportunité ou un marché, jamais les deux. La suppression d'une opportunité ne supprime jamais ses cautions : elles redeviennent sans lien. Cette règle diffère volontairement de celle du marché, où la suppression d'un marché supprime ses cautions.
- **Modèles clés** : `Caution` (nouveau lien `opportuniteId`), `Opportunite`, `Marche`. À vérifier avant la phase 4 : le lien posé à la conversion entre opportunité et marché. Les deux sens existent aujourd'hui (le marché pointe vers son opportunité d'origine, l'opportunité pointe vers un marché).
- **Droits** : ADMIN et AVANCE écrivent (création, modification, rattachement, détachement), vérifiés côté serveur dans chaque action. Les autres rôles consultent. La visibilité de la section dépend du statut de l'opportunité : à partir de « Dossier en préparation ».
- **Types par contexte** : une opportunité propose la caution de soumission et la caution de capacité financière. Un marché issu d'une opportunité propose les trois types d'après attribution. Un marché sans opportunité d'origine propose les cinq types. Les cautions existantes gardent leur type. Cette restriction est appliquée côté serveur, pas seulement dans l'interface.
- **Alertes** : le moteur d'alertes interroge déjà toutes les cautions actives qui expirent dans 30 jours, avec ou sans marché. Aucune règle nouvelle.
- **Irréversible** : les e-mails d'alerte partent vers de vrais destinataires, et les données de production ne se reconstituent pas. Aucun envoi ne sera déclenché pour tester, et une sauvegarde précède toute migration en production.

---

## Phase 1 : Lien et lecture des cautions sur l'opportunité

**User stories** : US-1, US-9

### Ce qu'on livre

Le lien entre une caution et une opportunité existe en base. La page d'une opportunité affiche une section « Cautions » en lecture : liste des cautions rattachées avec type, montant, banque, échéance et statut. La section apparaît dès « Dossier en préparation » et pour tous les statuts suivants. Tous les rôles la consultent, sans bouton d'écriture à ce stade.

### Critères d'acceptation

- [ ] Une opportunité en « Dossier en préparation » ou à un statut suivant affiche la section « Cautions ».
- [ ] Une opportunité à un statut antérieur n'affiche pas la section.
- [ ] Une caution rattachée à une opportunité (donnée de test) apparaît dans sa section avec ses informations.
- [ ] Les cautions existantes ne changent pas et restent visibles dans le module.
- [ ] La suppression d'une opportunité laisse ses cautions en place, sans lien.
- [ ] La page est lisible à 1920, 768 et 375 pixels.

## Bloquée par

Aucune — démarrable immédiatement

---

## Phase 2 : Créer une caution depuis l'opportunité

**User stories** : US-2, US-3, US-7 (côté opportunité), US-11

### Ce qu'on livre

Un bouton « Créer » dans la section « Cautions » ouvre le formulaire existant, avec l'opportunité déjà liée et les types limités à la caution de soumission et à la caution de capacité financière. Après enregistrement, l'utilisateur revient sur l'opportunité et voit la caution. Il peut la modifier ou changer son statut depuis la liste. Quand il n'y a aucune caution, un état vide explique quoi faire. Seuls ADMIN et AVANCE voient les boutons, et le serveur refuse les autres.

### Critères d'acceptation

- [ ] Créer une caution de soumission depuis une opportunité en dossier en préparation l'ajoute à la section et au module « Cautions & Garanties ».
- [ ] Même chose pour la caution de capacité financière.
- [ ] Les trois autres types ne sont pas proposés ni acceptés par le serveur pour une opportunité.
- [ ] Modifier ou changer le statut d'une caution depuis l'opportunité est pris en compte.
- [ ] Un rôle en lecture ne voit aucun bouton, et une requête directe est refusée.
- [ ] L'état vide s'affiche quand aucune caution n'est rattachée.
- [ ] Parcours clavier et mobile fonctionnels.

## Bloquée par

- Phase 1

---

## Phase 3 : Rattacher et détacher depuis l'opportunité

**User stories** : US-4, US-8 (côté opportunité), US-12 (côté opportunité)

### Ce qu'on livre

Un bouton « Rattacher » dans la section « Cautions » ouvre une liste des cautions sans lien et d'un type compatible (soumission, capacité financière). L'utilisateur en choisit une, qui rejoint l'opportunité. Un bouton « Détacher » la remet sans lien, sans la supprimer, avec une confirmation claire.

### Critères d'acceptation

- [ ] La liste de rattachement ne montre que des cautions sans lien et de type compatible.
- [ ] Rattacher une caution la retire de la liste des cautions sans lien et l'ajoute à l'opportunité.
- [ ] Détacher la remet sans lien, sans la supprimer, et elle redevient proposée au rattachement.
- [ ] Une caution déjà liée à un marché ou à une autre opportunité n'est jamais proposée.
- [ ] Un message clair s'affiche quand aucune caution n'est disponible au rattachement.
- [ ] Droits ADMIN/AVANCE vérifiés côté serveur.

## Bloquée par

- Phase 2

---

## Phase 4 : Cautions de l'opportunité visibles sur le marché issu

**User stories** : US-5

### Ce qu'on livre

Sur la page d'un marché issu d'une opportunité, la section « Cautions » affiche aussi les cautions de l'opportunité d'origine, marquées « vient de l'opportunité », avec un lien vers elle. Elles se modifient depuis la caution elle-même, pas depuis deux endroits qui divergeraient.

### Critères d'acceptation

- [ ] Un marché issu d'une opportunité affiche ses cautions propres et celles de l'opportunité, bien distinguées.
- [ ] Un marché sans opportunité d'origine n'affiche que ses cautions propres.
- [ ] Le changement de statut d'une caution de l'opportunité (libérée, par exemple) se reflète sur le marché.
- [ ] Aucune ressaisie n'est nécessaire à la création du marché.
- [ ] Le lien posé à la conversion est vérifié en réel avant d'écrire la phase.

## Bloquée par

- Phase 1

---

## Phase 5 : Créer, rattacher et détacher depuis le marché

**User stories** : US-6, US-7 (côté marché), US-8 (côté marché), US-12 (côté marché)

### Ce qu'on livre

La section « Cautions » du marché offre le double geste « Créer » et « Rattacher », plus « Détacher ». Les types proposés dépendent du marché :

- Marché issu d'une opportunité : bonne exécution, avance de démarrage, retenue de garantie. Un court message indique que les cautions de soumission et de capacité financière se gèrent depuis l'opportunité d'origine, avec un lien vers elle. Les types ne sont pas affichés en grisé.
- Marché sans opportunité d'origine (saisi directement ou historique) : les cinq types.

Les cautions déjà saisies sur des marchés gardent leur type et restent modifiables.

### Critères d'acceptation

- [x] Marché issu d'une opportunité : seuls trois types sont proposés (vérifié dans le formulaire) ; le refus serveur des deux autres est codé (`createCaution`, `updateCaution`, `rattacherCautionMarche`) et la règle est couverte par les tests unitaires, mais le refus n'a pas été provoqué de bout en bout (les types sont masqués dans l'interface).
- [x] Marché sans opportunité d'origine : les cinq types sont proposés (vérifié dans le formulaire).
- [ ] Une caution existante dont le type n'est plus proposé reste visible et modifiable avec son type (codé : la page de modification ajoute le type déjà saisi aux types proposés ; non vérifié dans le navigateur, aucune caution de ce cas dans la base de test).
- [x] Le rattachement ne propose que des cautions sans lien et de type compatible avec ce marché (vérifié : la soumission libre n'est pas proposée sur un marché issu d'une opportunité).
- [x] Détacher remet la caution sans lien, sans suppression (vérifié en base, avec les deux lignes d'audit).
- [x] Le lien d'ajout existant continue de fonctionner (le bouton s'appelle désormais « Créer », même lien `/cautions/nouvelle?marcheId=`).
- [x] Droits ADMIN/AVANCE vérifiés côté serveur (`requireMarcheWrite`) ; boutons masqués pour les autres rôles (codé, non essayé avec un compte VISITEUR dans cette phase).

## Bloquée par

- Phase 3

---

## Phase 6 : Alertes d'échéance

**User stories** : US-10

### Ce qu'on livre

L'e-mail d'alerte d'échéance affiche l'opportunité quand la caution n'a pas de marché (référence et objet), au lieu d'une information de marché vide. Une vérification en lecture seule, sur des données réelles, confirme que les règles existantes couvrent déjà ces cautions et qu'aucune rafale ne part au premier jour.

### Critères d'acceptation

- [ ] Une caution rattachée à une opportunité et expirant dans 30 jours entre dans le périmètre de l'alerte, au même seuil que les autres.
- [ ] Le contenu du mail est lisible et correct pour une caution sans marché (aperçu généré sans envoi).
- [ ] Le décompte des cautions concernées au jour de la mise en ligne est connu avant le déploiement et ne dépasse pas celui qui serait envoyé sans cette fonctionnalité.
- [ ] Aucun e-mail n'est envoyé pendant les tests.

## Bloquée par

- Phase 2

---

## Phase 7 : Mise en production protégée

**User stories** : aucune propre (porte de livraison)

### Ce qu'on livre

Sauvegarde de la base de production, migration additive, déploiement, puis vérification sur les données réelles. Parcours bout en bout sur desktop, tablette et mobile : création, rattachement, détachement, affichage sur le marché.

### Critères d'acceptation

- [ ] Une sauvegarde de production datée existe avant la migration, et son emplacement est consigné.
- [ ] La migration est additive et n'a modifié aucune donnée existante : décomptes de cautions et de marchés identiques avant et après.
- [ ] Les parcours des phases 1 à 6 sont vérifiés en production, sur 1920, 768 et 375 pixels, sans erreur de console.
- [ ] Aucun e-mail d'alerte supplémentaire n'est parti lors du déploiement.
- [ ] Le Journal de décisions est mis à jour avec ta validation.

## Bloquée par

- Phases 1 à 6
