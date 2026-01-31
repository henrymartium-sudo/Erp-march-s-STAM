import { notFound } from 'next/navigation'
import { getMarcheById } from '@/lib/actions/marches'
import { MarcheDetail } from '@/components/marches/marche-detail'

interface MarchePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function MarchePage({ params }: MarchePageProps) {
  const { id } = await params
  const marche = await getMarcheById(id)

  if (!marche) {
    notFound()
  }

  return <MarcheDetail marche={marche} />
}
