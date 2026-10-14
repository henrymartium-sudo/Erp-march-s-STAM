import { test, expect } from '@playwright/test'
import ExcelJS from 'exceljs'
import { buildOpportuniteReportingExcel } from '../../lib/email/opportunite-reporting-excel'
import type { OpportuniteForReporting } from '../../lib/email/opportunite-reporting-templates'

const now = new Date('2026-10-14T08:00:00Z')

function opp(over: Partial<OpportuniteForReporting>): OpportuniteForReporting {
  return {
    id: 'x', reference: 'REF-1', objet: 'Objet', autoriteContractante: 'Autorité', statut: 'GO',
    montantEstime: null, lots: [], dateLimite: null, periodeValiditeDebut: null, periodeValiditeFin: null,
    echeanceAttributionProv: null, notes: null, ...over,
  }
}

async function lire(opps: OpportuniteForReporting[]) {
  const wb = new ExcelJS.Workbook()
  const classeur = await buildOpportuniteReportingExcel(opps, now)
  await wb.xlsx.load(classeur as unknown as ExcelJS.Buffer)
  return wb.getWorksheet('Opportunités')!
}

test.describe('Excel joint au suivi des opportunités', () => {
  test('en-têtes et une ligne par opportunité', async () => {
    const ws = await lire([opp({ id: '1' }), opp({ id: '2', statut: 'NO_GO' })])
    expect(ws.getRow(1).values).toEqual([undefined, 'Référence', 'Objet', 'Autorité contractante', 'Statut', 'Montant estimé', 'Montant proposé', 'Date limite', 'Jours restants', 'Validité début', 'Validité fin', 'Échéance attribution', 'Avancement dossier (%)', 'Notes'])
    expect(ws.rowCount).toBe(3)
  })

  test('montants numériques et notes intégrales (au-delà de 255 caractères)', async () => {
    const notes = 'Note longue. '.repeat(40)
    const ws = await lire([opp({ montantEstime: 5000000, notes, lots: [{ montantPropose: 1500000, dossier: { progression: 40 } }, { montantPropose: 2500000, dossier: { progression: 60 } }] })])
    const ligne = ws.getRow(2)
    expect(ligne.getCell(5).value).toBe(5000000)
    expect(ligne.getCell(6).value).toBe(4000000)
    expect(ligne.getCell(12).value).toBe(50)
    expect(ligne.getCell(13).value).toBe(notes)
    expect(String(ligne.getCell(13).value).length).toBeGreaterThan(255)
  })

  test('opportunité sans date ni montant : cellules vides, pas de plantage', async () => {
    const ws = await lire([opp({ statut: 'EN_ANALYSE' })])
    const ligne = ws.getRow(2)
    expect(ligne.getCell(5).value).toBeNull()
    expect(ligne.getCell(7).value).toBeNull()
    expect(ligne.getCell(8).value).toBeNull()
  })

  test('jours restants calculés à partir de la date limite', async () => {
    const ws = await lire([opp({ dateLimite: new Date('2026-10-21T00:00:00Z') })])
    expect(ws.getRow(2).getCell(8).value).toBe(7)
  })

  test('actives avant terminées dans le classeur', async () => {
    const ws = await lire([opp({ id: 't', reference: 'TERM', statut: 'NO_GO' }), opp({ id: 'a', reference: 'ACTIVE', statut: 'GO' })])
    expect(ws.getRow(2).getCell(1).value).toBe('ACTIVE')
    expect(ws.getRow(3).getCell(1).value).toBe('TERM')
  })
})
