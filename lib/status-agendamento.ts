/* Textos de retorno ao mudar status — usados no Hoje e na Agenda */

export type StatusAgendamento = 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'faltou'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function mensagemStatus(
  status: StatusAgendamento,
  entrada: 'lancada' | 'removida' | null | undefined,
  valor: number,
): string {
  if (entrada === 'lancada') return `Concluído. ${brl(valor)} entrou no caixa.`
  if (entrada === 'removida') return `Desfeito. A entrada de ${brl(valor)} saiu do caixa.`
  switch (status) {
    case 'confirmado': return 'Agendamento confirmado.'
    case 'concluido':  return 'Atendimento concluído.'
    case 'faltou':     return 'Marcado como falta.'
    case 'cancelado':  return 'Agendamento cancelado. O horário ficou livre.'
    default:           return 'Agendamento reaberto.'
  }
}

/** Pra onde volta o status quando o usuário toca em "Desfazer" */
export function statusAoDesfazer(status: StatusAgendamento): StatusAgendamento | null {
  if (status === 'concluido' || status === 'faltou') return 'agendado'
  if (status === 'cancelado') return 'agendado'
  return null
}
