import { NextResponse } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'

/* ================================================================
   Modo somente leitura — seção 6.1.3
   Trial vencido ('leitura') ou cancelado: vê os dados, mas não cria
   agendamento novo nem lança financeiro.
   ================================================================ */

const STATUS_BLOQUEADOS = ['leitura', 'cancelado']

/** Retorna uma resposta 402 se a conta não pode escrever; null se pode */
export async function bloqueioSomenteLeitura(barbearia_id: string): Promise<NextResponse | null> {
  const db = criarClienteServico()
  const { data } = await db
    .from('barbearias')
    .select('status')
    .eq('id', barbearia_id)
    .single()

  if (data && !STATUS_BLOQUEADOS.includes(data.status)) return null

  return NextResponse.json(
    { erro: 'Seu teste acabou. Escolha um plano em Mais → Meu plano pra voltar a lançar.' },
    { status: 402 },
  )
}
