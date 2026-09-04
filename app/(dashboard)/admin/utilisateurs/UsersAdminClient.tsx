'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Plus, Trash2, Star, Mail, Users, Check, X, UserPlus, UserX, UserCheck } from 'lucide-react'
import {
  addUserIdentifier,
  removeUserIdentifier,
  setPrimaryUserIdentifier,
} from '@/lib/actions/auth/user-identifiers'
import { approveUser, rejectUser, deactivateUser, reactivateUser } from '@/lib/actions/auth/users'
import { toast } from '@/lib/utils/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ASSIGNABLE_ROLES = ['ADMIN', 'AVANCE', 'EXPLOITATION', 'VISITEUR'] as const
type AssignableRole = typeof ASSIGNABLE_ROLES[number]

type BadgeVariant = 'success' | 'warning' | 'info' | 'muted'

function getRoleVariant(role: string): BadgeVariant {
  switch (role) {
    case 'ADMIN':        return 'success'
    case 'AVANCE':       return 'warning'
    case 'EXPLOITATION': return 'info'
    default:             return 'muted'
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'ADMIN':        return 'Admin'
    case 'AVANCE':       return 'Avancé'
    case 'EXPLOITATION': return 'Exploitation'
    case 'VISITEUR':     return 'Visiteur'
    default:             return role
  }
}

interface UserIdentifierData {
  id: string
  userId: string
  email: string
  isPrimary: boolean
  createdAt: string
}

interface UserData {
  id: string
  name: string
  email: string
  role: string
  accountStatus: string
  createdAt: string
  identifiers: UserIdentifierData[]
}

interface UsersAdminClientProps {
  users: UserData[]
  currentUserId: string
}

export function UsersAdminClient({ users, currentUserId }: UsersAdminClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [addEmail, setAddEmail] = useState<Record<string, string>>({})
  const [addError, setAddError] = useState<Record<string, string>>({})
  const [roleChoice, setRoleChoice] = useState<Record<string, AssignableRole>>({})

  const handleApprove = (userId: string) => {
    const role = roleChoice[userId] ?? 'VISITEUR'
    setPendingActionId(userId)
    startTransition(async () => {
      const result = await approveUser(userId, role)
      setPendingActionId(null)
      if (result.success) {
        toast.success('Compte approuvé')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const handleReject = (userId: string) => {
    setPendingActionId(userId)
    startTransition(async () => {
      const result = await rejectUser(userId)
      setPendingActionId(null)
      if (result.success) {
        toast.success('Demande refusée')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const handleDeactivate = (userId: string) => {
    setPendingActionId(userId)
    startTransition(async () => {
      const result = await deactivateUser(userId)
      setPendingActionId(null)
      if (result.success) {
        toast.success('Compte désactivé')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const handleReactivate = (userId: string) => {
    setPendingActionId(userId)
    startTransition(async () => {
      const result = await reactivateUser(userId)
      setPendingActionId(null)
      if (result.success) {
        toast.success('Compte réactivé')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const handleAdd = (userId: string) => {
    const email = (addEmail[userId] ?? '').trim()
    if (!email) return

    setAddError(prev => ({ ...prev, [userId]: '' }))
    setPendingActionId(userId)

    startTransition(async () => {
      const result = await addUserIdentifier(userId, email)
      setPendingActionId(null)
      if (result.success) {
        setAddEmail(prev => ({ ...prev, [userId]: '' }))
        toast.success('Email secondaire ajouté')
        router.refresh()
      } else {
        setAddError(prev => ({ ...prev, [userId]: result.error }))
        toast.error(result.error)
      }
    })
  }

  const handleRemove = (identifierId: string) => {
    setPendingActionId(identifierId)
    startTransition(async () => {
      const result = await removeUserIdentifier(identifierId)
      setPendingActionId(null)
      if (result.success) {
        toast.success('Email secondaire supprimé')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const handleSetPrimary = (identifierId: string) => {
    setPendingActionId(identifierId)
    startTransition(async () => {
      const result = await setPrimaryUserIdentifier(identifierId)
      setPendingActionId(null)
      if (result.success) {
        toast.success('Email marqué comme favori')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const pendingRequests = users.filter(u => u.accountStatus === 'PENDING')
  const otherUsers = users.filter(u => u.accountStatus !== 'PENDING')

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Users className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">Aucun utilisateur trouvé.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Demandes d'accès en attente (login Google sans compte existant) ── */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            Demandes en attente ({pendingRequests.length})
          </p>
          {pendingRequests.map(user => {
            const isRowPending = isPending && pendingActionId === user.id
            const role = roleChoice[user.id] ?? 'VISITEUR'
            return (
              <div
                key={user.id}
                className="bg-amber-50/50 rounded-xl border border-amber-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">{user.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Select
                    value={role}
                    onValueChange={(v) => setRoleChoice(prev => ({ ...prev, [user.id]: v as AssignableRole }))}
                    disabled={isRowPending}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map(r => (
                        <SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(user.id)}
                    disabled={isRowPending}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(user.id)}
                    disabled={isRowPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Refuser
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {otherUsers.map(user => {
        const isExpanded = expandedId === user.id
        const identCount = user.identifiers.length
        const isUserPending = isPending && pendingActionId === user.id

        return (
          <div key={user.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">

            {/* ── En-tête utilisateur ── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between px-5 py-4">
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar initiale */}
                <div
                  className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--stam-primary)) 0%, hsl(214 52% 35%) 100%)',
                    color: 'white',
                  }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">{user.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-shrink-0">
                <Badge variant={getRoleVariant(user.role)} className="text-[11px]">
                  {getRoleLabel(user.role)}
                </Badge>
                {user.accountStatus === 'REJECTED' && (
                  <Badge variant="danger" className="text-[11px]">
                    Refusé
                  </Badge>
                )}
                {user.accountStatus === 'DEACTIVATED' && (
                  <Badge variant="muted" className="text-[11px]">
                    Désactivé
                  </Badge>
                )}
                {identCount > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {identCount} alias
                  </span>
                )}
                {user.accountStatus === 'ACTIVE' && user.id !== currentUserId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeactivate(user.id)}
                    disabled={isUserPending}
                    className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                  >
                    <UserX className="h-3.5 w-3.5 mr-1" />
                    Désactiver
                  </Button>
                )}
                {user.accountStatus === 'DEACTIVATED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReactivate(user.id)}
                    disabled={isUserPending}
                    className="h-7 px-2 text-[11px]"
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                    Réactiver
                  </Button>
                )}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : user.id)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label={isExpanded ? 'Réduire' : 'Gérer les emails secondaires'}
                >
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4" />
                    : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* ── Corps expandable ── */}
            {isExpanded && (
              <div
                className="border-t px-5 py-4 space-y-4"
                style={{ borderColor: 'hsl(var(--border))' }}
              >

                {/* Liste des identifiants existants */}
                {user.identifiers.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Emails secondaires ({user.identifiers.length})
                    </p>
                    {user.identifiers.map(ident => {
                      const isIdentPending = isPending && pendingActionId === ident.id
                      return (
                        <div
                          key={ident.id}
                          className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                          style={{ borderColor: 'hsl(var(--border))' }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{ident.email}</span>
                            {ident.isPrimary && (
                              <Badge variant="info" className="text-[10px]">Favori</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!ident.isPrimary && (
                              <button
                                onClick={() => handleSetPrimary(ident.id)}
                                disabled={isIdentPending}
                                title="Marquer comme favori"
                                className="p-1.5 rounded text-muted-foreground hover:text-amber-600 transition-colors disabled:opacity-40"
                              >
                                <Star className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleRemove(ident.id)}
                              disabled={isIdentPending}
                              title="Supprimer cet email secondaire"
                              className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun email secondaire configuré.
                  </p>
                )}

                {/* Formulaire d'ajout */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Ajouter un email secondaire
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="alias@exemple.com"
                      value={addEmail[user.id] ?? ''}
                      onChange={e =>
                        setAddEmail(prev => ({ ...prev, [user.id]: e.target.value }))
                      }
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAdd(user.id)
                        }
                      }}
                      disabled={isUserPending}
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAdd(user.id)}
                      disabled={isUserPending || !(addEmail[user.id] ?? '').trim()}
                    >
                      {isUserPending ? (
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1">Ajouter</span>
                    </Button>
                  </div>
                  {addError[user.id] && (
                    <p className="text-xs text-destructive">{addError[user.id]}</p>
                  )}
                </div>

              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
