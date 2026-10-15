/* ================================================================
   Valor digitado em reais → número.
   Aceita o jeito brasileiro e o "de calculadora":
     "35" "35,5" "35,50" "1.500" "1.234,56" "R$ 1.500,00" "35.5"
   Antes "1.500" virava 1,50 e "1.234,56" dava erro.
   Devolve NaN quando não é um valor.
   Sem import: roda no navegador, no servidor e no teste.
   ================================================================ */
export function lerValorBRL(texto: string): number {
  const s = texto.replace(/R\$/gi, '').replace(/\s/g, '')
  if (!s) return NaN
  let normal: string
  if (s.includes(',')) {
    // Vírgula é o decimal: pontos são milhar ("1.234,56")
    if (!/^\d{1,3}(\.\d{3})*,\d{1,2}$|^\d+,\d{1,2}$/.test(s)) return NaN
    normal = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.500", "12.000": ponto de milhar
    normal = s.replace(/\./g, '')
  } else if (/^\d+(\.\d{1,2})?$/.test(s)) {
    // "35" ou "35.5": ponto como decimal
    normal = s
  } else {
    return NaN
  }
  return Math.round(Number(normal) * 100) / 100
}
