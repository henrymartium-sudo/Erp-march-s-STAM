'use client'

import { X, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export interface NotificationItem {
  id: string
  createdAt: string
  event: { type: string; sourceModule: string; payload: unknown }
  rule: { name: string; priority: number }
}

interface Props {
  notifications: NotificationItem[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onClose: () => void
}

export function NotificationPanel({ notifications, onMarkRead, onMarkAllRead, onClose }: Props) {
  return (
    <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border bg-card shadow-lg">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold text-sm">
          Notifications {notifications.length > 0 && `(${notifications.length})`}
        </span>
        <div className="flex gap-1">
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMarkAllRead}
              title="Tout marquer comme lu"
              className="h-7 w-7"
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Aucune notification
          </p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-3 border-b px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onMarkRead(n.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{n.rule.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 mt-0.5"
                onClick={(e) => { e.stopPropagation(); onMarkRead(n.id) }}
                title="Marquer comme lu"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
