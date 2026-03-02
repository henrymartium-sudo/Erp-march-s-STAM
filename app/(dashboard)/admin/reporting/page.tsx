// app/(dashboard)/admin/reporting/page.tsx

import { requireRole } from "@/lib/utils/permissions"
import { getReportingRules } from "@/lib/actions/reporting-rules"
import { ReportingRulesClient } from "./ReportingRulesClient"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ReportingPage() {
  const session = await requireRole(["ADMIN"]).catch(() => null)
  if (!session) redirect("/")

  const rules = await getReportingRules()

  // Sérialiser les dates pour le Client Component
  const serializedRules = rules.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))

  return <ReportingRulesClient initialRules={serializedRules} />
}
