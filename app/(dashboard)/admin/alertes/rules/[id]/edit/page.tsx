import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/utils/permissions'
import { getAlertRule } from '@/lib/actions/alert-rules'
import { RuleForm } from '@/components/admin/alertes/rule-builder/rule-form'
import { PageHeader } from '@/components/shared/page-header'

export const dynamic = 'force-dynamic'

export default async function EditAlertRulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(['ADMIN'])
  const { id } = await params
  const rule = await getAlertRule(id)
  if (!rule) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modifier la règle"
        description={rule.name}
      />
      <RuleForm rule={rule} />
    </div>
  )
}
