import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { podeMexerNaAgendaDe } from '@/lib/profissional-acesso'
import { registrarAuditoria } from '@/lib/auditoria'
import { falhaInterna } from '@/lib/erros'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const db = criarClienteServico()
  const { data: bloq } = await db
    .from('bloqueios_agenda')
    .select('id, profissional_id, inicio, fim, motivo, criado_por')
    .eq('id', id)
    .eq('barbearia_id', sessao.barbearia_id)
    .maybeSingle()

  if (!bloq) return NextResponse.json({ erro: 'Bloqueio não encontrado' }, { status: 404 })
  // O que o dono decidiu, só o dono desfaz
  if (sessao.papel !== 'dono' && (bloq.profissional_id === null || bloq.criado_por !== sessao.usuario_id)) {
    return NextResponse.json({ erro: 'Esse bloqueio foi feito pelo dono da barbearia. Só ele pode liberar.' }, { status: 403 })
  }
  if (bloq.profissional_id !== null && !(await podeMexerNaAgendaDe(sessao, bloq.profissional_id))) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { error } = await db.from('bloqueios_agenda').delete().eq('id', id)
  if (error) return falhaInterna('painel/bloqueios/id', error, 'Erro ao remover bloqueio')

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
