import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { bloqueioSomenteLeitura } from '@/lib/conta'
import { hashSenha } from '@/lib/auth'
import { normalizarWhatsapp } from '@/lib/utils'
import { podeMexerNaAgendaDe } from '@/lib/profissional-acesso'
import { registrarAuditoria } from '@/lib/auditoria'
import { falhaInterna } from '@/lib/erros'

const SchemaPost = z.object({
  profissional_id: z.string().uuid(),
  servico_id: z.string().uuid(),
  inicio: z.string(),
  cliente_id: z.string().uuid().optional(),
  cliente_nome: z.string().min(1).max(100).optional(),
  cliente_whatsapp: z.string().min(8).max(20).optional(),
  observacao: z.string().max(500).optional(),
})

export async function GET(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const data = req.nextUrl.searchParams.get('data')
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ erro: 'Parâmetro data inválido' }, { status: 400 })
  }

  // Bahia = UTC-3: dia local começa às 03:00 UTC
  const [y, m, d] = data.split('-').map(Number)
  const inicio_gte = new Date(Date.UTC(y, m - 1, d, 3, 0, 0)).toISOString()
  const inicio_lt  = new Date(Date.UTC(y, m - 1, d + 1, 3, 0, 0)).toISOString()

  const db = criarClienteServico()
  const { data: agendamentos, error } = await db
    .from('agendamentos')
    .select(`
      id, inicio, fim, status, valor_servico, observacao,
      profissional:profissionais!profissional_id(id, nome),
      cliente:usuarios!cliente_id(nome, whatsapp),
      servico:servicos!servico_id(nome, duracao_min, cor)
    `)
    .eq('barbearia_id', sessao.barbearia_id)
    .gte('inicio', inicio_gte)
    .lt('inicio', inicio_lt)
    .order('inicio')

  if (error) return falhaInterna('painel/agendamentos', error, 'Erro ao buscar agendamentos')
  return NextResponse.json(agendamentos)
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
    .eq('profissional_id', profissional_id)
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

  // Cria cliente se não veio cliente_id
  if (!cliente_id) {
    const { cliente_nome } = parse.data
    const cliente_whatsapp = parse.data.cliente_whatsapp ? normalizarWhatsapp(parse.data.cliente_whatsapp) : ''
    if (!cliente_nome || !cliente_whatsapp) {
      return NextResponse.json({ erro: 'Informe o nome e o WhatsApp do cliente' }, { status: 400 })
    }
    if (cliente_whatsapp.length < 10 || cliente_whatsapp.length > 11) {
      return NextResponse.json({ erro: 'WhatsApp inválido. Use DDD + número.' }, { status: 400 })
    }

    // Busca ou cria cliente — o mesmo número pode ser cliente em outras barbearias
    const { data: existente } = await db
      .from('usuarios')
      .select('id, papel')
      .eq('whatsapp', cliente_whatsapp)
      .eq('barbearia_id', sessao.barbearia_id)
      .maybeSingle()

    if (existente) {
      if (existente.papel !== 'cliente') {
        return NextResponse.json({ erro: 'Esse WhatsApp é de alguém da equipe. Use o número do cliente.' }, { status: 409 })
      }
      cliente_id = existente.id
    } else {
      const senha_hash = await hashSenha(crypto.randomUUID())
      const { data: novoCliente, error: errCliente } = await db
        .from('usuarios')
        .insert({
          barbearia_id: sessao.barbearia_id,
          nome: cliente_nome,
          whatsapp: cliente_whatsapp,
          senha_hash,
          papel: 'cliente',
          status: 'aprovado',
          senha_definida: false, // cliente escolhe a senha no primeiro agendamento pelo link
        })
        .select('id')
        .single()

      if (errCliente) return falhaInterna('painel/agendamentos', errCliente, 'Erro ao criar cliente')
      cliente_id = novoCliente.id
    }
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
      criado_por: sessao.usuario_id,
      observacao: observacao ?? null,
    })
    .select(`
      id, inicio, fim, status, valor_servico, observacao,
      profissional:profissionais!profissional_id(id, nome),
      cliente:usuarios!cliente_id(nome, whatsapp),
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
