import { NextRequest, NextResponse } from 'next/server'
import { exportDocuments } from '@/lib/actions/exports'
import { auth } from '@/lib/auth/auth.config'

export const dynamic = 'force-dynamic'

/**
 * API Route - Export des documents en Excel
 * GET /api/exports/documents?type=...&phase=...&search=...&marcheId=...&dateDebut=...&dateFin=...
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const filters = {
      type: searchParams.get('type') || undefined,
      phase: searchParams.get('phase') || undefined,
      search: searchParams.get('search') || undefined,
      marcheId: searchParams.get('marcheId') || undefined,
      dateDebut: searchParams.get('dateDebut') || undefined,
      dateFin: searchParams.get('dateFin') || undefined,
    }

    const result = await exportDocuments(filters)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erreur lors de l'export" },
        { status: result.error === 'Filtres invalides' ? 400 : 500 }
      )
    }

    if (!result.data) {
      return NextResponse.json({ error: 'Aucune donnée retournée' }, { status: 500 })
    }

    const { buffer, filename, total, exportees } = result.data
    const headers: Record<string, string> = {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, max-age=0',
      'X-Export-Total': String(total),
      'X-Export-Exportees': String(exportees),
    }
    if (total > exportees) headers['X-Export-Tronque'] = 'true'

    return new NextResponse(new Uint8Array(buffer), { status: 200, headers })
  } catch (error: any) {
    console.error('[API_EXPORT_DOCUMENTS]', error)
    return NextResponse.json(
      { error: "Erreur lors de l'export des documents" },
      { status: 500 }
    )
  }
}
