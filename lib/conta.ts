import { NextResponse } from 'next/server'
import { planoDaBarbearia } from '@/lib/plano-servidor'

/* ================================================================
   Modo somente leitura — seção 6.1.3
   Teste vencido (na hora, sem esperar o cron), suspensa ou cancelada:
   vê os dados, mas não cria agendamento nem lança financeiro.
   ================================================================ */

/** Retorna uma resposta 402 se a conta não pode escrever; null se pode */
export async function bloqueioSomenteLeitura(barbearia_id: string): Promise<NextResponse | null> {
  const p = await planoDaBarbearia(barbearia_id)
  if (!p.somenteLeitura) return null

  return NextResponse.json(
    {
      erro: p.cancelada
        ? 'Essa conta está cancelada. Escolha um plano em Mais → Plano pra voltar a usar.'
        : 'Seu teste grátis acabou. Escolha um plano em Mais → Plano pra voltar a agendar e lançar.',
      somenteLeitura: true,
    },
    { status: 402 },
  )
}
