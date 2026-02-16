import { NextRequest, NextResponse } from 'next/server'
import { exportMarchesPDF } from '@/lib/actions/exports'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Extraction des filtres depuis les query params
    const filters = {
      statut: searchParams.get('statut') || undefined,
      type: searchParams.get('type') || undefined,
      dateDebut: searchParams.get('dateDebut') || undefined,
      dateFin: searchParams.get('dateFin') || undefined,
      search: searchParams.get('search') || undefined,
    }

    // Appel de la fonction d'export
    const result = await exportMarchesPDF(filters)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Retour du PDF avec les bons headers (convertir Buffer en Uint8Array)
    return new NextResponse(new Uint8Array(result.data.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.data.filename}"`,
      },
    })
  } catch (error: any) {
    console.error('[API_EXPORT_MARCHES_PDF]', error)
    return NextResponse.json(
      { error: error.message || 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
