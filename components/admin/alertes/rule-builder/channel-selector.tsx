'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Bell, Webhook } from 'lucide-react'

const CHANNELS = [
  {
    value: 'EMAIL',
    label: 'Email',
    icon: Mail,
    description: 'Envoi Nodemailer aux destinataires',
  },
  {
    value: 'IN_APP',
    label: 'In-app',
    icon: Bell,
    description: "Notification dans la cloche de l'interface",
  },
  {
    value: 'WEBHOOK',
    label: 'Webhook',
    icon: Webhook,
    description: 'POST JSON vers une URL externe',
  },
] as const

interface Props {
  channels: string[]
  webhookUrl: string
  onChannelsChange: (channels: string[]) => void
  onWebhookUrlChange: (url: string) => void
}

export function ChannelSelector({
  channels,
  webhookUrl,
  onChannelsChange,
  onWebhookUrlChange,
}: Props) {
  const toggle = (value: string, checked: boolean) => {
    onChannelsChange(
      checked ? [...channels, value] : channels.filter((c) => c !== value)
    )
  }

  return (
    <div className="space-y-3">
      {CHANNELS.map(({ value, label, icon: Icon, description }) => (
        <div key={value} className="space-y-2">
          <div className="flex items-center gap-3">
            <Checkbox
              id={`channel-${value}`}
              checked={channels.includes(value)}
              onCheckedChange={(c) => toggle(value, !!c)}
            />
            <Label
              htmlFor={`channel-${value}`}
              className="flex items-center gap-2 cursor-pointer font-normal"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">— {description}</span>
            </Label>
          </div>

          {value === 'WEBHOOK' && channels.includes('WEBHOOK') && (
            <Input
              className="ml-7"
              placeholder="https://hooks.slack.com/..."
              value={webhookUrl}
              onChange={(e) => onWebhookUrlChange(e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
