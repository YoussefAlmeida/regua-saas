/** 'YYYY-MM' → primeiro dia do mês e primeiro dia do mês seguinte ('YYYY-MM-DD') */
export function limitesDoMes(mes: string): { de: string; ate: string } {
  const [y, m] = mes.split('-').map(Number)
  const prox = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  return { de: `${mes}-01`, ate: `${prox}-01` }
}

export function mesVizinho(mes: string, delta: number): string {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
