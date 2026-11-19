/* ================================================================
   Radar de cliente sumido — quem já cortou e não voltou.
   Função pura (sem banco): a tela de Clientes calcula com os
   agendamentos que já carrega. O contato é manual, pelo wa.me do
   próprio celular do dono (sem custo de API).
   ================================================================ */

export interface AgendamentoResumo { inicio: string; status: string }

export interface ResumoCliente {
  /** Atendimentos concluídos */
  cortes: number
  /** Início do último atendimento concluído (ISO) */
  ultimo: string | null
  /** Dias desde o último atendimento concluído (null = nunca cortou) */
  diasSemVir: number | null
  /** Vezes que marcou e não apareceu */
  faltas: number
  /** Tem horário marcado daqui pra frente */
  temMarcado: boolean
}

/** Janelas do radar, em dias sem voltar */
export const JANELAS_RADAR = [30, 45, 60] as const

const DIA = 86_400_000

export function resumoCliente(ags: AgendamentoResumo[], agora: Date = new Date()): ResumoCliente {
  let cortes = 0, faltas = 0, ultimo: string | null = null, temMarcado = false
  const t = agora.getTime()
  for (const a of ags) {
    if (a.status === 'concluido') {
      cortes++
      if (!ultimo || a.inicio > ultimo) ultimo = a.inicio
    } else if (a.status === 'faltou') {
      faltas++
    } else if ((a.status === 'agendado' || a.status === 'confirmado') && new Date(a.inicio).getTime() >= t) {
      temMarcado = true
    }
  }
  const diasSemVir = ultimo ? Math.floor((t - new Date(ultimo).getTime()) / DIA) : null
  return { cortes, ultimo, diasSemVir, faltas, temMarcado }
}

/** Já cortou, não volta há `dias` ou mais e não tem horário marcado */
export function estaSumido(r: ResumoCliente, dias: number = JANELAS_RADAR[0]): boolean {
  return r.cortes > 0 && r.diasSemVir !== null && r.diasSemVir >= dias && !r.temMarcado
}

/** Mensagem pronta pro WhatsApp, no tom do balcão */
export function mensagemDeVolta(nome: string, diasSemVir: number, barbearia: string, link: string): string {
  const primeiro = nome.trim().split(/\s+/)[0] || nome
  return `Fala, ${primeiro}! Já faz ${diasSemVir} dias do seu último corte aqui na ${barbearia}. Quer garantir seu horário? Marca por aqui: ${link}`
}
