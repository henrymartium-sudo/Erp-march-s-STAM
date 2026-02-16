import { NextRequest, NextResponse } from 'next/server'
import { exportCautionsPDF } from '@/lib/actions/exports'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const filters = {
      statut: searchParams.get('statut') || undefined,
      type: searchParams.get('type') || undefined,
      dateDebut: searchParams.get('dateDebut') || undefined,
      dateFin: searchParams.get('dateFin') || undefined,
      search: searchParams.get('search') || undefined,
    }

    const result = await exportCautionsPDF(filters)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return new NextResponse(new Uint8Array(result.data.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.data.filename}"`,
      },
    })
  } catch (error: any) {
    console.error('[API_EXPORT_CAUTIONS_PDF]', error)
    return NextResponse.json(
      { error: error.message || 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
