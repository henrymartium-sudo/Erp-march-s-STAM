import { NextRequest, NextResponse } from 'next/server'
import { exportVehiculesPDF } from '@/lib/actions/exports'
import { auth } from '@/lib/auth/auth.config'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams

    const rawOrientation = searchParams.get('orientation')
    const orientation: 'portrait' | 'landscape' =
      rawOrientation === 'landscape' ? 'landscape' : 'portrait'
    const isPreview = searchParams.get('preview') === 'true'

    const filters = {
      statut: searchParams.get('statut') || undefined,
      dateDebut: searchParams.get('dateDebut') || undefined,
      dateFin: searchParams.get('dateFin') || undefined,
      search: searchParams.get('search') || undefined,
      orientation,
    }

    const result = await exportVehiculesPDF(filters)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    const disposition = isPreview
      ? `inline; filename="${result.data.filename}"`
      : `attachment; filename="${result.data.filename}"`

    return new NextResponse(new Uint8Array(result.data.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
      },
    })
  } catch (error: any) {
    console.error('[API_EXPORT_VEHICULES_PDF]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}
