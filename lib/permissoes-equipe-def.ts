/* O que o dono pode liberar ou travar pra equipe (sem imports: serve pra tela e pro servidor) */

export const PERMISSOES = {
  marcar:      { rotulo: 'Marcar horário', descricao: 'Criar agendamento na própria agenda' },
  remarcar:    { rotulo: 'Remarcar horário', descricao: 'Mudar o dia ou a hora de um horário da própria agenda' },
  cancelar:    { rotulo: 'Cancelar horário', descricao: 'Cancelar um horário da própria agenda' },
  bloquear:    { rotulo: 'Bloquear horários', descricao: 'Fechar pedaços da própria agenda (folga, compromisso)' },
  ver_valores: { rotulo: 'Ver os próprios valores', descricao: 'Quanto gerou, comissão e desempenho' },
} as const

export type Permissao = keyof typeof PERMISSOES
export type PermissoesEquipe = Record<Permissao, boolean>
export const CHAVES = Object.keys(PERMISSOES) as Permissao[]

