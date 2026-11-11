# Cadrage — Simplification des modules et refonte du tableau de bord

**Date** : 2026-11-11 · **Statut** : brouillon à valider par Abel · **Source** : analyse du code (Abel a demandé de sauter les questions préalables)

Deux chantiers, dans cet ordre :

1. **Fusion des modules** : réduire les doublons de pages, de chiffres et de réglages.
2. **Refonte du tableau de bord** (`/`) : le fond comme la forme.

L'ordre compte : le nouveau tableau de bord renverra vers les pages issues de la fusion, et la fusion dira où vivent les analyses qui quitteront le tableau de bord.

---

## 1. Constat

### 1.1 Les doublons trouvés dans le code

| # | Doublon | Où | Preuve |
|---|---------|----|--------|
| D1 | **Trois espaces d'analyse** pour les mêmes données | `/` (graphiques), `/pilotage` (indicateurs + « Analyses détaillées »), `/veille` | La répartition des marchés par statut est affichée sur `/` (`status-charts.tsx`) **et** dans `PerformanceSection` ; le pipeline des opportunités sur `/` (`opportunites-widget.tsx`) **et** dans `OpportunitesSection` ; le CA sur `/` (`effective-revenue-chart.tsx`) **et** dans `FinanciereSection` ; les concurrents dans `PerformanceSection` **et** dans `/veille` ; le « Top 10 autorités contractantes » **deux fois** dans les Analyses (`CapitalisationSection` et `OpportunitesSection`). |
| D2 | **Deux pages pour régler les e-mails** | `/admin/alertes` (envoi manuel, échéances, règles d'alerte, historique) et `/admin/reporting` (rapports marchés, suivi et échéances des opportunités) | Trois mécanismes d'envoi indépendants : `AlerteDestinataire` + `alertes-manuelles.ts` (manuel), `AlertRule` + cron `daily-alerts` (règles), `ReportingRule` + `OpportuniteReportingRule` + cron `reporting` (rapports). L'utilisateur doit savoir lequel fait quoi. |
| D3 | **Trois vues des échéances** | `/` (`alerts-section.tsx`), `/admin/alertes` (« Tableau de bord des échéances »), e-mail « échéances du matin » | Chacune a ses propres règles (cautions < 30 j, marchés < 60 j, offres à 7 j) ; aucune vue à l'écran ne montre les **dates limites de dépôt d'offre**, l'échéance la plus importante pour gagner un appel d'offres. |
| D4 | **SAV séparé des véhicules** | Entrée de menu `SAV` → `/vehicules/sav` | Une intervention appartient toujours à un véhicule ; la page porte d'ailleurs le titre « Véhicules » (bug F2 de l'audit du 2026-09-04). |
| D5 | **Dossiers d'offre** | `/dossiers-offre/*` | **Déjà fusionné** dans Opportunités (les pages redirigent). Restent des `revalidatePath('/dossiers-offre')` inutiles dans `lib/actions/dossiers-offre.ts`. |
| D6 | **Doublons dans les données** (pas dans les écrans) | `schema.prisma` | Le marché garde les statuts d'avant attribution (`OPPORTUNITE_IDENTIFIEE` … `ATTRIBUE_PROVISOIREMENT`) qui doublent le pipeline des opportunités ; `concurrentGagnant` / `montantOffreConcurrent` existent à trois niveaux (Marché, Opportunité, Lot) ; l'opportunité garde deux statuts « legacy » (`IDENTIFIEE`, `SOUMISE`). |

Les autres modules (Marchés, Opportunités, Cautions, Facturation, Documents, Utilisateurs, Journal des logs) ont chacun une raison d'être propre : **pas de fusion proposée**.

### 1.2 Ce qui ne va pas dans le tableau de bord actuel

**Le fond, avec des chiffres faux ou ambigus** (fiabilité des données : non négociable) :

- « **Valeur totale** » additionne **tous** les marchés, y compris les annulés, infructueux et résiliés (`getMarchesStats`, `lib/actions/marches.ts`).
- « **Montants mensuels** » fait de même (`getMontantsMensuels`, `lib/dashboard/stats.ts`).
- « **CA effectif** » additionne des montants contractuels, alors que `/pilotage` mesure le facturé et l'encaissé : deux définitions du chiffre d'affaires dans l'outil, ce qui contredit la règle « un chiffre par notion » (Journal, 2026-10-08).
- « Marchés actifs » exclut `EXECUTE_ATTENTE_GARANTIES` alors que le CA effectif l'inclut.
- **Bug** : le widget « Pipeline Opportunités » compte comme actives les statuts `IDENTIFIEE, EN_ANALYSE, GO, SOUMISE`. Deux de ces statuts sont obsolètes, et les statuts actuels `DOSSIER_EN_PREPARATION`, `OFFRE_SOUMISE`, `EN_ATTENTE_ATTRIBUTION` et `ATTRIBUE_PROVISOIREMENT` sont ignorés. Le nombre d'opportunités actives est donc sous-estimé.

**La forme** :

- Huit blocs empilés, sans hiérarchie : on ne sait pas ce qui demande d'agir.
- Trois répartitions de stock (marchés par statut, cautions par type, véhicules par statut) qui ne mènent à aucune action.
- « Activité récente » liste les dernières **créations** de fiches, pas ce qui a bougé.
- Les actions rapides n'incluent pas « Nouvelle opportunité », alors que c'est l'entrée du cycle.
- Toutes les cautions et tous les marchés sont chargés puis filtrés en JavaScript à chaque affichage (`alerts-section.tsx`, `recent-activity.tsx`).

---

## 2. Chantier 1 — Fusion des modules

### Intention

Une notion = un endroit. L'utilisateur ne doit pas se demander dans quelle page chercher, ni pourquoi deux pages affichent deux chiffres différents.

### Fusions proposées

**F1. Un seul espace « Pilotage »** (D1)
- `/pilotage` devient la seule page d'analyse, avec trois onglets : **Indicateurs** (l'actuel), **Veille** (l'actuelle `/veille`), **Analyses** (les « Analyses détaillées », dédoublonnées).
- La période commune est conservée (`usePeriodeUrl` est déjà partagé). L'onglet actif va dans l'URL.
- `/veille` redirige vers `/pilotage?onglet=veille` en gardant les paramètres de période. L'entrée « Veille » quitte le menu.
- Dédoublonnage des Analyses : un seul « Top autorités contractantes », et les concurrents seulement dans l'onglet Veille. La répartition par statut et le pipeline restent dans les Analyses, puisque le tableau de bord les abandonne (chantier 2).
- Rôles inchangés : ADMIN et AVANCE.

**F2. Un seul espace « Alertes et e-mails »** (D2, D3)
- `/admin/reporting` est absorbé dans `/admin/alertes`, en onglets : **Envoi manuel**, **Règles d'alerte**, **Rapports programmés** (rapports marchés + suivi et échéances des opportunités), **Historique**.
- Les droits restent ceux d'aujourd'hui, onglet par onglet : « Rapports programmés » reste réservé à ADMIN.
- `/admin/reporting` redirige vers le bon onglet. L'entrée « Reporting » quitte le menu.
- La vue « échéances » de la page d'alertes est remplacée par le bloc « À traiter » du nouveau tableau de bord (chantier 2), qui devient **la** vue des échéances à l'écran.
- **Interface seulement** : aucun moteur d'envoi, aucune règle, aucune table ni aucun cron n'est modifié. `AlerteDestinataire` reste (verdict du 2026-07-09).

**F3. SAV dans Véhicules** (D4)
- La vue globale SAV devient un onglet de `/vehicules` (« Parc » / « SAV »). `/vehicules/sav` redirige, l'entrée « SAV » quitte le menu, et le bug de titre F2 disparaît avec.

**F4. Menu regroupé** (conséquence des trois fusions)
- Le menu passe de 15 à 11 entrées, réparties en sections :
  - (sans titre) Tableau de bord
  - **Conquête** : Opportunités, Marchés
  - **Exécution** : Cautions, Véhicules, Facturation, Documents
  - **Pilotage** : Pilotage
  - **Administration** : Alertes et e-mails, Utilisateurs, Journal des logs
- Libellés et rôles inchangés, hormis les entrées retirées.

**F5. Nettoyage des dossiers d'offre** (D5) : retirer les `revalidatePath('/dossiers-offre')` devenus inutiles et garder les pages de redirection (anciens liens, favoris).

### Hors de cette vague : D6, les doublons dans les données

Les corriger demande des migrations Prisma sur la base de production : sauvegarde préalable, reprise des données réelles, risque élevé. C'est aussi le terrain de la tâche T13 encore ouverte (suppression des anciens champs). **Proposition** : un chantier séparé, cadré plus tard, après un relevé en lecture seule des valeurs réellement utilisées en production. Les fusions F1 à F5 ne touchent pas au schéma.

### Anti-objectifs

- Un lien existant qui casse : toute URL retirée doit rediriger.
- Un e-mail qui part différemment, ou en plus. L'interface change, l'envoi non.
- Un rôle qui gagne ou perd un accès.

---

## 3. Chantier 2 — Refonte du tableau de bord

### Intention

Le tableau de bord répond à deux questions, dans cet ordre : **« Qu'est-ce que je dois faire maintenant ? »** puis **« Est-ce que l'activité va bien ? »**. Il sert l'action quotidienne, et l'analyse vit dans Pilotage. C'est la « tranche 3 » prévue le 2026-10-02 (tableau de bord opérationnel).

### Principes

1. **Un chiffre par notion**, avec les mêmes définitions que `/pilotage` : on réutilise `lib/pilotage/calculs`, on ne redéfinit rien.
2. **Chaque chiffre mène quelque part** : un clic ouvre la liste filtrée correspondante (les filtres des listes passent déjà par l'URL).
3. **L'urgent d'abord**, ensuite le pipeline, ensuite l'exécution, enfin les finances.
4. **Chaque bloc gère ses états** : chargement (squelette), vide (message utile), erreur partielle (les autres blocs restent affichés, comme sur `/pilotage`).
5. **Lecture en base filtrée** : plus de chargement complet des tables puis de filtrage en JavaScript.
6. Responsive 1920 / 768 / 375, navigation au clavier, contraste AA, pas de mode sombre (CLAUDE.md).

### Structure proposée (de haut en bas)

**① En-tête** : titre, date du jour, et une action principale « Nouvelle opportunité », plus un menu « Créer… » (marché, caution, véhicule, facture).

**② À traiter** (pleine largeur, le cœur de la page) : une seule liste triée par date d'échéance, regroupée par horizon (**En retard**, **Cette semaine**, **Ce mois-ci**). Chaque ligne indique la nature, la fiche, le montant si utile et les jours restants, et mène à sa fiche. Types proposés :
- dates limites de dépôt d'offre (opportunités actives) ;
- cautions actives qui arrivent à échéance ;
- échéances d'attribution provisoire et fins de validité d'offre ;
- marchés en fin d'exécution et livraisons attendues ;
- factures émises, échues et non payées.

Si rien n'est à traiter, la page l'affiche clairement, sans laisser un vide.

**③ Pipeline des offres** : les opportunités actives par phase (en analyse → go → dossier en préparation → offre soumise → en attente d'attribution → attribuée provisoirement), avec le nombre et le montant de chaque phase. Un clic ouvre la liste filtrée sur cette phase (les onglets de phase existent déjà dans la liste des opportunités). Le bug du compte des actives est corrigé ici.

**④ Exécution** : marchés en cours (nombre et montant contractuel, définition unique), véhicules en attente de livraison, cautions actives (montant garanti), interventions SAV ouvertes.

**⑤ Finances** : sur les marchés attribués, facturé / encaissé / reste à facturer, avec la définition de la conversion de `/pilotage`, et un lien « Voir le pilotage ».

**Retirés de la page** : la répartition par statut (camembert), les répartitions des cautions et des véhicules, les montants mensuels, le graphique du CA effectif, « Activité récente », la grille d'actions rapides. Ce qui a une valeur d'analyse existe déjà, ou existera, dans l'onglet Analyses de Pilotage (F1).

### Démarche

1. **Maquette d'abord** : une page HTML sur données fictives, aux trois tailles d'écran. Abel la valide avant tout code.
2. Ensuite le code, bloc par bloc, chaque bloc testé sur la base de test locale.

---

## 4. Découpage en livraisons

Chaque livraison = une PR. La fusion d'une PR sur `main` **déclenche le déploiement en production** : chaque PR doit donc être sûre seule.

| Ordre | Livraison | Contenu | Risque |
|-------|-----------|---------|--------|
| 1 | **Pilotage unifié** (F1) | Inventaire des graphiques validé par Abel (§ 5 ter), puis onglets Indicateurs / Veille / Analyses, redirection `/veille`, dédoublonnage des Analyses, entrée de menu retirée | Faible : aucune migration, aucun e-mail |
| 2 | **SAV dans Véhicules** (F3) + nettoyage dossiers (F5) | Onglet SAV, redirection, retrait des `revalidatePath` morts | Faible |
| 3 | **Alertes et e-mails** (F2) | Onglets, redirection `/admin/reporting`, droits par onglet ; aucun moteur touché ; aucun bouton d'envoi cliqué hors base de test | Moyen : interface des envois réels |
| 4 | **Menu regroupé** (F4) | Sections du menu, après les trois fusions | Faible |
| 5 | **Maquette du tableau de bord** | Page HTML sur données fictives, validée par Abel | Nul : aucun code produit |
| 6 | **Données du tableau de bord** | Action serveur unique, requêtes filtrées en base, définitions partagées avec Pilotage, tests unitaires des règles (horizons, statuts actifs, montants) | Faible |
| 7 | **Nouveau tableau de bord** | Blocs ② à ⑤, retrait des anciens composants, E2E, contrôle aux trois tailles, revue UI/UX | Moyen : page d'accueil de tous les utilisateurs |
| — | **Données dédoublonnées** (D6) | Chantier séparé, à cadrer plus tard | Élevé : migrations en production |

Les livraisons 1 à 4 sont indépendantes entre elles. La 5 peut se faire en parallèle. Les 6 et 7 attendent la validation de la maquette.

### Critères de réussite

- Toute ancienne URL redirige vers son nouvel emplacement (vérifié par E2E).
- Aucune notion n'est affichée avec deux valeurs différentes entre `/` et `/pilotage`.
- Le bloc « À traiter » liste exactement les éléments que les règles définissent (tests unitaires sur les horizons et les statuts).
- Le tableau de bord est utilisable au clavier et sans débordement à 375 px.
- Aucun envoi d'e-mail n'est modifié (même code pour les crons et les envois manuels).

---

## 5. Décisions ouvertes (à trancher par Abel, une par une)

1. ~~Valider les fusions F1 à F4, en particulier la Veille qui devient un onglet de Pilotage, et le menu passé de 15 à 11 entrées.~~ **Tranché (Abel, 2026-11-11) : oui.**
2. ~~Le contenu du bloc « À traiter » : les types d'échéance et les horizons proposés sont-ils les bons ?~~ **Tranché (Abel, 2026-11-11) : liste et horizons validés « de tête », à confirmer sur la maquette (livraison 5), qu'Abel veut voir avant le code.**
3. ~~Le bloc « Finances » : visible par tous les rôles, ou seulement par ADMIN et AVANCE comme Pilotage ?~~ **Tranché (Abel, 2026-11-11) : ADMIN et AVANCE seulement.** Le contrôle se fait côté serveur (les données ne sont pas envoyées aux autres rôles), pas seulement par masquage à l'écran.
4. ~~Les doublons dans les données (D6) : chantier plus tard (recommandé) ou dans la foulée ?~~ **Tranché (Abel, 2026-11-11) : chantier séparé, plus tard.**

## 5 bis. Skills utilisés, par livraison (demande d'Abel, 2026-11-11)

**Sur toutes les livraisons**

| Moment | Skill | Rôle |
|--------|-------|------|
| Avant le code | `superpowers:writing-plans` | Plan détaillé, tâche par tâche, à partir de ce cadrage |
| Démarrage | `branche` | Branche `feat/…` partant de `main` à jour, une par livraison |
| Exécution | `disciplined-execution` | Exécution du plan, protocole de diagnostic si une vérification échoue, garde avant tout geste en production |
| Chaque action structurelle | `disciplines-actives` | Les 5 contrôles et le bloc de preuve |
| Code | `superpowers:test-driven-development` | Test d'abord pour les règles (redirections, droits par rôle, horizons, statuts actifs, montants) |
| Documentation des bibliothèques | `context7-cli` | Next.js 15, Prisma, Recharts, Radix Tabs |
| Tests E2E | `base-test` | Playwright sur la base de test locale, jamais sur la production |
| Interface changée | `apercu` | Aperçu en direct à la taille d'un téléphone, proposé à Abel, lancé seulement sur son « oui » |
| Avant la PR | `superpowers:verification-before-completion`, puis `code-review` | Preuves avant toute annonce, puis revue sur deux axes : normes du dépôt, conformité au cadrage |
| Fin de livraison | `superpowers:finishing-a-development-branch` | Intégration : PR, fusion en squash avec l'accord d'Abel |

**Selon la livraison**

| Livraison | Skills en plus |
|-----------|----------------|
| 1 à 4 (fusions) | Agent `ui-ux-reviewer` sur les pages fusionnées (hiérarchie, responsive, clavier) |
| 3 (Alertes et e-mails) | `security-review` (droits onglet par onglet) ; aucun envoi déclenché, y compris en test |
| 5 (maquette) | `impeccable` (conception de l'écran), `dataviz` (tuiles de chiffres et pipeline), `artifact-design` (page de maquette partagée avec Abel) |
| 6 (données) | `superpowers:test-driven-development` en premier, sans interface |
| 7 (nouveau tableau de bord) | `impeccable` (finition et audit), `dataviz`, agent `ui-ux-reviewer`, `base-test` aux trois tailles d'écran |

À noter : le CLAUDE.md demande `playwright-skill`, qui n'est pas installé. Les tests d'interface passent par `base-test`, qui pilote Playwright sur la base locale.

**Ajouts validés par Abel (2026-11-11), en plus de la liste ci-dessus**

| Skill ou protocole | Où | Règle |
|--------------------|----|-------|
| `agent-browser` | Livraisons 1 à 4 et 7, avant la PR | Contrôle à l'écran de chaque page modifiée (arbre d'accessibilité, clavier, 375 px). Base de test locale et compte de test local seulement. Ne remplace pas les tests Playwright écrits. |
| Protocole de clôture automatique (`disciplined-execution`, `references/auto-closure.md`) | Toutes les livraisons | Enchaîne les tâches d'une livraison ; trois arrêts : vérification ratée, geste distant, fin de livraison. La section « Clôture automatique » du CLAUDE.md doit pointer vers le plan de la livraison en cours (aujourd'hui elle pointe vers l'ancien plan des lots). |
| Protocole de mise en production (`disciplined-execution`, `references/production-steps.md`) | Fin de chaque livraison | Un feu vert séparé pour le push, puis pour la fusion (qui déploie) ; contrôle après déploiement ; retour arrière noté. Aucun e-mail envoyé ; si un test d'envoi devient nécessaire, un seul destinataire : Abel. |
| `superpowers:executing-plans` | Exécution | En direct, sans sous-agents en série : les livraisons sont petites. |
| `simplify` | Après le code de chaque livraison, avant la PR | Relecture uniquement pour retirer le superflu. |

**Écartés** : `frontend-design` (pousse une identité visuelle nouvelle, contraire au design system existant et à la demande de simplicité ; fait doublon avec `impeccable`) ; `astryx` (bibliothèque d'interface supplémentaire, en beta, contraire au CLAUDE.md qui impose shadcn/ui).

**Écriture du code** : le minimum qui résout la tâche (principes Karpathy du CLAUDE.md global). Aucune abstraction pour un usage unique, aucune option non demandée, aucune gestion d'erreur pour un cas impossible. Les tests portent sur les règles métier, pas sur tout.

## 5 ter. Règle des graphiques (demande d'Abel, 2026-11-11)

S'applique au tableau de bord **et** à tout Pilotage (Indicateurs, Veille, Analyses).

1. Un graphique n'existe que s'il répond à une question de décision, écrite en clair.
2. Une notion, un seul endroit, une seule définition.
3. Un chiffre avec une liste plutôt qu'un graphique, quand ils disent la même chose.
4. Pas de camembert.
5. Chaque chiffre est exact au sens de sa définition (statuts inclus ou exclus écrits), et mène à la liste qui le compose.

**Étape ajoutée à la livraison 1** : inventaire de chaque graphique et tableau de Pilotage. Pour chacun : la question à laquelle il répond, et la proposition (garder, fusionner, retirer). **Abel valide la liste avant toute suppression.** Skill : `dataviz`.

## 6. Choix faits par Claude (à vérifier à la lecture)

- Ordre fusion → tableau de bord, et maquette avant le code.
- Aucune fusion de Facturation, Cautions ou Documents : chacun a une liste transversale utile.
- La vue des échéances de `/admin/alertes` disparaît au profit du bloc « À traiter ».
- Les noms « Conquête » et « Exécution » pour les sections du menu.
- Le tableau de bord est le même pour tous les rôles ; seul le bloc Finances dépend de la décision 3.
