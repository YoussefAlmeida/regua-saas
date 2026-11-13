import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { bloqueioSomenteLeitura } from '@/lib/conta'
import { normalizarWhatsapp } from '@/lib/utils'
import { podeMexerNaAgendaDe } from '@/lib/profissional-acesso'
import { registrarAuditoria } from '@/lib/auditoria'
import { falhaInterna } from '@/lib/erros'
import { comInicio } from '@/lib/extras'

const SchemaPost = z.object({
  profissional_id: z.string().uuid(),
  servico_id: z.string().uuid(),
  inicio: z.string(),
  cliente_id: z.string().uuid().optional(),
  cliente_whatsapp: z.string().min(8).max(20).optional(),
  observacao: z.string().max(500).optional(),
})

export async function GET(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (sessao.papel !== 'dono' && sessao.papel !== 'barbeiro') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const data = req.nextUrl.searchParams.get('data')
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ erro: 'Parâmetro data inválido' }, { status: 400 })
  }

  // Bahia = UTC-3: dia local começa às 03:00 UTC
  const [y, m, d] = data.split('-').map(Number)
  const inicio_gte = new Date(Date.UTC(y, m - 1, d, 3, 0, 0)).toISOString()
  // ?dias=7 → a semana a partir de "data"; ?dias=42 → as seis semanas da visão do mês
  const dias = Math.min(42, Math.max(1, Number(req.nextUrl.searchParams.get('dias') ?? 1) || 1))
  const inicio_lt  = new Date(Date.UTC(y, m - 1, d + dias, 3, 0, 0)).toISOString()

  const db = criarClienteServico()
  let consulta = db
    .from('agendamentos')
    .select(`
      id, inicio, fim, status, valor_servico, observacao,
      profissional:profissionais!profissional_id(id, nome),
      cliente:usuarios!cliente_id(id, nome, whatsapp),
      servico:servicos!servico_id(nome, duracao_min, cor)
    `)
    .eq('barbearia_id', sessao.barbearia_id)
    .neq('status', 'cancelado')
    .gte('inicio', inicio_gte)
    .lt('inicio', inicio_lt)
    .order('inicio')
  // Barbeiro recebe só a própria agenda (os clientes dos colegas não saem do servidor)
  if (sessao.papel === 'barbeiro') {
    if (!sessao.profissional_id) return NextResponse.json([])
    consulta = consulta.eq('profissional_id', sessao.profissional_id)
  }
  const { data: agendamentos, error } = await consulta

  if (error) return falhaInterna('painel/agendamentos', error, 'Erro ao buscar agendamentos')
  return NextResponse.json(await comInicio(db, agendamentos ?? []))
}

export async function POST(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel === 'cliente') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const bloqueio = await bloqueioSomenteLeitura(sessao.barbearia_id)
  if (bloqueio) return bloqueio

  const body = await req.json().catch(() => null)
  const parse = SchemaPost.safeParse(body)
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })

  const { profissional_id, servico_id, inicio, observacao } = parse.data
  let { cliente_id } = parse.data

  // Barbeiro só marca na própria agenda; dono em qualquer barbeiro DA barbearia dele
  if (!(await podeMexerNaAgendaDe(sessao, profissional_id))) {
    return NextResponse.json({ erro: 'Você só pode marcar na sua própria agenda' }, { status: 403 })
  }

  const db = criarClienteServico()

  // Fora da agenda: os horários já marcados continuam, mas não entra horário novo
  const { data: prof } = await db.from('profissionais').select('nome, ativo').eq('id', profissional_id).maybeSingle()
  if (!prof?.ativo) {
    return NextResponse.json({
      erro: sessao.papel === 'barbeiro'
        ? 'Você está fora da agenda: dá pra ver e atender o que já está marcado, mas não marcar horário novo.'
        : `${prof?.nome ?? 'Esse barbeiro'} está fora da agenda. Ligue ele de novo em Mais → Equipe pra marcar horário novo.`,
    }, { status: 409 })
  }

  // Busca serviço para calcular fim e pegar preço snapshot
  const { data: servico } = await db
    .from('servicos')
    .select('id, preco, duracao_min')
    .eq('id', servico_id)
    .eq('barbearia_id', sessao.barbearia_id)
    .single()

  if (!servico) return NextResponse.json({ erro: 'Serviço não encontrado' }, { status: 404 })

  const inicioDate = new Date(inicio)
  if (isNaN(inicioDate.getTime())) return NextResponse.json({ erro: 'Horário inválido' }, { status: 400 })
  const fimDate = new Date(inicioDate.getTime() + servico.duracao_min * 60 * 1000)

  // Encaixe fora do expediente é liberado pro painel, mas não por cima de um bloqueio
  const { count: bloqueado } = await db
    .from('bloqueios_agenda')
    .select('id', { count: 'exact', head: true })
    .eq('barbearia_id', sessao.barbearia_id)
    .or(`profissional_id.eq.${profissional_id},profissional_id.is.null`)
    .lt('inicio', fimDate.toISOString())
    .gt('fim', inicioDate.toISOString())
  if (bloqueado) {
    return NextResponse.json({ erro: 'Esse horário está bloqueado na agenda do barbeiro' }, { status: 409 })
  }

  if (cliente_id) {
    const { data: cli } = await db
      .from('usuarios')
      .select('id')
      .eq('id', cliente_id)
      .eq('barbearia_id', sessao.barbearia_id)
      .eq('papel', 'cliente')
      .maybeSingle()
    if (!cli) return NextResponse.json({ erro: 'Cliente não encontrado' }, { status: 404 })
  }

  // O painel só marca pra quem JÁ se cadastrou pelo link de agendamento.
  // A equipe não cria cadastro de cliente: quem é novo recebe o link e marca sozinho
  // (assim todo cadastro nasce com a pessoa aceitando os Termos e criando a própria senha).
  if (!cliente_id) {
    const cliente_whatsapp = parse.data.cliente_whatsapp ? normalizarWhatsapp(parse.data.cliente_whatsapp) : ''
    if (!cliente_whatsapp) {
      return NextResponse.json({ erro: 'Informe o WhatsApp do cliente' }, { status: 400 })
    }
    if (cliente_whatsapp.length < 10 || cliente_whatsapp.length > 11) {
      return NextResponse.json({ erro: 'WhatsApp inválido. Use DDD + número.' }, { status: 400 })
    }

    const { data: existente } = await db
      .from('usuarios')
      .select('id, papel, ativo')
      .eq('whatsapp', cliente_whatsapp)
      .eq('barbearia_id', sessao.barbearia_id)
      .maybeSingle()

    if (existente && existente.papel !== 'cliente') {
      return NextResponse.json({ erro: 'Esse WhatsApp é de alguém da equipe. Use o número do cliente.' }, { status: 409 })
    }
    if (!existente || !existente.ativo) {
      const { data: b } = await db.from('barbearias').select('slug').eq('id', sessao.barbearia_id).maybeSingle()
      return NextResponse.json({
        erro: 'Esse WhatsApp ainda não tem cadastro aqui. Mande o link de agendamento pra pessoa marcar o horário.',
        semCadastro: true,
        whatsapp: cliente_whatsapp,
        slug: b?.slug ?? null,
      }, { status: 404 })
    }
    cliente_id = existente.id
  }

  const { data: agendamento, error } = await db
    .from('agendamentos')
    .insert({
      barbearia_id: sessao.barbearia_id,
      profissional_id,
      servico_id,
      cliente_id,
      inicio: inicioDate.toISOString(),
      fim: fimDate.toISOString(),
      valor_servico: servico.preco,
      status: 'agendado',
      criado_por: sessao.usuario_id,
      observacao: observacao ?? null,
    })
    .select(`
      id, inicio, fim, status, valor_servico, observacao,
      profissional:profissionais!profissional_id(id, nome),
      cliente:usuarios!cliente_id(id, nome, whatsapp),
      servico:servicos!servico_id(nome, duracao_min, cor)
    `)
    .single()

  if (error) {
    const conflito = error.code === '23P01' || error.message.includes('sem_conflito')
    return NextResponse.json(
      { erro: conflito ? 'Esse barbeiro já tem cliente nesse horário' : 'Erro ao criar agendamento' },
      { status: conflito ? 409 : 500 },
    )
  }

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id,
    usuario_id: sessao.usuario_id,
    acao: 'criar',
    tabela: 'agendamentos',
    registro_id: agendamento.id,
    depois: { inicio: agendamento.inicio, profissional_id, servico_id, valor: agendamento.valor_servico },
    req,
  })

  return NextResponse.json(agendamento, { status: 201 })
}
