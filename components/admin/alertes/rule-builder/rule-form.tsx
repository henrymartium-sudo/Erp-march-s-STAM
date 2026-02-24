'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ConditionEditor } from './condition-editor'
import { ChannelSelector } from './channel-selector'
import { RecipientPicker } from './recipient-picker'
import { AlertesHelpPanel } from './help-panel'
import { FrequencySelector } from './frequency-selector'
import { ExternalEmailsInput } from './external-emails-input'
import type { RecipePayload } from './help-panel'
import { createAlertRule, updateAlertRule } from '@/lib/actions/alert-rules'
import { toast } from '@/lib/utils/toast'
import { EVENT_TYPE_LABELS } from '@/lib/alertes/types'
import type { AlertRule } from '@prisma/client'
import type { RuleCondition, AlertEventType, RuleConditions, ScheduleConfig } from '@/lib/alertes/types'

interface Props {
  rule?: AlertRule
}

export function RuleForm({ rule }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [name, setName]               = useState(rule?.name ?? '')
  const [description, setDescription] = useState(rule?.description ?? '')
  const [eventType, setEventType]     = useState<AlertEventType | ''>((rule?.eventType as AlertEventType) ?? '')
  const [operator, setOperator]       = useState<'AND' | 'OR'>(() => {
    const c = rule?.conditions as RuleConditions | undefined
    return c?.operator ?? 'AND'
  })
  const [conditions, setConditions]   = useState<RuleCondition[]>(() => {
    const c = rule?.conditions as RuleConditions | undefined
    return c?.conditions ?? []
  })
  const [channels, setChannels]       = useState<string[]>(rule?.channels ?? ['IN_APP'])
  const [webhookUrl, setWebhookUrl]   = useState(rule?.webhookUrl ?? '')
  const [targetRoles, setTargetRoles] = useState<string[]>(rule?.targetRoles ?? ['ADMIN'])
  const [priority, setPriority]       = useState(rule?.priority ?? 1)
  const [cooldown, setCooldown]       = useState(rule?.cooldownMinutes ?? 1440)
  const [isActive, setIsActive]       = useState(rule?.isActive ?? true)
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig | null>(() => {
    return (rule?.scheduleConfig as ScheduleConfig | null) ?? null
  })
  const [externalEmails, setExternalEmails] = useState<string[]>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (rule as any)?.externalEmails ?? []
  )

  // État pour le panel d'aide contextuel
  const [activeField, setActiveField] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventType) { toast.error('Sélectionner un type d\'événement'); return }
    if (channels.length === 0) { toast.error('Sélectionner au moins un canal'); return }
    if (targetRoles.length === 0) { toast.error('Sélectionner au moins un rôle'); return }

    setLoading(true)
    const payload = {
      name,
      description,
      eventType,
      conditions: { operator, conditions },
      channels,
      webhookUrl,
      targetRoles,
      targetUserIds: [],
      priority,
      cooldownMinutes: cooldown,
      isActive,
      scheduleConfig,
      externalEmails,
    }

    const result = rule
      ? await updateAlertRule(rule.id, payload)
      : await createAlertRule(payload)

    setLoading(false)

    if (result.success) {
      toast.success(rule ? 'Règle mise à jour' : 'Règle créée')
      router.push('/admin/alertes/rules')
    } else {
      toast.error(result.error ?? 'Erreur')
    }
  }

  // Pré-remplir le formulaire depuis une recette
  const handleUseRecipe = (recipe: RecipePayload) => {
    setName(recipe.name)
    setDescription(recipe.description)
    setEventType(recipe.eventType as AlertEventType)
    setOperator(recipe.conditions.operator)
    setConditions(recipe.conditions.conditions as RuleCondition[])
    setChannels(recipe.channels)
    setTargetRoles(recipe.targetRoles)
    setCooldown(recipe.cooldownMinutes)
    setPriority(recipe.priority)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

      {/* ── Formulaire principal ── */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Informations générales */}
        <div className="space-y-4">
          <div onFocus={() => setActiveField(null)}>
            <Label htmlFor="name">Nom de la règle *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1"
              placeholder="Ex : Caution critique (≤ 7 jours)"
            />
          </div>

          <div onFocus={() => setActiveField(null)}>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 resize-none"
              rows={2}
              placeholder="Description optionnelle de la règle"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1" onFocus={() => setActiveField('eventType')}>
              <Label>Type d'événement *</Label>
              <Select
                value={eventType}
                onValueChange={(v) => {
                  setEventType(v as AlertEventType)
                  setConditions([])
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un événement..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-24" onFocus={() => setActiveField('priority')}>
              <Label htmlFor="priority">Priorité</Label>
              <Input
                id="priority"
                type="number"
                min={1}
                max={10}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Conditions */}
        <div onFocus={() => setActiveField('conditions')}>
          <h3 className="font-medium mb-3">Conditions de déclenchement</h3>
          <ConditionEditor
            eventType={eventType}
            operator={operator}
            conditions={conditions}
            onOperatorChange={setOperator}
            onConditionsChange={setConditions}
            onFieldFocus={setActiveField}
          />
        </div>

        <Separator />

        {/* Canaux */}
        <div onFocus={() => setActiveField('channels')}>
          <h3 className="font-medium mb-3">Canaux de notification *</h3>
          <ChannelSelector
            channels={channels}
            webhookUrl={webhookUrl}
            onChannelsChange={setChannels}
            onWebhookUrlChange={setWebhookUrl}
          />
        </div>

        <Separator />

        {/* Destinataires */}
        <div onFocus={() => setActiveField('targetRoles')}>
          <h3 className="font-medium mb-3">Rôles destinataires *</h3>
          <RecipientPicker targetRoles={targetRoles} onRolesChange={setTargetRoles} />
        </div>

        <Separator />

        {/* Emails externes */}
        <div onFocus={() => setActiveField(null)}>
          <h3 className="font-medium mb-3">Emails externes</h3>
          <ExternalEmailsInput
            value={externalEmails}
            onChange={setExternalEmails}
          />
        </div>

        <Separator />

        {/* Planification */}
        <div onFocus={() => setActiveField(null)}>
          <h3 className="font-medium mb-3">Planification</h3>
          <FrequencySelector
            value={scheduleConfig}
            onChange={setScheduleConfig}
          />
        </div>

        <Separator />

        {/* Options avancées */}
        <div className="space-y-4">
          <div onFocus={() => setActiveField('cooldown')}>
            <Label htmlFor="cooldown">Cooldown (minutes) — fenêtre d'idempotence</Label>
            <Input
              id="cooldown"
              type="number"
              min={0}
              value={cooldown}
              onChange={(e) => setCooldown(Number(e.target.value))}
              className="mt-1 w-40"
            />
            <p className="text-xs text-muted-foreground mt-1">
              1440 = 24h (recommandé). 0 = toujours déclencher.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="active"
              checked={isActive}
              onCheckedChange={(c) => setIsActive(!!c)}
            />
            <Label htmlFor="active" className="cursor-pointer">Règle active</Label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Enregistrement...' : rule ? 'Mettre à jour' : 'Créer la règle'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Annuler
          </Button>
        </div>
      </form>

      {/* ── Panel d'aide contextuel ── */}
      <AlertesHelpPanel
        activeField={activeField}
        onUseRecipe={handleUseRecipe}
        className="lg:sticky lg:top-4"
      />
    </div>
  )
}
