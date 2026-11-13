import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { bloqueioSomenteLeitura } from '@/lib/conta'
import { registrarAuditoria } from '@/lib/auditoria'
import { falhaInterna } from '@/lib/erros'
import { semColuna, AVISO_ATUALIZACAO } from '@/lib/extras'

/* Iniciar atendimento: marca a hora em que o barbeiro começou.
   A situação continua "agendado" até finalizar (concluir); o horário
   segue ocupado e as outras regras não mudam.
   POST inicia · DELETE desfaz (clicou errado) */

async function mudar(req: NextRequest, id: string, iniciar: boolean) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (sessao.papel !== 'dono' && sessao.papel !== 'barbeiro') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  const leitura = await bloqueioSomenteLeitura(sessao.barbearia_id)
  if (leitura) return leitura

  const db = criarClienteServico()
  const { data: ag } = await db.from('agendamentos').select('id, status, profissional_id')
    .eq('id', id).eq('barbearia_id', sessao.barbearia_id).maybeSingle()
  if (!ag) return NextResponse.json({ erro: 'Agendamento não encontrado' }, { status: 404 })
  if (sessao.papel === 'barbeiro' && sessao.profissional_id !== ag.profissional_id) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }
  if (ag.status !== 'agendado' && ag.status !== 'confirmado') {
    return NextResponse.json({ erro: 'Esse atendimento já foi finalizado ou cancelado' }, { status: 400 })
  }

  const iniciado_em = iniciar ? new Date().toISOString() : null
  const { error } = await db.from('agendamentos')
    .update({ iniciado_em, atualizado_em: new Date().toISOString() })
    .eq('id', id).eq('barbearia_id', sessao.barbearia_id)
  if (semColuna(error)) return NextResponse.json({ erro: AVISO_ATUALIZACAO }, { status: 409 })
  if (error) return falhaInterna('painel/agendamentos/iniciar', error, 'Não deu pra iniciar o atendimento')

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id, usuario_id: sessao.usuario_id,
    acao: iniciar ? 'iniciar' : 'desfazer_inicio', tabela: 'agendamentos', registro_id: id, req,
  })
  return NextResponse.json({ id, iniciado_em })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return mudar(req, (await params).id, true)
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return mudar(req, (await params).id, false)
}
