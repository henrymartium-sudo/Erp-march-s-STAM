import { z } from 'zod'

/** Capacité de `Lot.montantPropose` : Decimal(15, 2) → 13 chiffres avant la virgule. */
export const MONTANT_MAX_LOT = 9_999_999_999_999

const texte = (message: string) => z.string().trim().min(1, message).max(100)

// Une chaîne vide venue du formulaire doit échouer, pas valoir 0 : on la convertit en `undefined` avant la coercition.
const nombreObligatoire = (message: string) =>
  z.preprocess((v) => (v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v), z.coerce.number({ message }))

export const vehiculeProposeSchema = z.object({
  marque: texte('La marque est obligatoire'),
  modele: texte('Le modèle est obligatoire'),
  quantite: nombreObligatoire('La quantité est obligatoire')
    .pipe(z.number().int('La quantité doit être un entier').min(1, 'La quantité minimale est 1').max(999)),
  prixUnitaire: nombreObligatoire('Le prix unitaire est obligatoire')
    .pipe(z.number().nonnegative('Le prix unitaire doit être positif').max(999_999_999)),
})

export const vehiculesLotSchema = z
  .object({
    lotId: z.string().min(1),
    vehicules: z.array(vehiculeProposeSchema).max(20, '20 véhicules au plus par lot'),
  })
  .refine(
    (d) => d.vehicules.reduce((s, v) => s + Math.round(v.prixUnitaire * 100) * v.quantite, 0) / 100 <= MONTANT_MAX_LOT,
    { message: 'Le total du lot dépasse le montant maximal autorisé', path: ['vehicules'] }
  )

export type VehiculePropose = z.output<typeof vehiculeProposeSchema>
