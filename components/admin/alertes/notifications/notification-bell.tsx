'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationPanel, type NotificationItem } from './notification-panel'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const json = await res.json()
        setNotifications(json.data ?? [])
      }
    } catch {
      // silencieux — ne jamais crasher l'UI pour un polling raté
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleMarkRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    } catch {
      // Pas critique — la notification disparaît de l'UI immédiatement (optimiste)
    }
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    const ids = notifications.map((n) => n.id)
    setNotifications([])
    setOpen(false)
    await Promise.allSettled(ids.map((id) => fetch(`/api/notifications/${id}`, { method: 'PATCH' })))
  }, [notifications])

  return (
    <div className="relative" data-testid="notification-bell">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${notifications.length > 0 ? ` (${notifications.length})` : ''}`}
      >
        <Bell className="h-4 w-4" />
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-stam-danger text-xs font-bold text-white leading-none">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </Button>

      {open && (
        <>
          {/* Overlay invisible pour fermer en cliquant dehors */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-50">
            <NotificationPanel
              notifications={notifications}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
              onClose={() => setOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  )
}
