/**
 * Moteur de formules Excel — remplace {row} par le numéro de ligne réel
 *
 * @param rowIndex   Numéro de ligne Excel (1-based, numéro réel dans le worksheet)
 * @param formula    Formule avec placeholder : "C{row}*1.18" ou "D{row}+E{row}"
 * @param columnsMap Optionnel — mapping clé métier → lettre colonne : { montant: 'C' }
 *
 * @example
 *   applyFormula(6, "C{row}*1.18")          → "C6*1.18"
 *   applyFormula(6, "{montant}{row}*1.18", { montant: 'C' }) → "C6*1.18"
 */
export function applyFormula(
  rowIndex: number,
  formula: string,
  columnsMap?: Record<string, string>
): string {
  // Remplacement du placeholder {row}
  let result = formula.replace(/\{row\}/g, String(rowIndex))

  // Remplacement des clés métier par leurs lettres de colonne
  if (columnsMap) {
    for (const [key, letter] of Object.entries(columnsMap)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), letter)
    }
  }

  return result
}
