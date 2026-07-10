'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataPagination } from '@/components/ui/data-pagination'
import { shouldShowPagination } from '@/lib/utils/pagination'
import { getAuditLogById, exportAuditLogsCsv } from '@/lib/actions/audit-logs'
import { ACTION_LABELS, ENTITY_LABELS } from '@/lib/audit/constants'
import type { AuditLogRow, AuditLogDetail, AuditLogFilters } from '@/lib/actions/audit-logs'
import type { PaginationMetadata } from '@/types/pagination'
import { toast } from '@/lib/utils/toast'
import { Download } from 'lucide-react'

interface Props {
  logs:       AuditLogRow[]
  pagination: PaginationMetadata
  filters:    Record<string, string | undefined>
}

const ACTION_BADGE_CLASSES: Record<string, string> = {
  CREATE:          'bg-green-100 text-green-800 border-green-200',
  UPDATE:          'bg-blue-100 text-blue-800 border-blue-200',
  DELETE:          'bg-red-100 text-red-800 border-red-200',
  LOGIN:           'bg-gray-100 text-gray-700 border-gray-200',
  LOGIN_FAILED:    'bg-orange-100 text-orange-800 border-orange-200',
  CHANGE_PASSWORD: 'bg-purple-100 text-purple-800 border-purple-200',
  EXPORT:          'bg-yellow-100 text-yellow-800 border-yellow-200',
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ACTION_BADGE_CLASSES[action] ?? 'bg-gray-100 text-gray-700'}`}>
      {ACTION_LABELS[action as keyof typeof ACTION_LABELS] ?? action}
    </span>
  )
}

export function AuditLogsClient({ logs, pagination, filters }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const [search,     setSearch]     = useState(filters.search     ?? '')
  const [action,     setAction]     = useState(filters.action     ?? '')
  const [entityType, setEntityType] = useState(filters.entityType ?? '')
  const [startDate,  setStartDate]  = useState(filters.startDate  ?? '')
  const [endDate,    setEndDate]    = useState(filters.endDate    ?? '')

  const [selectedLog, setSelectedLog] = useState<AuditLogDetail | null>(null)
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [loadingId,   setLoadingId]   = useState<string | null>(null)
  const [exporting,   setExporting]   = useState(false)

  function buildParams(overrides: Record<string, string> = {}): string {
    const p = new URLSearchParams()
    if (search)     p.set('search', search)
    if (action)     p.set('action', action)
    if (entityType) p.set('entityType', entityType)
    if (startDate)  p.set('startDate', startDate)
    if (endDate)    p.set('endDate', endDate)
    Object.entries(overrides).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    return p.toString()
  }

  function applyFilters() {
    startTransition(() => {
      router.push(`${pathname}?${buildParams({ page: '1' })}`)
    })
  }

  function resetFilters() {
    setSearch(''); setAction(''); setEntityType(''); setStartDate(''); setEndDate('')
    router.push(pathname)
  }

  async function openDetail(id: string) {
    setLoadingId(id)
    const detail = await getAuditLogById(id)
    setLoadingId(null)
    if (detail) {
      setSelectedLog(detail)
      setDrawerOpen(true)
    }
  }

  async function handleExportCsv() {
    setExporting(true)
    try {
      const csv = await exportAuditLogsCsv({
        action:     action     || undefined,
        entityType: entityType || undefined,
        startDate:  startDate  || undefined,
        endDate:    endDate    || undefined,
        search:     search     || undefined,
      })
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Export CSV téléchargé')
    } catch {
      toast.error("Erreur lors de l'export CSV")
    } finally {
      setExporting(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      {/* ── Filtres ── */}
      <div className="flex flex-wrap gap-2 items-end">
        <Input
          placeholder="Rechercher…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyFilters()}
          className="w-48"
        />

        <Select value={action || 'ALL'} onValueChange={v => setAction(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes les actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entityType || 'ALL'} onValueChange={v => setEntityType(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les modules</SelectItem>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="w-36"
          title="Du"
        />
        <Input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="w-36"
          title="Au"
        />

        <Button onClick={applyFilters} size="sm">Filtrer</Button>
        <Button onClick={resetFilters} size="sm" variant="outline">Réinitialiser</Button>

        <Button
          onClick={handleExportCsv}
          size="sm"
          variant="outline"
          disabled={exporting}
          className="ml-auto"
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Export…' : 'CSV'}
        </Button>
      </div>

      {/* ── Tableau ── */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date / Heure</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Aucun log trouvé
                </TableCell>
              </TableRow>
            ) : logs.map(log => (
              <TableRow
                key={log.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => openDetail(log.id)}
              >
                <TableCell className="font-mono text-xs whitespace-nowrap">
                  {loadingId === log.id ? '…' : formatDate(log.createdAt)}
                </TableCell>
                <TableCell className="text-sm">
                  {log.userEmail ?? <span className="text-muted-foreground italic">— système —</span>}
                </TableCell>
                <TableCell>
                  <ActionBadge action={log.action} />
                </TableCell>
                <TableCell className="text-sm">
                  {ENTITY_LABELS[log.entityType as keyof typeof ENTITY_LABELS] ?? log.entityType}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                  {log.entityId ?? '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground" title={log.ipAddress ?? ''}>
                  {log.ipAddress ? log.ipAddress.substring(0, 15) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {shouldShowPagination(pagination.totalItems) && (
        <DataPagination pagination={pagination} />
      )}

      {/* ── Drawer détail ── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Détail du log</SheetTitle>
          </SheetHeader>
          {selectedLog && (
            <div className="mt-4 space-y-4 text-sm">
              <Field label="Date"        value={formatDate(selectedLog.createdAt)} />
              <Field label="Action"      value={<ActionBadge action={selectedLog.action} />} />
              <Field label="Module"      value={ENTITY_LABELS[selectedLog.entityType as keyof typeof ENTITY_LABELS] ?? selectedLog.entityType} />
              <Field label="Référence"   value={selectedLog.entityId ?? '—'} mono />
              <Field label="Utilisateur" value={selectedLog.userName ?? '—'} />
              <Field label="Email"       value={selectedLog.userEmail ?? '—'} />
              <Field label="IP"          value={selectedLog.ipAddress ?? '—'} mono />
              <Field label="User-Agent"  value={selectedLog.userAgent ?? '—'} />
              {selectedLog.metadata && (
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Métadonnées</p>
                  <pre className="bg-muted rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-0.5">{label}</p>
      <p className={mono ? 'font-mono text-xs' : 'text-sm'}>{value}</p>
    </div>
  )
}
