import { NextRequest, NextResponse } from 'next/server'
import { exportCautions } from '@/lib/actions/exports'

// Force dynamic pour éviter le cache
export const dynamic = 'force-dynamic'

/**
 * API Route - Export des cautions en Excel
 * GET /api/exports/cautions?statut=...&type=...&dateDebut=...&dateFin=...
 */
export async function GET(request: NextRequest) {
  try {
    // Récupération des filtres depuis l'URL
    const { searchParams } = new URL(request.url)
    const filters = {
      statut: searchParams.get('statut') || undefined,
      type: searchParams.get('type') || undefined,
      dateDebut: searchParams.get('dateDebut') || undefined,
      dateFin: searchParams.get('dateFin') || undefined,
    }

    // Génération de l'export
    const result = await exportCautions(filters)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erreur lors de l'export" },
        { status: 500 }
      )
    }

    if (!result.data) {
      return NextResponse.json(
        { error: "Aucune donnée retournée" },
        { status: 500 }
      )
    }

    // Retour du fichier Excel
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
    console.error('[API_EXPORT_CAUTIONS]', error)
    return NextResponse.json(
      { error: "Erreur lors de l'export des cautions" },
      { status: 500 }
    )
  }
}
