import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { podeMexerNaAgendaDe } from '@/lib/profissional-acesso'
import { registrarAuditoria } from '@/lib/auditoria'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const db = criarClienteServico()
  const { data: bloq } = await db
    .from('bloqueios_agenda')
    .select('id, profissional_id, inicio, fim, motivo')
    .eq('id', id)
    .eq('barbearia_id', sessao.barbearia_id)
    .maybeSingle()

  if (!bloq) return NextResponse.json({ erro: 'Bloqueio não encontrado' }, { status: 404 })
  if (!(await podeMexerNaAgendaDe(sessao, bloq.profissional_id))) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { error } = await db.from('bloqueios_agenda').delete().eq('id', id)
  if (error) return NextResponse.json({ erro: 'Erro ao remover bloqueio' }, { status: 500 })

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id,
    usuario_id: sessao.usuario_id,
    acao: 'apagar',
    tabela: 'bloqueios_agenda',
    registro_id: id,
    antes: bloq,
    req,
  })

  return NextResponse.json({ ok: true })
}
