## ADDED Requirements

### Requirement: System SHALL generate alerts for expiring cautions

Le système doit générer automatiquement des alertes pour les cautions proches de leur date d'échéance.

#### Scenario: Alert generated 30 days before expiration
- **WHEN** une caution ACTIVE atteint 30 jours avant sa dateEcheance
- **THEN** le système crée une alerte avec type CAUTION_EXPIRATION_30J
- **THEN** le système définit le message "La caution [référence] expire dans 30 jours"
- **THEN** l'alerte est associée à la caution concernée (cautionId)
- **THEN** l'alerte est marquée comme non envoyée (envoyee = false)

#### Scenario: Alert generated 15 days before expiration
- **WHEN** une caution ACTIVE atteint 15 jours avant sa dateEcheance
- **THEN** le système crée une alerte avec type CAUTION_EXPIRATION_15J
- **THEN** le système définit le message "ATTENTION : La caution [référence] expire dans 15 jours"
- **THEN** l'alerte est associée à la caution concernée

#### Scenario: Alert generated 7 days before expiration
- **WHEN** une caution ACTIVE atteint 7 jours avant sa dateEcheance
- **THEN** le système crée une alerte avec type CAUTION_EXPIRATION_7J
- **THEN** le système définit le message "URGENT : La caution [référence] expire dans 7 jours"
- **THEN** l'alerte est marquée avec priorité élevée

#### Scenario: No duplicate alerts for same threshold
- **WHEN** une alerte existe déjà pour une caution et un seuil donné (30j, 15j, 7j)
- **THEN** le système ne crée pas de nouvelle alerte pour ce même seuil
- **THEN** le système vérifie l'existence avant création via cautionId + type

#### Scenario: No alerts for LIBEREE cautions
- **WHEN** une caution a le statut LIBEREE
- **THEN** le système ne génère aucune alerte d'expiration
- **THEN** les alertes existantes non envoyées sont marquées comme obsolètes

#### Scenario: No alerts for EXPIREE cautions
- **WHEN** une caution a le statut EXPIREE
- **THEN** le système ne génère plus d'alertes d'expiration
- **THEN** une alerte de type CAUTION_EXPIREE est créée si pas déjà envoyée

### Requirement: System SHALL display alerts in user interface

Le système doit afficher les alertes dans l'interface utilisateur pour notification immédiate.

#### Scenario: Dashboard shows pending caution alerts
- **WHEN** l'utilisateur accède au dashboard principal
- **THEN** le système affiche une section "Alertes Cautions" avec les alertes non résolues
- **THEN** chaque alerte affiche : type, message, caution concernée, date de l'alerte
- **THEN** les alertes sont triées par priorité (7j > 15j > 30j) puis par date

#### Scenario: Caution detail page shows associated alerts
- **WHEN** l'utilisateur consulte le détail d'une caution
- **THEN** le système affiche toutes les alertes liées à cette caution
- **THEN** chaque alerte affiche son statut (envoyée ou en attente)
- **THEN** les alertes expirées ou obsolètes sont masquées par défaut

#### Scenario: Alert severity is visually indicated
- **WHEN** le système affiche une alerte 30j
- **THEN** l'alerte utilise un badge jaune avec icône d'information
- **WHEN** le système affiche une alerte 15j
- **THEN** l'alerte utilise un badge orange avec icône d'avertissement
- **WHEN** le système affiche une alerte 7j
- **THEN** l'alerte utilise un badge rouge avec icône d'urgence

#### Scenario: User can mark alert as acknowledged
- **WHEN** l'utilisateur clique sur "Marquer comme vue" sur une alerte
- **THEN** le système met à jour l'alerte avec un flag "acknowledged"
- **THEN** l'alerte disparaît de la liste des alertes actives
- **THEN** l'alerte reste consultable dans l'historique

### Requirement: System SHALL prepare alerts for email notification

Le système doit préparer les alertes pour envoi par email (implémentation future avec Vercel Cron).

#### Scenario: Alert data is stored for email sending
- **WHEN** une alerte est créée
- **THEN** le système stocke le message complet dans le champ message
- **THEN** le système stocke la dateAlerte (timestamp de création)
- **THEN** le champ envoyee est initialisé à false
- **THEN** le champ dateEnvoi est initialisé à null

#### Scenario: Alert references correct entities
- **WHEN** une alerte de caution est créée
- **THEN** le champ cautionId est renseigné avec l'ID de la caution
- **THEN** le champ marcheId est renseigné avec l'ID du marché associé à la caution
- **THEN** ces références permettront de générer des liens dans l'email

#### Scenario: Alert message is clear and actionable
- **WHEN** une alerte est créée
- **THEN** le message contient la référence de la caution
- **THEN** le message contient le type de caution (PROVISOIRE, DEFINITIVE, etc.)
- **THEN** le message contient le numéro du marché associé
- **THEN** le message contient la date d'échéance exacte
- **THEN** le message contient une action recommandée ("Renouveler la caution avant expiration")

### Requirement: System SHALL provide alert statistics and monitoring

Le système doit fournir des statistiques sur les alertes pour le monitoring.

#### Scenario: Count of pending alerts is displayed
- **WHEN** l'utilisateur accède au dashboard
- **THEN** le système affiche le nombre total d'alertes non envoyées
- **THEN** le système affiche le nombre d'alertes critiques (7j)
- **THEN** le système affiche le nombre d'alertes d'avertissement (15j)

#### Scenario: Alert history is accessible
- **WHEN** l'utilisateur accède à la section historique des alertes
- **THEN** le système affiche toutes les alertes envoyées avec leur date d'envoi
- **THEN** le système affiche toutes les alertes créées avec leur statut
- **THEN** les alertes peuvent être filtrées par type et par date

#### Scenario: Expired cautions without action show warning
- **WHEN** une caution EXPIREE n'a pas de statut LIBEREE
- **THEN** le système affiche un avertissement dans le dashboard
- **THEN** le message indique "Caution expirée non libérée : risque de blocage de trésorerie"
- **THEN** un compteur de cautions expirées non libérées est visible

### Requirement: System SHALL calculate next alert date

Le système doit calculer et afficher la prochaine date d'alerte pour chaque caution.

#### Scenario: Next alert date is displayed for active caution
- **WHEN** une caution ACTIVE est affichée
- **THEN** le système calcule la prochaine date d'alerte selon les seuils (30j, 15j, 7j)
- **THEN** le système affiche "Prochaine alerte le [date]" si applicable
- **THEN** si tous les seuils sont passés, le système affiche "Expiration le [date]"

#### Scenario: No next alert for cautions expiring beyond 30 days
- **WHEN** une caution ACTIVE expire dans plus de 30 jours
- **THEN** le système affiche "Prochaine alerte le [date - 30j]"
- **THEN** le type d'alerte indiqué est "Alerte 30 jours"

#### Scenario: Multiple upcoming alerts are indicated
- **WHEN** une caution est à 20 jours de l'échéance
- **THEN** le système indique que l'alerte 30j a été générée
- **THEN** le système indique "Prochaine alerte : 15 jours (dans 5 jours)"
- **THEN** le système affiche un compte à rebours visuel
