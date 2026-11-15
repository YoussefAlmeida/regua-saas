/* Tipos de aviso que o cliente liga e desliga (sem imports: serve pra tela e pro servidor) */

export const AVISOS = {
  lembretes:    { rotulo: 'Lembretes de horário', descricao: 'Um aviso antes do seu horário marcado.' },
  atualizacoes: { rotulo: 'Atualizações de horário', descricao: 'Confirmação quando você marca um horário.' },
} as const
export type Aviso = keyof typeof AVISOS
export type Avisos = Record<Aviso, boolean>
export const CHAVES_AVISO = Object.keys(AVISOS) as Aviso[]
