## ADDED Requirements

### Requirement: System SHALL manage caution status lifecycle

Le système doit gérer automatiquement et manuellement les transitions de statut des cautions selon leur cycle de vie.

#### Scenario: New caution starts with ACTIVE status
- **WHEN** une nouvelle caution est créée
- **THEN** le système définit automatiquement le statut sur ACTIVE
- **THEN** le système enregistre la date de création dans createdAt

#### Scenario: Automatic transition to EXPIREE on expiration date
- **WHEN** la date courante dépasse la dateEcheance d'une caution ACTIVE
- **THEN** le système doit automatiquement changer le statut de la caution en EXPIREE
- **THEN** le système enregistre la date de transition

#### Scenario: Manual transition from ACTIVE to LIBEREE
- **WHEN** l'utilisateur marque manuellement une caution ACTIVE comme libérée
- **THEN** le système change le statut de la caution en LIBEREE
- **THEN** le système enregistre la date de libération
- **THEN** le système affiche un message de confirmation "Caution marquée comme libérée"

#### Scenario: Manual transition from ACTIVE to APPELEE
- **WHEN** l'utilisateur marque une caution ACTIVE comme appelée par le maître d'ouvrage
- **THEN** le système change le statut de la caution en APPELEE
- **THEN** le système enregistre la date d'appel
- **THEN** le système affiche un avertissement "Caution appelée - Action urgente requise"

#### Scenario: Cannot transition EXPIREE to ACTIVE
- **WHEN** l'utilisateur tente de réactiver une caution EXPIREE
- **THEN** le système affiche un message d'erreur "Impossible de réactiver une caution expirée"
- **THEN** le statut reste EXPIREE

#### Scenario: Cannot transition LIBEREE to any other status
- **WHEN** l'utilisateur tente de modifier le statut d'une caution LIBEREE
- **THEN** le système affiche un message d'erreur "Une caution libérée ne peut pas changer de statut"
- **THEN** le statut reste LIBEREE

### Requirement: System SHALL display caution status with visual indicators

Le système doit afficher le statut des cautions avec des indicateurs visuels distincts.

#### Scenario: ACTIVE status displays with green badge
- **WHEN** le système affiche une caution avec statut ACTIVE
- **THEN** le badge de statut est affiché en vert
- **THEN** le texte du badge indique "Active"

#### Scenario: EXPIREE status displays with red badge
- **WHEN** le système affiche une caution avec statut EXPIREE
- **THEN** le badge de statut est affiché en rouge
- **THEN** le texte du badge indique "Expirée"

#### Scenario: LIBEREE status displays with blue badge
- **WHEN** le système affiche une caution avec statut LIBEREE
- **THEN** le badge de statut est affiché en bleu
- **THEN** le texte du badge indique "Libérée"

#### Scenario: APPELEE status displays with orange badge
- **WHEN** le système affiche une caution avec statut APPELEE
- **THEN** le badge de statut est affiché en orange
- **THEN** le texte du badge indique "Appelée"

### Requirement: System SHALL track caution type throughout lifecycle

Le système doit gérer les 4 types de cautions avec leurs spécificités.

#### Scenario: PROVISOIRE type is displayed correctly
- **WHEN** une caution de type PROVISOIRE est affichée
- **THEN** le système affiche "Caution de soumission" comme libellé
- **THEN** le système affiche une description "Garantie déposée lors du dépôt de l'offre"

#### Scenario: DEFINITIVE type is displayed correctly
- **WHEN** une caution de type DEFINITIVE est affichée
- **THEN** le système affiche "Caution de bonne exécution" comme libellé
- **THEN** le système affiche une description "Garantie de bonne exécution du marché"

#### Scenario: AVANCE type is displayed correctly
- **WHEN** une caution de type AVANCE est affichée
- **THEN** le système affiche "Caution d'avance de démarrage" comme libellé
- **THEN** le système affiche une description "Garantie pour avance de démarrage"

#### Scenario: RETENUE_GARANTIE type is displayed correctly
- **WHEN** une caution de type RETENUE_GARANTIE est affichée
- **THEN** le système affiche "Caution de retenue de garantie" comme libellé
- **THEN** le système affiche une description "Garantie en remplacement de retenue de garantie"

### Requirement: System SHALL calculate remaining validity period

Le système doit calculer et afficher la période de validité restante des cautions actives.

#### Scenario: Active caution shows remaining days
- **WHEN** une caution est ACTIVE et la dateEcheance est dans le futur
- **THEN** le système calcule le nombre de jours restants jusqu'à l'échéance
- **THEN** le système affiche "X jours restants" où X est le nombre calculé

#### Scenario: Caution expiring soon shows warning
- **WHEN** une caution ACTIVE a moins de 30 jours avant l'échéance
- **THEN** le système affiche un indicateur d'avertissement (icône orange)
- **THEN** le système affiche "Expire bientôt : X jours"

#### Scenario: Caution expiring very soon shows critical warning
- **WHEN** une caution ACTIVE a moins de 7 jours avant l'échéance
- **THEN** le système affiche un indicateur critique (icône rouge)
- **THEN** le système affiche "Expiration imminente : X jours"

#### Scenario: Expired caution shows negative days
- **WHEN** une caution EXPIREE est affichée
- **THEN** le système affiche "Expirée depuis X jours"
- **THEN** le système affiche un badge rouge avec "Expirée"

#### Scenario: Liberated caution does not show remaining days
- **WHEN** une caution LIBEREE est affichée
- **THEN** le système n'affiche pas de période de validité restante
- **THEN** le système affiche uniquement "Libérée le [date]"

### Requirement: System SHALL provide status transition history

Le système doit conserver un historique des transitions de statut pour audit.

#### Scenario: Status changes are timestamped
- **WHEN** le statut d'une caution change
- **THEN** le système met à jour le champ updatedAt avec la date/heure actuelle
- **THEN** le système conserve cette information pour traçabilité

#### Scenario: User can view status change history
- **WHEN** l'utilisateur consulte le détail d'une caution
- **THEN** le système affiche la date de création (createdAt)
- **THEN** le système affiche la date de dernière modification (updatedAt)
- **THEN** le système affiche le statut actuel avec sa signification
