'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TypeDocument, PhaseMarche } from '@prisma/client'
import { TYPE_DOCUMENT_LABELS, PHASE_MARCHE_LABELS, formatTaille } from '@/lib/utils/document'
import { ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/validations/document'
import { Upload, FileText, X, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadDocument } from '@/lib/actions/documents'
import { toast } from '@/lib/utils/toast'

interface DocumentUploadProps {
  marcheId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

/**
 * Composant d'upload de documents avec drag-and-drop
 */
export function DocumentUpload({ marcheId, onSuccess, onCancel }: DocumentUploadProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Form state
  const [nom, setNom] = useState('')
  const [type, setType] = useState<TypeDocument>()
  const [phase, setPhase] = useState<PhaseMarche>()
  const [description, setDescription] = useState('')
  const [dateValidite, setDateValidite] = useState('')
  const [tags, setTags] = useState('')

  // Validation d'un fichier
  const validateFile = useCallback((file: File): string | null => {
    // Vérifier la taille
    if (file.size > MAX_FILE_SIZE) {
      return `Le fichier est trop volumineux (max ${formatTaille(MAX_FILE_SIZE)})`
    }

    // Vérifier l'extension
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !ALLOWED_FILE_EXTENSIONS.includes(extension as any)) {
      return `Type de fichier non autorisé. Extensions acceptées: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`
    }

    return null
  }, [])

  // Gérer la sélection de fichier
  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      const error = validateFile(selectedFile)
      if (error) {
        toast.error(error)
        return
      }

      setFile(selectedFile)
      // Pré-remplir le nom si vide
      if (!nom) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, '') // Enlever l'extension
        setNom(fileName)
      }
    },
    [validateFile, nom]
  )

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const firstFile = e.dataTransfer.files[0]
      if (firstFile) {
        handleFileSelect(firstFile)
      }
    },
    [handleFileSelect]
  )

  // Input file handler
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const firstFile = e.target.files?.[0]
      if (firstFile) {
        handleFileSelect(firstFile)
      }
    },
    [handleFileSelect]
  )

  // Supprimer le fichier sélectionné
  const handleRemoveFile = () => {
    setFile(null)
  }

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      toast.error('Veuillez sélectionner un fichier')
      return
    }

    if (!type) {
      toast.error('Veuillez sélectionner un type de document')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Créer FormData
      const formData = new FormData()
      formData.append('file', file)
      formData.append('nom', nom || file.name)
      formData.append('type', type)
      if (phase) formData.append('phase', phase)
      if (description) formData.append('description', description)
      if (dateValidite) formData.append('dateValidite', new Date(dateValidite).toISOString())
      if (marcheId) formData.append('marcheId', marcheId)
      if (tags) formData.append('tags', tags)

      // Simuler la progression (car FormData ne supporte pas les événements de progression)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      // Upload
      const result = await uploadDocument(formData)

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (result.success) {
        toast.success('Document uploadé avec succès')
        // Réinitialiser le formulaire
        setFile(null)
        setNom('')
        setType(undefined)
        setPhase(undefined)
        setDescription('')
        setDateValidite('')
        setTags('')
        setUploadProgress(0)

        if (onSuccess) {
          onSuccess()
        } else {
          router.refresh()
        }
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Erreur lors de l\'upload')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uploader un document</CardTitle>
        <CardDescription>
          Formats acceptés: {ALLOWED_FILE_EXTENSIONS.join(', ').toUpperCase()} • Taille max:{' '}
          {formatTaille(MAX_FILE_SIZE)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Zone de drag & drop */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging && 'border-primary bg-primary/5',
              !isDragging && 'border-muted-foreground/25 hover:border-muted-foreground/50'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!file ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    Glissez-déposez votre fichier ici
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ou cliquez pour sélectionner
                  </p>
                </div>
                <Input
                  type="file"
                  accept={ALLOWED_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
                  onChange={handleFileInputChange}
                  className="max-w-xs mx-auto cursor-pointer"
                  disabled={isUploading}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-10 w-10 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTaille(file.size)}
                    </p>
                  </div>
                  {!isUploading && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Upload en cours... {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {file && !isUploading && (
            <>
              {/* Nom du document */}
              <div className="space-y-2">
                <Label htmlFor="nom">
                  Nom du document <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nom"
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Caution de bonne exécution"
                  required
                />
              </div>

              {/* Type et Phase */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">
                    Type de document <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={type}
                    onValueChange={(value) => setType(value as TypeDocument)}
                    required
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_DOCUMENT_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phase">Phase du marché</Label>
                  <Select
                    value={phase}
                    onValueChange={(value) => setPhase(value as PhaseMarche)}
                  >
                    <SelectTrigger id="phase">
                      <SelectValue placeholder="Optionnel" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PHASE_MARCHE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description du document..."
                  rows={3}
                />
              </div>

              {/* Date de validité */}
              <div className="space-y-2">
                <Label htmlFor="dateValidite">Date de validité</Label>
                <Input
                  id="dateValidite"
                  type="date"
                  value={dateValidite}
                  onChange={(e) => setDateValidite(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Pour les cautions bancaires ou documents avec date d'expiration
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Ex: urgent, confidentiel (séparés par des virgules)"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-pulse" />
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Uploader le document
                    </>
                  )}
                </Button>
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isUploading}
                  >
                    Annuler
                  </Button>
                )}
              </div>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
