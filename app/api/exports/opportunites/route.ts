import { NextRequest, NextResponse } from 'next/server'
import { exportOpportunites } from '@/lib/actions/exports'
import { auth } from '@/lib/auth/auth.config'

export const dynamic = 'force-dynamic'

/**
 * API Route - Export des opportunités en Excel
 * GET /api/exports/opportunites?statut=...
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const filters = {
      statut: searchParams.get('statut') || undefined,
    }

    const result = await exportOpportunites(filters)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erreur lors de l'export" },
        { status: 500 }
      )
    }

    if (!result.data) {
      return NextResponse.json({ error: 'Aucune donnée retournée' }, { status: 500 })
    }

    return new NextResponse(new Uint8Array(result.data.buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${result.data.filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error: any) {
    console.error('[API_EXPORT_OPPORTUNITES]', error)
    return NextResponse.json(
      { error: "Erreur lors de l'export des opportunités" },
      { status: 500 }
    )
  }
}
