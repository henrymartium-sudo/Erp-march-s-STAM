import { requireRole } from '@/lib/utils/permissions'
import { RuleForm } from '@/components/admin/alertes/rule-builder/rule-form'
import { PageHeader } from '@/components/shared/page-header'

export default async function NewAlertRulePage() {
  await requireRole(['ADMIN'])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouvelle règle d'alerte"
        description="Configurer les conditions, canaux et destinataires"
      />
      <RuleForm />
    </div>
  )
}
