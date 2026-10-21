import { test, expect } from '@playwright/test'
import {
  JOURS_ALERTE_VALIDITE,
  statutValidite,
  bornesEcheance,
  trierRecapitulatif,
} from '../../lib/utils/documents-echeances'

const J = 24 * 60 * 60 * 1000
const AUJOURDHUI = new Date('2026-03-10T14:30:00.000Z')
const DEBUT = Date.UTC(2026, 2, 10)

test('le seuil est de 30 jours', () => {
  expect(JOURS_ALERTE_VALIDITE).toBe(30)
})

test('sans date : aucune', () => {
  expect(statutValidite(null, AUJOURDHUI)).toBe('aucune')
})

test('la veille : expire (même à 23h59)', () => {
  expect(statutValidite(new Date(DEBUT - 1), AUJOURDHUI)).toBe('expire')
  expect(statutValidite(new Date(DEBUT - J), AUJOURDHUI)).toBe('expire')
})

test('aujourd’hui à minuit : bientôt (pas expiré)', () => {
  expect(statutValidite(new Date(DEBUT), AUJOURDHUI)).toBe('bientot')
})

test('aujourd’hui en fin de journée : bientôt', () => {
  expect(statutValidite(new Date(DEBUT + J - 1), AUJOURDHUI)).toBe('bientot')
})

test('+29 et +30 jours : bientôt ; +31 jours : ok', () => {
  expect(statutValidite(new Date(DEBUT + 29 * J), AUJOURDHUI)).toBe('bientot')
  expect(statutValidite(new Date(DEBUT + 30 * J), AUJOURDHUI)).toBe('bientot')
  expect(statutValidite(new Date(DEBUT + 31 * J - 1), AUJOURDHUI)).toBe('bientot')
  expect(statutValidite(new Date(DEBUT + 31 * J), AUJOURDHUI)).toBe('ok')
})

test('le résultat ne dépend pas de l’heure de « aujourd’hui »', () => {
  const minuit = new Date(DEBUT)
  const finJour = new Date(DEBUT + J - 1)
  const d = new Date(DEBUT - 1)
  expect(statutValidite(d, minuit)).toBe('expire')
  expect(statutValidite(d, finJour)).toBe('expire')
})

test('bascule d’heure d’été (mars) : toujours en UTC', () => {
  const auj = new Date('2026-03-28T23:30:00.000Z')
  const debut = Date.UTC(2026, 2, 28)
  expect(statutValidite(new Date(debut + 30 * J), auj)).toBe('bientot')
  expect(statutValidite(new Date(debut + 31 * J), auj)).toBe('ok')
  expect(bornesEcheance(auj).debutJour.toISOString()).toBe('2026-03-28T00:00:00.000Z')
})

test('bornesEcheance pour une date donnée', () => {
  const b = bornesEcheance(AUJOURDHUI)
  expect(b.debutJour.toISOString()).toBe('2026-03-10T00:00:00.000Z')
  expect(b.limiteBientot.toISOString()).toBe('2026-04-09T23:59:59.999Z')
})

test('bornesEcheance est cohérente avec statutValidite', () => {
  const { debutJour, limiteBientot } = bornesEcheance(AUJOURDHUI)
  expect(statutValidite(debutJour, AUJOURDHUI)).toBe('bientot')
  expect(statutValidite(limiteBientot, AUJOURDHUI)).toBe('bientot')
  expect(statutValidite(new Date(limiteBientot.getTime() + 1), AUJOURDHUI)).toBe('ok')
  expect(statutValidite(new Date(debutJour.getTime() - 1), AUJOURDHUI)).toBe('expire')
})

test('tri : nombre décroissant', () => {
  const r = trierRecapitulatif([
    { libelle: 'B', nombre: 1 },
    { libelle: 'A', nombre: 5 },
    { libelle: 'C', nombre: 3 },
  ])
  expect(r.map((l) => l.libelle)).toEqual(['A', 'C', 'B'])
})

test('tri : ex æquo par ordre alphabétique', () => {
  const r = trierRecapitulatif([
    { libelle: 'Zèbre', nombre: 2 },
    { libelle: 'Abeille', nombre: 2 },
    { libelle: 'Étoile', nombre: 2 },
  ])
  expect(r.map((l) => l.libelle)).toEqual(['Abeille', 'Étoile', 'Zèbre'])
})

test('tri : « Non renseigné » toujours en dernier, même avec le plus grand nombre', () => {
  const r = trierRecapitulatif([
    { libelle: 'Non renseigné', nombre: 99 },
    { libelle: 'A', nombre: 1 },
    { libelle: 'B', nombre: 2 },
  ])
  expect(r.map((l) => l.libelle)).toEqual(['B', 'A', 'Non renseigné'])
})

test('tri : l’entrée n’est pas modifiée', () => {
  const entree = [
    { libelle: 'B', nombre: 1 },
    { libelle: 'A', nombre: 2 },
  ]
  const copie = JSON.parse(JSON.stringify(entree))
  const r = trierRecapitulatif(entree)
  expect(entree).toEqual(copie)
  expect(r).not.toBe(entree)
})

test('tri : liste vide', () => {
  expect(trierRecapitulatif([])).toEqual([])
})
