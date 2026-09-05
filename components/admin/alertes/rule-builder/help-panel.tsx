'use client'

import { BookOpen, ChevronDown, ChevronUp, Lightbulb, Zap } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HelpContent {
  title: string
  description: string
  example?: string
  tip?: string
}

interface RecipePayload {
  name: string
  description: string
  eventType: string
  conditions: {
    operator: 'AND' | 'OR'
    conditions: { field: string; op: string; value: string | number }[]
  }
  channels: string[]
  targetRoles: string[]
  cooldownMinutes: number
  priority: number
}

interface Recipe {
  name: string
  event: string
  conditions: string
  channels: string
  payload: RecipePayload
}

// ─── Contenu d'aide par champ ─────────────────────────────────────────────────

const HELP_CONTENT: Record<string, HelpContent> = {
  eventType: {
    title: "Type d'événement",
    description: "Choisissez ce qui déclenche l'alerte. Chaque événement correspond à une action dans l'ERP.",
    example: "« Caution proche échéance » se déclenche chaque jour via le cron à 7h pour toutes les cautions concernées.",
    tip: "Commencez par CAUTION_EXPIRING et MARCHE_STATUS_CHANGED — ce sont les plus utiles au quotidien.",
  },
  conditions: {
    title: "Conditions de déclenchement",
    description: "Filtrez les événements selon leurs propriétés. Sans condition, l'alerte se déclenche pour tous les événements du type sélectionné.",
    example: "joursRestants ≤ 7 → déclenche seulement quand il reste 7 jours ou moins.",
    tip: "Combinez plusieurs conditions avec ET (AND) pour être plus précis, ou OU (OR) pour couvrir plusieurs cas.",
  },
  ancienStatut: {
    title: "Ancien statut",
    description: "Le statut du marché AVANT le changement. Utile pour détecter des transitions spécifiques.",
    example: "ancienStatut = SOUMIS → déclenche uniquement quand un marché quitte l'état Soumis.",
    tip: "Combinez avec nouveauStatut pour surveiller une transition précise (ex: SOUMIS → ATTRIBUE).",
  },
  nouveauStatut: {
    title: "Nouveau statut",
    description: "Le statut du marché APRÈS le changement. C'est le champ le plus utilisé pour MARCHE_STATUS_CHANGED.",
    example: "nouveauStatut = ATTRIBUE → vous notifie dès qu'un marché est attribué.",
    tip: "Pour surveiller plusieurs statuts d'arrivée, utilisez l'opérateur « dans la liste » (in).",
  },
  statut: {
    title: "Statut",
    description: "Le statut actuel de la caution ou du marché au moment du déclenchement du cron.",
    example: "statut = ACTIVE → l'alerte ne se déclenche que pour les cautions encore actives.",
    tip: "Toujours filtrer sur ACTIVE pour les cautions — inutile d'alerter sur des cautions déjà libérées.",
  },
  joursRestants: {
    title: "Jours restants",
    description: "Nombre de jours avant l'échéance, calculé chaque nuit à 7h par le cron.",
    example: "joursRestants ≤ 30 → déclenche 30 jours avant échéance.",
    tip: "Créez deux règles : une à 30 jours (IN_APP) et une à 7 jours (EMAIL + IN_APP) pour une escalade progressive.",
  },
  montant: {
    title: "Montant (XOF)",
    description: "Montant de la caution en francs CFA. Permet de prioriser les alertes sur les grosses cautions.",
    example: "montant ≥ 5000000 → alerte uniquement les cautions de plus de 5M XOF.",
  },
  heuresDepassement: {
    title: "Heures de dépassement SLA",
    description: "Nombre d'heures écoulées depuis le dépassement du délai de résolution d'une intervention SAV.",
    example: "heuresDepassement ≥ 48 → escalade si l'intervention n'est pas résolue après 2 jours de retard.",
  },
  channels: {
    title: "Canaux de notification",
    description: "Où envoyer l'alerte. Vous pouvez activer plusieurs canaux simultanément.",
    example: "EMAIL + IN_APP → l'utilisateur reçoit un email ET voit la cloche rouge dans l'ERP.",
    tip: "IN_APP suffit pour les alertes informatives. Réservez EMAIL pour les alertes critiques nécessitant une action rapide.",
  },
  targetRoles: {
    title: "Rôles destinataires",
    description: "Qui reçoit l'alerte. ADMIN et AVANCE ont accès à toutes les fonctionnalités. EXPLOITATION ne voit que les marchés EN_EXECUTION.",
    tip: "Pour les alertes critiques (caution ≤ 7j), notifiez ADMIN + AVANCE. Pour les infos générales, EXPLOITATION suffit.",
  },
  cooldown: {
    title: "Cooldown (fenêtre d'idempotence)",
    description: "Durée minimale en minutes entre deux déclenchements de la même règle sur le même objet. Évite le spam.",
    example: "1440 min = 24h → maximum 1 notification par jour par objet (recommandé pour les crons).",
    tip: "Mettez 0 seulement pour MARCHE_STATUS_CHANGED — chaque changement de statut est unique et doit toujours notifier.",
  },
  priority: {
    title: "Priorité",
    description: "Niveau de priorité de 1 (plus haute) à 10 (plus basse). Utilisé pour trier les notifications dans l'historique.",
    example: "Priorité 1 → caution critique ≤ 7j. Priorité 5 → marché en fin d'exécution 30j.",
    tip: "Réservez 1-2 pour les urgences réelles (cautions ≤ 7j, SLA dépassé). Utilisez 3-5 pour les alertes de suivi.",
  },
}

// ─── Recettes ─────────────────────────────────────────────────────────────────

const RECIPES: Recipe[] = [
  {
    name: "🚨 Caution critique (≤ 7 jours)",
    event: "Caution proche échéance",
    conditions: "joursRestants ≤ 7 ET statut = ACTIVE",
    channels: "EMAIL + IN_APP",
    payload: {
      name: "Caution critique (≤ 7 jours)",
      description: "Alerte urgente quand une caution active expire dans moins de 7 jours",
      eventType: "CAUTION_EXPIRING",
      conditions: {
        operator: "AND",
        conditions: [
          { field: "joursRestants", op: "lte", value: 7 },
          { field: "statut", op: "eq", value: "ACTIVE" },
        ],
      },
      channels: ["EMAIL", "IN_APP"],
      targetRoles: ["ADMIN", "AVANCE"],
      cooldownMinutes: 1440,
      priority: 1,
    },
  },
  {
    name: "🏆 Marché attribué",
    event: "Changement de statut marché",
    conditions: "nouveauStatut = ATTRIBUE",
    channels: "IN_APP",
    payload: {
      name: "Marché attribué",
      description: "Notifie l'équipe dès qu'un marché est attribué",
      eventType: "MARCHE_STATUS_CHANGED",
      conditions: {
        operator: "AND",
        conditions: [{ field: "nouveauStatut", op: "eq", value: "ATTRIBUE" }],
      },
      channels: ["IN_APP"],
      targetRoles: ["ADMIN", "AVANCE", "EXPLOITATION"],
      cooldownMinutes: 0,
      priority: 2,
    },
  },
  {
    name: "📅 Marché fin d'exécution (≤ 30 jours)",
    event: "Marché en fin d'exécution",
    conditions: "joursRestants ≤ 30 ET statut = EN_EXECUTION",
    channels: "IN_APP",
    payload: {
      name: "Marché fin d'exécution (≤ 30 jours)",
      description: "Rappel 30 jours avant la fin d'un marché en cours",
      eventType: "MARCHE_EXPIRING",
      conditions: {
        operator: "AND",
        conditions: [
          { field: "joursRestants", op: "lte", value: 30 },
          { field: "statut", op: "eq", value: "EN_EXECUTION" },
        ],
      },
      channels: ["IN_APP"],
      targetRoles: ["ADMIN", "AVANCE"],
      cooldownMinutes: 1440,
      priority: 3,
    },
  },
  {
    name: "🔧 SLA SAV dépassé (≥ 48h)",
    event: "Dépassement SLA SAV",
    conditions: "heuresDepassement ≥ 48",
    channels: "EMAIL",
    payload: {
      name: "SLA SAV dépassé (≥ 48h)",
      description: "Escalade si une intervention SAV dépasse 48h sans résolution",
      eventType: "SAV_SLA_BREACH",
      conditions: {
        operator: "AND",
        conditions: [{ field: "heuresDepassement", op: "gte", value: 48 }],
      },
      channels: ["EMAIL"],
      targetRoles: ["ADMIN"],
      cooldownMinutes: 360,
      priority: 2,
    },
  },
  {
    name: "📄 Document expirant (≤ 14 jours)",
    event: "Document expirant",
    conditions: "joursRestants ≤ 14",
    channels: "IN_APP",
    payload: {
      name: "Document expirant (≤ 14 jours)",
      description: "Prévient 14 jours avant l'expiration d'un document",
      eventType: "DOCUMENT_EXPIRING",
      conditions: {
        operator: "AND",
        conditions: [{ field: "joursRestants", op: "lte", value: 14 }],
      },
      channels: ["IN_APP"],
      targetRoles: ["ADMIN", "AVANCE"],
      cooldownMinutes: 1440,
      priority: 4,
    },
  },
]

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  activeField: string | null
  onUseRecipe?: (recipe: RecipePayload) => void
  className?: string
}

export function AlertesHelpPanel({ activeField, onUseRecipe, className }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const content = activeField ? (HELP_CONTENT[activeField] ?? null) : null

  return (
    <aside className={cn("rounded-xl border bg-card shadow-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold">
            {content ? content.title : "Guide d'utilisation"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(v => !v)}
          className="rounded p-1 hover:bg-muted text-muted-foreground"
          aria-label={collapsed ? "Afficher l'aide" : "Masquer l'aide"}
        >
          {collapsed
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronUp className="h-4 w-4" />
          }
        </button>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4 text-sm">
          {content ? (
            // ── Aide contextuelle champ actif ──
            <div className="space-y-3">
              <p className="text-muted-foreground leading-relaxed">{content.description}</p>

              {content.example && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                  <p className="text-xs font-medium text-blue-700 mb-1">Exemple</p>
                  <p className="text-xs text-blue-600">{content.example}</p>
                </div>
              )}

              {content.tip && (
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                  <p className="text-xs font-medium text-amber-700 mb-1">💡 Conseil</p>
                  <p className="text-xs text-amber-600">{content.tip}</p>
                </div>
              )}
            </div>
          ) : (
            // ── État repos : recettes ──
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Recettes prêtes à l&apos;emploi
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Cliquez sur une recette pour pré-remplir le formulaire en 1 clic.
              </p>

              <div className="space-y-2">
                {RECIPES.map((recipe) => (
                  <div
                    key={recipe.name}
                    className="rounded-lg border bg-muted p-3 space-y-1.5"
                  >
                    <p className="font-medium text-xs leading-snug">{recipe.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Événement : </span>{recipe.event}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Conditions : </span>{recipe.conditions}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Canaux : </span>{recipe.channels}
                    </p>
                    {onUseRecipe && (
                      <button
                        type="button"
                        onClick={() => onUseRecipe(recipe.payload)}
                        className="mt-1 flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Zap className="h-3 w-3" />
                        Utiliser ce modèle
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

export type { RecipePayload }
