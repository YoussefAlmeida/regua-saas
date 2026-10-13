import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const db = criarClienteServico()

  // Só permite deletar movimentações manuais
  const { data: mov } = await db
    .from('movimentacoes')
    .select('id, origem, agendamento_id')
    .eq('id', id)
    .eq('barbearia_id', sessao.barbearia_id)
    .maybeSingle()

  if (!mov) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
  // Entrada que veio de agendamento some sozinha quando o status volta.
  // Despesa fixa lançada pelo cron pode ser apagada (o mês teve valor diferente).
  if (mov.origem === 'automatica' && mov.agendamento_id) {
    return NextResponse.json({ erro: 'Essa entrada veio de um agendamento — mude o status dele pra remover' }, { status: 400 })
  }

  const { error } = await db
    .from('movimentacoes')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ erro: 'Erro ao deletar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
