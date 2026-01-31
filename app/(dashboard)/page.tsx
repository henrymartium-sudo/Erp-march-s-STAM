import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Plus, BarChart } from 'lucide-react'
import { getAllMarches } from '@/lib/actions/marches'

export default async function DashboardPage() {
  const marches = await getAllMarches()

  // Statistiques simples
  const stats = {
    total: marches.length,
    enCours: marches.filter(m =>
      ['EN_EXECUTION', 'EN_ATTENTE_LIVRAISON_OS', 'ATTRIBUE_DEFINITIVEMENT'].includes(m.statut)
    ).length,
    termine: marches.filter(m => m.statut === 'CLOTURE').length,
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de vos marchés publics
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total des marchés</CardDescription>
            <CardTitle className="text-4xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Tous statuts confondus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Marchés en cours</CardDescription>
            <CardTitle className="text-4xl text-blue-600">{stats.enCours}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              En exécution ou attribués
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Marchés clôturés</CardDescription>
            <CardTitle className="text-4xl text-green-600">{stats.termine}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Terminés avec succès
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Commencez par créer ou consulter vos marchés
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button asChild>
            <Link href="/marches/nouveau">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau marché
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/marches">
              <FileText className="h-4 w-4 mr-2" />
              Voir tous les marchés
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
