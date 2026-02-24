import { NextRequest, NextResponse } from 'next/server'
import { exportDocumentsPDF } from '@/lib/actions/exports'
import { auth } from '@/lib/auth/auth.config'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams

    const filters = {
      type: searchParams.get('type') || undefined,
      dateDebut: searchParams.get('dateDebut') || undefined,
      dateFin: searchParams.get('dateFin') || undefined,
      search: searchParams.get('search') || undefined,
    }

    const result = await exportDocumentsPDF(filters)

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
    console.error('[API_EXPORT_DOCUMENTS_PDF]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}
