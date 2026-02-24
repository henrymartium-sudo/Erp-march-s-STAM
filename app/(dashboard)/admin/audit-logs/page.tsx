import { requireAdmin } from '@/lib/utils/permissions'
import { getAuditLogs } from '@/lib/actions/audit-logs'
import { PageHeader } from '@/components/shared/page-header'
import { AuditLogsClient } from './AuditLogsClient'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{
    page?:       string
    action?:     string
    entityType?: string
    userId?:     string
    startDate?:  string
    endDate?:    string
    search?:     string
  }>
}

export default async function AuditLogsPage({ searchParams }: Props) {
  await requireAdmin()

  const params = await searchParams
  const page   = parseInt(params.page ?? '1', 10)

  const result = await getAuditLogs({
    page,
    limit:      50,
    action:     params.action     || undefined,
    entityType: params.entityType || undefined,
    userId:     params.userId     || undefined,
    startDate:  params.startDate  || undefined,
    endDate:    params.endDate    || undefined,
    search:     params.search     || undefined,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal des logs"
        description="Traçabilité des actions effectuées dans l'application"
        count={result.pagination.totalItems}
      />
      <AuditLogsClient
        logs={result.data}
        pagination={result.pagination}
        filters={params}
      />
    </div>
  )
}
