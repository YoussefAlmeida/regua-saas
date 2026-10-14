/* ================================================================
   Planos do RÉGUA — fonte única (landing, painel, admin e regras)

   Teste grátis (14 dias): tudo liberado, sem limite de profissionais.
   Acabou o teste sem plano: só leitura NA HORA (vê os dados, não
   agenda nem lança nada) até escolher um plano.
   Plano pago vencido: 5 dias de carência, depois só leitura até pagar.

   "Profissional" = quem aparece na agenda. O dono só conta se ele
   também corta ("Sou eu que corto").
   ================================================================ */

export type PlanoPagoId = 'cadeira' | 'barbearia' | 'rede'
export type PlanoId = 'trial' | PlanoPagoId

export interface Recursos {
  /** Mais → Histórico (quem lançou, apagou, mudou valor) */
  historico: boolean
  /** Ranking por barbeiro, clientes novos x retorno */
  relatoriosAvancados: boolean
  /** Despesas fixas lançadas sozinhas todo mês */
  despesasFixas: boolean
}

export interface Plano {
  id: PlanoPagoId
  nome: string
  preco: number
  resumo: string
  /** null = sem limite */
  maxProfissionais: number | null
  recursos: Recursos
  suporte: string
  /** Lista que aparece na landing e na tela de plano */
  itens: string[]
  destaque?: boolean
}

export const PLANOS: Record<PlanoPagoId, Plano> = {
  cadeira: {
    id: 'cadeira',
    nome: 'Cadeira',
    preco: 39.99,
    resumo: 'Pra quem trabalha sozinho',
    maxProfissionais: 1,
    recursos: { historico: false, relatoriosAvancados: false, despesasFixas: false },
    suporte: 'Suporte 2 vezes por mês',
    itens: [
      '1 profissional na agenda',
      'Link de agendamento sem app',
      'Lembrete no WhatsApp',
      'Financeiro: entradas e saídas',
      'Resumo do mês',
      'Suporte 2 vezes por mês',
    ],
  },
  barbearia: {
    id: 'barbearia',
    nome: 'Barbearia',
    preco: 79.99,
    resumo: 'Pra equipe de até 3',
    maxProfissionais: 3,
    recursos: { historico: true, relatoriosAvancados: true, despesasFixas: true },
    suporte: 'Suporte pelo WhatsApp',
    destaque: true,
    itens: [
      'Até 3 profissionais na agenda',
      'Tudo do Cadeira',
      'Despesas fixas automáticas',
      'Histórico: quem lançou, apagou ou mudou valor',
      'Relatórios por barbeiro e de clientes',
      'Suporte pelo WhatsApp',
    ],
  },
  rede: {
    id: 'rede',
    nome: 'Rede',
    preco: 129.99,
    resumo: 'Pra mais de 3 profissionais',
    maxProfissionais: null,
    recursos: { historico: true, relatoriosAvancados: true, despesasFixas: true },
    suporte: 'Suporte prioritário',
    itens: [
      'Profissionais sem limite',
      'Tudo do Barbearia',
      'Suporte prioritário',
      'Implantação presencial',
      'Várias unidades (em breve)',
    ],
  },
}

export const LISTA_PLANOS: Plano[] = [PLANOS.cadeira, PLANOS.barbearia, PLANOS.rede]

const TUDO: Recursos = { historico: true, relatoriosAvancados: true, despesasFixas: true }

export interface SituacaoPlano {
  plano: PlanoId
  nome: string
  /** No teste grátis e ainda dentro do prazo */
  emTeste: boolean
  diasTeste: number
  /** Teste vencido, suspensa ou cancelada: vê mas não mexe */
  somenteLeitura: boolean
  cancelada: boolean
  maxProfissionais: number | null
  recursos: Recursos
  /** Plano pago: até quando está pago (null = sem data registrada) */
  pagoAte: string | null
  /** Plano pago: dias até vencer (negativo = vencido há N dias) */
  diasParaVencer: number | null
  /** Venceu e está na carência: ainda funciona, mas precisa pagar */
  emCarencia: boolean
}

/** Dias de tolerância depois do vencimento antes de ficar só leitura */
export const CARENCIA_DIAS = 5

/** O que a barbearia pode fazer AGORA (vale o relógio, não espera o cron) */
export function situacaoPlano(b: { plano: string; status: string; trial_fim: string | null; plano_ciclo_fim?: string | null }): SituacaoPlano {
  const fim = b.trial_fim ? new Date(b.trial_fim).getTime() : 0
  const diasTeste = Math.max(0, Math.ceil((fim - Date.now()) / 86_400_000))
  const pago = PLANOS[b.plano as PlanoPagoId]
  const cicloFim = b.plano_ciclo_fim ? new Date(b.plano_ciclo_fim).getTime() : null
  const diasParaVencer = cicloFim === null ? null : Math.ceil((cicloFim - Date.now()) / 86_400_000)
  const ciclo = { pagoAte: b.plano_ciclo_fim ?? null, diasParaVencer, emCarencia: false }
  const semCiclo = { pagoAte: null, diasParaVencer: null, emCarencia: false }

  if (b.status === 'cancelado') {
    return { plano: (pago?.id ?? 'trial'), nome: 'Cancelada', emTeste: false, diasTeste: 0, somenteLeitura: true, cancelada: true, maxProfissionais: pago?.maxProfissionais ?? null, recursos: pago?.recursos ?? TUDO, ...semCiclo }
  }
  if (b.status === 'ativo' && pago) {
    // Pagamento vencido: funciona na carência; passou dela, só leitura até pagar
    const atraso = diasParaVencer !== null && cicloFim! <= Date.now()
    if (atraso && Date.now() > cicloFim! + CARENCIA_DIAS * 86_400_000) {
      return { plano: pago.id, nome: 'Pagamento atrasado', emTeste: false, diasTeste: 0, somenteLeitura: true, cancelada: false, maxProfissionais: pago.maxProfissionais, recursos: pago.recursos, ...ciclo }
    }
    return { plano: pago.id, nome: pago.nome, emTeste: false, diasTeste: 0, somenteLeitura: false, cancelada: false, maxProfissionais: pago.maxProfissionais, recursos: pago.recursos, ...ciclo, emCarencia: atraso }
  }
  if (b.status === 'trial' && fim > Date.now()) {
    return { plano: 'trial', nome: 'Teste grátis', emTeste: true, diasTeste, somenteLeitura: false, cancelada: false, maxProfissionais: null, recursos: TUDO, ...semCiclo }
  }
  // Teste vencido (mesmo antes do cron virar 'leitura') ou suspensa
  return { plano: 'trial', nome: 'Teste acabou', emTeste: false, diasTeste: 0, somenteLeitura: true, cancelada: false, maxProfissionais: pago?.maxProfissionais ?? null, recursos: pago?.recursos ?? TUDO, ...semCiclo }
}

/** Menor plano que comporta essa quantidade de profissionais */
export function planoParaProfissionais(n: number): PlanoPagoId {
  if (n <= 1) return 'cadeira'
  if (n <= 3) return 'barbearia'
  return 'rede'
}
