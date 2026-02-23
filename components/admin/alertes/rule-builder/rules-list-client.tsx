'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Power } from 'lucide-react'
import { toggleAlertRule, deleteAlertRule } from '@/lib/actions/alert-rules'
import { toast } from '@/lib/utils/toast'
import { EVENT_TYPE_LABELS, ALERT_CHANNELS } from '@/lib/alertes/types'
import type { AlertRule } from '@prisma/client'
import type { AlertEventType } from '@/lib/alertes/types'

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL:   'Email',
  IN_APP:  'In-app',
  WEBHOOK: 'Webhook',
}

interface Props {
  rules: AlertRule[]
}

export function RulesListClient({ rules: initialRules }: Props) {
  const [rules, setRules] = useState(initialRules)
  const [isPending, startTransition] = useTransition()

  const handleToggle = (id: string, current: boolean) => {
    startTransition(async () => {
      const result = await toggleAlertRule(id, !current)
      if (result.success) {
        setRules((prev) =>
          prev.map((r) => (r.id === id ? { ...r, isActive: !current } : r))
        )
        toast.success(!current ? 'Règle activée' : 'Règle désactivée')
      } else {
        toast.error(result.error)
      }
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Supprimer la règle "${name}" ?`)) return
    startTransition(async () => {
      const result = await deleteAlertRule(id)
      if (result.success) {
        setRules((prev) => prev.filter((r) => r.id !== id))
        toast.success('Règle supprimée')
      } else {
        toast.error(result.error)
      }
    })
  }

  if (rules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Aucune règle configurée.{' '}
        <Link href="/admin/alertes/rules/new" className="underline hover:text-foreground">
          Créer la première règle
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="px-4 py-3 font-medium text-muted-foreground">Règle</th>
            <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Événement</th>
            <th className="px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Canaux</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Statut</th>
            <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rules.map((rule) => (
            <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium">{rule.name}</div>
                {rule.description && (
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {rule.description}
                  </div>
                )}
              </td>

              <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                {EVENT_TYPE_LABELS[rule.eventType as AlertEventType] ?? rule.eventType}
              </td>

              <td className="px-4 py-3 hidden lg:table-cell">
                <div className="flex flex-wrap gap-1">
                  {rule.channels.map((ch) => (
                    <Badge key={ch} variant="info" className="text-xs">
                      {CHANNEL_LABELS[ch] ?? ch}
                    </Badge>
                  ))}
                </div>
              </td>

              <td className="px-4 py-3">
                <Badge variant={rule.isActive ? 'success' : 'muted'}>
                  {rule.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </td>

              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleToggle(rule.id, rule.isActive)}
                    disabled={isPending}
                    title={rule.isActive ? 'Désactiver' : 'Activer'}
                    data-testid="rule-toggle"
                  >
                    <Power className={`h-4 w-4 ${rule.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    asChild
                    title="Modifier"
                  >
                    <Link href={`/admin/alertes/rules/${rule.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDelete(rule.id, rule.name)}
                    disabled={isPending}
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
