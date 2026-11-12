import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { registrarAuditoria } from '@/lib/auditoria'
import { falhaInterna } from '@/lib/erros'
import { bloqueioSomenteLeitura } from '@/lib/conta'
import { podeMexerNaAgendaDe } from '@/lib/profissional-acesso'

/* ================================================================
   Remarcar um horário (equipe) — muda dia/hora e, se o dono quiser,
   o barbeiro. É UMA gravação só: se o horário novo já estiver ocupado,
   o banco recusa e o horário antigo continua como estava (nada de
   "cancelou o velho e não conseguiu criar o novo").
   Como no "Novo agendamento" do painel, encaixe fora do expediente é
   permitido; por cima de bloqueio, não.
   ================================================================ */

const Schema = z.object({
  inicio: z.string().datetime({ offset: true }),
  profissional_id: z.string().uuid().optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (sessao.papel !== 'dono' && sessao.papel !== 'barbeiro') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }
  const leitura = await bloqueioSomenteLeitura(sessao.barbearia_id)
  if (leitura) return leitura

  const parse = Schema.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Escolha o dia e o horário novos' }, { status: 400 })

  const { id } = await params
  const db = criarClienteServico()
  const { data: ag } = await db.from('agendamentos')
    .select('id, inicio, fim, status, profissional_id')
    .eq('id', id).eq('barbearia_id', sessao.barbearia_id).maybeSingle()
  if (!ag) return NextResponse.json({ erro: 'Agendamento não encontrado' }, { status: 404 })
  if (ag.status !== 'agendado' && ag.status !== 'confirmado') {
    return NextResponse.json({ erro: 'Só dá pra remarcar horário que ainda não foi atendido nem cancelado' }, { status: 400 })
  }

  const destino = parse.data.profissional_id ?? ag.profissional_id
  // Barbeiro só mexe na própria agenda: nem tira do colega, nem passa pro colega
  if (!(await podeMexerNaAgendaDe(sessao, ag.profissional_id)) || !(await podeMexerNaAgendaDe(sessao, destino))) {
    return NextResponse.json({ erro: 'Você só pode remarcar na sua própria agenda' }, { status: 403 })
  }
  if (destino !== ag.profissional_id) {
    const { data: prof } = await db.from('profissionais').select('nome, ativo').eq('id', destino).maybeSingle()
    if (!prof?.ativo) {
      return NextResponse.json({ erro: `${prof?.nome ?? 'Esse barbeiro'} está fora da agenda e não recebe horário novo.` }, { status: 409 })
    }
  }

  const inicio = new Date(parse.data.inicio)
  inicio.setUTCSeconds(0, 0)
  if (inicio.getTime() <= Date.now()) {
    return NextResponse.json({ erro: 'Esse horário já passou. Escolha um horário à frente.' }, { status: 400 })
  }
  // Mantém a duração que o horário já tinha
  const fim = new Date(inicio.getTime() + (new Date(ag.fim).getTime() - new Date(ag.inicio).getTime()))
  if (inicio.toISOString() === new Date(ag.inicio).toISOString() && destino === ag.profissional_id) {
    return NextResponse.json({ erro: 'O horário novo é igual ao atual' }, { status: 400 })
  }

  const { count: bloqueado } = await db.from('bloqueios_agenda')
    .select('id', { count: 'exact', head: true })
    .eq('barbearia_id', sessao.barbearia_id)
    .or(`profissional_id.eq.${destino},profissional_id.is.null`)
    .lt('inicio', fim.toISOString()).gt('fim', inicio.toISOString())
  if (bloqueado) return NextResponse.json({ erro: 'Esse horário está bloqueado na agenda' }, { status: 409 })

  const { data, error } = await db.from('agendamentos')
    .update({
      inicio: inicio.toISOString(), fim: fim.toISOString(), profissional_id: destino,
      // Horário novo, lembrete novo
      lembrete_cliente_enviado: false,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id).eq('barbearia_id', sessao.barbearia_id)
    .in('status', ['agendado', 'confirmado'])
    .select(`
      id, inicio, fim, status, valor_servico, observacao,
      profissional:profissionais!profissional_id(id, nome),
      cliente:usuarios!cliente_id(nome, whatsapp),
      servico:servicos!servico_id(nome, duracao_min, cor)
    `)
    .maybeSingle()

  if (error) {
    // 23P01 = já tem cliente nesse horário com esse barbeiro (o antigo fica como estava)
    if (error.code === '23P01') {
      return NextResponse.json({ erro: 'Já tem cliente nesse horário. Escolha outro.', horarioOcupado: true }, { status: 409 })
    }
    return falhaInterna('painel/agendamentos/reagendar', error, 'Não deu pra remarcar', { detalhe: { agendamento_id: id } })
  }
  if (!data) return NextResponse.json({ erro: 'Esse horário acabou de mudar de situação. Atualize a agenda.' }, { status: 409 })

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id,
    usuario_id: sessao.usuario_id,
    acao: 'remarcar',
    tabela: 'agendamentos',
    registro_id: id,
    antes: { inicio: ag.inicio, profissional_id: ag.profissional_id },
    depois: { inicio: data.inicio, profissional_id: destino },
    req,
  })

  return NextResponse.json(data)
}
