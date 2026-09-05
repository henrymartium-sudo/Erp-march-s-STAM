import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { EVENT_TYPE_LABELS } from '@/lib/alertes/types'
import type { AlertEventType } from '@/lib/alertes/types'

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL:   'Email',
  IN_APP:  'In-app',
  WEBHOOK: 'Webhook',
}

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'muted'> = {
  SENT:    'success',
  READ:    'success',
  PENDING: 'warning',
  FAILED:  'danger',
}

type NotificationRow = {
  id: string
  createdAt: Date
  channel: string
  recipientEmail: string | null
  status: string
  deliveryLog: string | null
  event: { type: string; sourceModule: string; referenceId: string }
  rule: { name: string }
}

interface Props {
  notifications: NotificationRow[]
}

export function HistoryTable({ notifications }: Props) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Aucune notification dans l'historique.
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted text-left">
            <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Règle</th>
            <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Événement</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Canal</th>
            <th className="px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Destinataire</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Statut</th>
            <th className="px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Log</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {notifications.map((n) => (
            <tr key={n.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}
              </td>

              <td className="px-4 py-3 font-medium max-w-[180px] truncate">
                {n.rule.name}
              </td>

              <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                {EVENT_TYPE_LABELS[n.event.type as AlertEventType] ?? n.event.type}
              </td>

              <td className="px-4 py-3">
                <Badge variant="info" className="text-xs">
                  {CHANNEL_LABELS[n.channel] ?? n.channel}
                </Badge>
              </td>

              <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                {n.recipientEmail ?? '—'}
              </td>

              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANTS[n.status] ?? 'muted'} className="text-xs">
                  {n.status}
                </Badge>
              </td>

              <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground font-mono max-w-[200px] truncate">
                {n.deliveryLog ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
