/* Cliente cancela sozinho até 1h antes do horário (seção 6.1.1).
   Depois disso, só o barbeiro ou o dono. */
export const ANTECEDENCIA_CANCELAR_MIN = 60

export function clientePodeCancelar(inicioIso: string, status: string, agora = Date.now()): boolean {
  if (status !== 'agendado' && status !== 'confirmado') return false
  return new Date(inicioIso).getTime() - agora >= ANTECEDENCIA_CANCELAR_MIN * 60_000
}
