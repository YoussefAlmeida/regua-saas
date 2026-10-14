import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { clientePodeCancelar } from '@/lib/cancelamento'
import { registrarAuditoria } from '@/lib/auditoria'
import { enviarTexto } from '@/lib/whatsapp'
import { falhaInterna } from '@/lib/erros'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'cliente') return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const db = criarClienteServico()

  const { data: ag } = await db
    .from('agendamentos')
    .select(`
      id, inicio, status, cliente_id,
      cliente:usuarios!cliente_id(nome),
      servico:servicos!servico_id(nome),
      profissional:profissionais!profissional_id(nome, usuario:usuarios!usuario_id(whatsapp))
    `)
    .eq('id', id)
    .eq('cliente_id', sessao.usuario_id)
    .maybeSingle()

  if (!ag) return NextResponse.json({ erro: 'Agendamento não encontrado' }, { status: 404 })
  if (ag.status === 'cancelado') return NextResponse.json({ erro: 'Esse horário já foi cancelado' }, { status: 400 })
  if (!clientePodeCancelar(ag.inicio, ag.status)) {
    return NextResponse.json(
      { erro: 'Falta menos de 1 hora. Pra cancelar agora, fala direto com a barbearia.' },
      { status: 400 },
    )
  }

  const { error } = await db
    .from('agendamentos')
    .update({ status: 'cancelado', cancelado_por: 'cliente', atualizado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) return falhaInterna('cliente/agendamentos/id/cancelar', error, 'Erro ao cancelar')

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id,
    usuario_id: sessao.usuario_id,
    acao: 'status:cancelado',
    tabela: 'agendamentos',
    registro_id: id,
    antes: { status: ag.status },
    depois: { status: 'cancelado', cancelado_por: 'cliente' },
    req,
  })

  // Avisa o barbeiro que o horário abriu
  const um = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)
  const prof = um(ag.profissional as never) as { nome: string; usuario: unknown } | null
  const profWa = (um(prof?.usuario as never) as { whatsapp?: string } | null)?.whatsapp
  if (profWa) {
    const quando = new Date(ag.inicio).toLocaleString('pt-BR', {
      timeZone: 'America/Bahia', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    })
    const cli = um(ag.cliente as never) as { nome?: string } | null
    const srv = um(ag.servico as never) as { nome?: string } | null
    await enviarTexto(profWa, `❌ *Horário liberado*\n\n${cli?.nome ?? 'Cliente'} cancelou ${srv?.nome ?? 'o atendimento'} de ${quando}.`)
      .catch(() => false)
  }

  return NextResponse.json({ ok: true })
}
