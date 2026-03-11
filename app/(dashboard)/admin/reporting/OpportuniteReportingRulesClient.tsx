"use client"

/**
 * app/(dashboard)/admin/reporting/OpportuniteReportingRulesClient.tsx
 * Interface de gestion des règles de reporting email Opportunités.
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createOpportuniteReportingRule,
  updateOpportuniteReportingRule,
  deleteOpportuniteReportingRule,
  toggleOpportuniteReportingRule,
  sendOpportuniteReportingRuleNow,
} from "@/lib/actions/opportunite-reporting-rules"
import type { ReportingScheduleConfig } from "@/lib/cron/reporting-processor"
import { toast } from "@/lib/utils/toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Send, Pencil, Trash2, Power } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"

// ============================================================
// TYPES
// ============================================================

interface SerializedOpportuniteReportingRule {
  id: string
  name: string
  description: string | null
  recipientEmails: string[]
  scheduleConfig: ReportingScheduleConfig | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================
// CONSTANTES
// ============================================================

const SCHEDULE_TYPE_LABELS = {
  DAILY: "Quotidien",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuel",
  MANUAL: "Manuel uniquement",
}

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const HOURS = Array.from({ length: 24 }, (_, i) => i)

// ============================================================
// HELPERS
// ============================================================

function formatSchedule(config: ReportingScheduleConfig | null): string {
  if (!config || config.type === "MANUAL") return "Manuel"
  const hourStr = `${config.hour}h00`
  switch (config.type) {
    case "DAILY": return `Quotidien à ${hourStr}`
    case "WEEKLY": {
      if (!config.days || config.days.length === 0) return `Hebdo à ${hourStr}`
      const days = config.days.map((d) => DAY_LABELS[d - 1]).join(", ")
      return `${days} à ${hourStr}`
    }
    case "MONTHLY": {
      if (!config.days || config.days.length === 0) return `Mensuel à ${hourStr}`
      return `Le ${config.days.join("/")} du mois à ${hourStr}`
    }
    default: return "Manuel"
  }
}

// ============================================================
// FORM STATE
// ============================================================

interface FormState {
  name: string
  description: string
  recipientEmails: string[]
  scheduleType: "DAILY" | "WEEKLY" | "MONTHLY" | "MANUAL"
  hour: number
  days: number[]
  isActive: boolean
}

function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    recipientEmails: [],
    scheduleType: "DAILY",
    hour: 8,
    days: [],
    isActive: true,
  }
}

function ruleToForm(rule: SerializedOpportuniteReportingRule): FormState {
  const config = rule.scheduleConfig
  return {
    name: rule.name,
    description: rule.description ?? "",
    recipientEmails: rule.recipientEmails,
    scheduleType: config?.type ?? "MANUAL",
    hour: config?.hour ?? 8,
    days: config?.days ?? [],
    isActive: rule.isActive,
  }
}

function formToPayload(form: FormState) {
  const scheduleConfig: ReportingScheduleConfig | null =
    form.scheduleType === "MANUAL"
      ? null
      : {
          type: form.scheduleType,
          hour: form.hour,
          ...(form.scheduleType !== "DAILY" && form.days.length > 0
            ? { days: form.days }
            : {}),
        }
  return {
    name: form.name,
    description: form.description || undefined,
    recipientEmails: form.recipientEmails,
    scheduleConfig,
    isActive: form.isActive,
  }
}

// ============================================================
// EmailTagInput
// ============================================================

function EmailTagInput({
  emails,
  onChange,
}: {
  emails: string[]
  onChange: (emails: string[]) => void
}) {
  const [input, setInput] = useState("")
  const [error, setError] = useState("")

  function addEmail() {
    const val = input.trim().toLowerCase()
    if (!val) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setError("Email invalide")
      return
    }
    if (emails.includes(val)) {
      setError("Email déjà ajouté")
      return
    }
    onChange([...emails, val])
    setInput("")
    setError("")
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => { setInput(e.target.value); setError("") }}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
          placeholder="email@exemple.com"
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addEmail}>
          Ajouter
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-1">
        {emails.map((email) => (
          <Badge
            key={email}
            variant="secondary"
            className="cursor-pointer"
            onClick={() => onChange(emails.filter((e) => e !== email))}
          >
            {email} ×
          </Badge>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// ScheduleConfigSection
// ============================================================

function ScheduleConfigSection({
  form,
  onChange,
}: {
  form: FormState
  onChange: (patch: Partial<FormState>) => void
}) {
  const toggleDay = (day: number) => {
    const next = form.days.includes(day)
      ? form.days.filter((d) => d !== day)
      : [...form.days, day].sort()
    onChange({ days: next })
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Type de planification</Label>
        <Select
          value={form.scheduleType}
          onValueChange={(v) => onChange({ scheduleType: v as FormState["scheduleType"], days: [] })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SCHEDULE_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {form.scheduleType !== "MANUAL" && (
        <div>
          <Label>Heure d&apos;envoi</Label>
          <Select
            value={String(form.hour)}
            onValueChange={(v) => onChange({ hour: Number(v) })}
          >
            <SelectTrigger className="mt-1 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((h) => (
                <SelectItem key={h} value={String(h)}>{h}h00</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {form.scheduleType === "WEEKLY" && (
        <div>
          <Label>Jours de la semaine</Label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {DAY_LABELS.map((label, i) => {
              const day = i + 1
              return (
                <Button
                  key={day}
                  type="button"
                  size="sm"
                  variant={form.days.includes(day) ? "default" : "outline"}
                  onClick={() => toggleDay(day)}
                  className="w-12"
                >
                  {label}
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {form.scheduleType === "MONTHLY" && (
        <div>
          <Label>Jour du mois (ex: 1, 15)</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={form.days[0] ?? ""}
            onChange={(e) => {
              const v = parseInt(e.target.value)
              onChange({ days: isNaN(v) ? [] : [Math.min(31, Math.max(1, v))] })
            }}
            className="mt-1 w-24"
          />
        </div>
      )}
    </div>
  )
}

// ============================================================
// Dialog Formulaire
// ============================================================

function OpportuniteReportingRuleDialog({
  open,
  onClose,
  rule,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  rule: SerializedOpportuniteReportingRule | null
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(rule ? ruleToForm(rule) : emptyForm())
  const [isPending, startTransition] = useTransition()

  function patch(p: Partial<FormState>) {
    setForm((f) => ({ ...f, ...p }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = formToPayload(form)
    startTransition(async () => {
      const result = rule
        ? await updateOpportuniteReportingRule(rule.id, payload)
        : await createOpportuniteReportingRule(payload)

      if (result.success) {
        toast.success(rule ? "Règle mise à jour" : "Règle créée")
        onSaved()
        onClose()
      } else {
        toast.error(result.error ?? "Erreur")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {rule ? "Modifier la règle" : "Nouvelle règle — Suivi Opportunités"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="name">Nom de la règle *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="ex: Suivi hebdo opportunités"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="desc">Description (optionnel)</Label>
            <Input
              id="desc"
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs text-blue-700 font-medium">
              ℹ️ Ce rapport inclut <strong>toutes les opportunités</strong> sans filtre.
              Chaque email contiendra le tableau synthétique complet avec décomptes des échéances.
            </p>
          </div>

          <div>
            <Label className="mb-1 block">Destinataires *</Label>
            <EmailTagInput
              emails={form.recipientEmails}
              onChange={(emails) => patch({ recipientEmails: emails })}
            />
          </div>

          <div>
            <Label className="mb-2 block">Planification</Label>
            <ScheduleConfigSection form={form} onChange={patch} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={form.isActive}
              onCheckedChange={(checked) => patch({ isActive: checked === true })}
            />
            <Label htmlFor="isActive">Règle active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement..." : rule ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export function OpportuniteReportingRulesClient({
  initialRules,
}: {
  initialRules: SerializedOpportuniteReportingRule[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<SerializedOpportuniteReportingRule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SerializedOpportuniteReportingRule | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  function refresh() {
    startTransition(() => router.refresh())
  }

  function openCreate() {
    setEditingRule(null)
    setDialogOpen(true)
  }

  function openEdit(rule: SerializedOpportuniteReportingRule) {
    setEditingRule(rule)
    setDialogOpen(true)
  }

  async function handleDelete(rule: SerializedOpportuniteReportingRule) {
    const result = await deleteOpportuniteReportingRule(rule.id)
    if (result.success) {
      toast.success("Règle supprimée")
      refresh()
    } else {
      toast.error(result.error ?? "Erreur")
    }
    setDeleteTarget(null)
  }

  async function handleToggle(rule: SerializedOpportuniteReportingRule) {
    const result = await toggleOpportuniteReportingRule(rule.id, !rule.isActive)
    if (result.success) {
      toast.success(rule.isActive ? "Règle désactivée" : "Règle activée")
      refresh()
    } else {
      toast.error(result.error ?? "Erreur")
    }
  }

  async function handleSendNow(rule: SerializedOpportuniteReportingRule) {
    setSendingId(rule.id)
    const result = await sendOpportuniteReportingRuleNow(rule.id)
    setSendingId(null)
    if (result.success) {
      toast.success(`Email envoyé à ${result.data!.sent} destinataire(s)`)
    } else {
      toast.error(result.error ?? "Erreur lors de l'envoi")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suivi Opportunités"
        description="Configurez vos règles d'envoi de tableaux synthétiques des opportunités"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle règle
          </Button>
        }
      />

      {initialRules.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Aucune règle de suivi opportunités</p>
          <p className="text-sm mt-1">
            Créez une règle pour recevoir automatiquement le tableau synthétique de toutes vos opportunités
          </p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Créer une règle
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nom</th>
                <th className="px-4 py-3 text-left font-medium">Contenu</th>
                <th className="px-4 py-3 text-left font-medium">Planification</th>
                <th className="px-4 py-3 text-left font-medium">Destinataires</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{rule.name}</p>
                    {rule.description && (
                      <p className="text-xs text-muted-foreground">{rule.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">Toutes les opportunités</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatSchedule(rule.scheduleConfig as ReportingScheduleConfig | null)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {rule.recipientEmails.length} email{rule.recipientEmails.length > 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={rule.isActive ? "success" : "muted"}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendNow(rule)}
                        disabled={sendingId === rule.id}
                        title="Envoyer maintenant"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(rule)}
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggle(rule)}
                        title={rule.isActive ? "Désactiver" : "Activer"}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteTarget(rule)}
                        title="Supprimer"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OpportuniteReportingRuleDialog
        key={editingRule?.id ?? "new"}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        rule={editingRule}
        onSaved={refresh}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la règle ?</AlertDialogTitle>
            <AlertDialogDescription>
              La règle &quot;{deleteTarget?.name}&quot; sera supprimée définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
