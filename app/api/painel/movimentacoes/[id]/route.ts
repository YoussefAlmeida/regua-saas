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
    .select('id, origem')
    .eq('id', id)
    .eq('barbearia_id', sessao.barbearia_id)
    .maybeSingle()

  if (!mov) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
  if (mov.origem === 'automatica') {
    return NextResponse.json({ erro: 'Não é possível deletar movimentações automáticas' }, { status: 400 })
  }

  const { error } = await db
    .from('movimentacoes')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ erro: 'Erro ao deletar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
