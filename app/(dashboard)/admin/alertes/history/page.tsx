import { requireRole } from '@/lib/utils/permissions'
import { getNotificationHistory } from '@/lib/actions/alert-history'
import { HistoryTable } from '@/components/admin/alertes/history-table'
import { PageHeader } from '@/components/shared/page-header'

export const dynamic = 'force-dynamic'

export default async function AlertHistoryPage() {
  await requireRole(['ADMIN', 'AVANCE'])
  const { notifications, total } = await getNotificationHistory()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historique des notifications"
        description={`${total} notification(s) au total`}
        count={total > 0 ? total : undefined}
      />
      <HistoryTable notifications={notifications} />
    </div>
  )
}
