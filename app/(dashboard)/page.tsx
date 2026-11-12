import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth.config'
import { getTableauDeBordData } from '@/lib/actions/tableau-de-bord'
import { parseVue, type Vue } from '@/lib/tableau-de-bord/presentation'
import { BlocATraiter } from '@/components/tableau-de-bord/BlocATraiter'
import { EnTete } from '@/components/tableau-de-bord/EnTete'
import { FiltreVue } from '@/components/tableau-de-bord/FiltreVue'
import { PipelineOffres } from '@/components/tableau-de-bord/PipelineOffres'
import { SqueletteTableauDeBord } from '@/components/tableau-de-bord/SqueletteTableauDeBord'
import { Voyants } from '@/components/tableau-de-bord/Voyants'

export const dynamic = 'force-dynamic'

/** Attend les données du tableau de bord ; chaque bloc gère lui-même son erreur. */
async function Contenu({ vue, role, aujourdHui }: { vue: Vue; role: string | undefined; aujourdHui: Date }) {
  const data = await getTableauDeBordData()
  return (
    <>
      <BlocATraiter bloc={data.aTraiter} vue={vue} aujourdHui={aujourdHui} />
      <Voyants voyants={data.voyants} vue={vue} role={role} aujourdHui={aujourdHui} />
      <PipelineOffres pipeline={data.pipeline} vue={vue} />
    </>
  )
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const role = session.user.role
  const vue = parseVue((await searchParams).vue, role)
  const aujourdHui = new Date()

  return (
    <div className="space-y-6">
      <EnTete role={role} aujourdHui={aujourdHui} />
      {role !== 'EXPLOITATION' && <FiltreVue vue={vue} />}
      <Suspense fallback={<SqueletteTableauDeBord />}>
        <Contenu vue={vue} role={role} aujourdHui={aujourdHui} />
      </Suspense>
    </div>
  )
}
