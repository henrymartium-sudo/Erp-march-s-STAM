import Link from 'next/link'
import { requireRole } from '@/lib/utils/permissions'
import { getAlertRules } from '@/lib/actions/alert-rules'
import { RulesListClient } from '@/components/admin/alertes/rule-builder/rules-list-client'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AlertRulesPage() {
  await requireRole(['ADMIN', 'AVANCE'])
  const rules = await getAlertRules()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Règles d'alerte"
        description={`${rules.length} règle(s) configurée(s)`}
        action={
          <Button asChild>
            <Link href="/admin/alertes/rules/new">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle règle
            </Link>
          </Button>
        }
      />
      <RulesListClient rules={rules} />
    </div>
  )
}
