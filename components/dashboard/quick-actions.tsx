import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Shield, Car, FolderOpen } from 'lucide-react'

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions rapides</CardTitle>
        <CardDescription>
          Créer rapidement un nouvel élément
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button asChild variant="outline" className="h-auto flex-col gap-2 p-4">
          <Link href="/marches/nouveau">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Nouveau marché</p>
              <p className="text-xs text-muted-foreground">Créer un marché</p>
            </div>
          </Link>
        </Button>

        <Button asChild variant="outline" className="h-auto flex-col gap-2 p-4">
          <Link href="/cautions/nouvelle">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Nouvelle caution</p>
              <p className="text-xs text-muted-foreground">Ajouter une caution</p>
            </div>
          </Link>
        </Button>

        <Button asChild variant="outline" className="h-auto flex-col gap-2 p-4">
          <Link href="/vehicules/nouveau">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100">
              <Car className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Nouveau véhicule</p>
              <p className="text-xs text-muted-foreground">Ajouter un véhicule</p>
            </div>
          </Link>
        </Button>

        <Button asChild variant="outline" className="h-auto flex-col gap-2 p-4">
          <Link href="/documents">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100">
              <FolderOpen className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Documents</p>
              <p className="text-xs text-muted-foreground">Gérer les documents</p>
            </div>
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
