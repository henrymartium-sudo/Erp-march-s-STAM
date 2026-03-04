// app/(dashboard)/admin/reporting/page.tsx

import { requireRole } from "@/lib/utils/permissions"
import { getReportingRules } from "@/lib/actions/reporting-rules"
import { ReportingRulesClient } from "./ReportingRulesClient"
import { AnalytiquesTab } from "./AnalytiquesTab"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const dynamic = "force-dynamic"

export default async function ReportingPage() {
  const session = await requireRole(["ADMIN"]).catch(() => null)
  if (!session) redirect("/")

  const rules = await getReportingRules()

  // Sérialiser les dates pour le Client Component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serializedRules = rules.map((r) => ({
    ...r,
    scheduleConfig: r.scheduleConfig as any,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Reporting</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestion des règles de reporting email et analyses analytiques
        </p>
      </div>

      <Tabs defaultValue="reporting">
        <TabsList>
          <TabsTrigger value="reporting">Règles email</TabsTrigger>
          <TabsTrigger value="analyses">Analyses</TabsTrigger>
        </TabsList>

        <TabsContent value="reporting" className="mt-4">
          <ReportingRulesClient initialRules={serializedRules} />
        </TabsContent>

        <TabsContent value="analyses" className="mt-4">
          <AnalytiquesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
