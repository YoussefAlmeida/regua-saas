import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { podeMexerNaAgendaDe } from '@/lib/profissional-acesso'
import { registrarAuditoria } from '@/lib/auditoria'
import { limitesDoDia } from '@/lib/disponibilidade'
import { falhaInterna } from '@/lib/erros'

const SchemaPost = z.object({
  profissional_id: z.string().uuid(),
  inicio: z.string().datetime({ offset: true }),
  fim: z.string().datetime({ offset: true }),
  motivo: z.string().max(120).optional(),
})

export async function GET(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  // ?data=YYYY-MM-DD → bloqueios de toda a equipe naquele dia (pra Agenda)
  const dia = req.nextUrl.searchParams.get('data')
  if (dia) {
    if (sessao.papel === 'cliente' || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }
    const { gte, lt } = limitesDoDia(dia)
    const { data, error } = await criarClienteServico()
      .from('bloqueios_agenda')
      .select('id, profissional_id, inicio, fim, motivo')
      .eq('barbearia_id', sessao.barbearia_id)
      .lt('inicio', lt)
      .gt('fim', gte)
      .order('inicio')
    if (error) return falhaInterna('painel/bloqueios', error, 'Erro ao buscar bloqueios')
    return NextResponse.json(data)
  }

  const profissional_id = req.nextUrl.searchParams.get('profissional_id') ?? sessao.profissional_id
  if (!profissional_id || !(await podeMexerNaAgendaDe(sessao, profissional_id))) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { data, error } = await criarClienteServico()
    .from('bloqueios_agenda')
    .select('id, inicio, fim, motivo')
    .eq('profissional_id', profissional_id)
    .gte('fim', new Date().toISOString())
    .order('inicio')
    .limit(100)

  if (error) return falhaInterna('painel/bloqueios', error, 'Erro ao buscar bloqueios')
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const parse = SchemaPost.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
  const { profissional_id, inicio, fim, motivo } = parse.data

  if (!(await podeMexerNaAgendaDe(sessao, profissional_id))) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }
  if (new Date(fim) <= new Date(inicio)) {
    return NextResponse.json({ erro: 'O fim do bloqueio precisa ser depois do início' }, { status: 400 })
  }
  if (new Date(fim) <= new Date()) {
    return NextResponse.json({ erro: 'Esse horário já passou' }, { status: 400 })
  }

  const db = criarClienteServico()

  // Nunca bloqueia por cima de cliente marcado sem avisar (Módulo 3)
  const { data: conflitos } = await db
    .from('agendamentos')
    .select('id, inicio, cliente:usuarios!cliente_id(nome, whatsapp), servico:servicos!servico_id(nome)')
    .eq('profissional_id', profissional_id)
    .in('status', ['agendado', 'confirmado'])
    .lt('inicio', fim)
    .gt('fim', inicio)
    .order('inicio')

  if (conflitos && conflitos.length > 0) {
    return NextResponse.json({
      erro: `Tem ${conflitos.length} cliente${conflitos.length > 1 ? 's' : ''} marcado${conflitos.length > 1 ? 's' : ''} nesse período. Cancele ou remarque antes de bloquear.`,
      conflitos,
    }, { status: 409 })
  }

  const { data, error } = await db
    .from('bloqueios_agenda')
    .insert({
      barbearia_id: sessao.barbearia_id,
      profissional_id,
      inicio,
      fim,
      motivo: motivo?.trim() || null,
      criado_por: sessao.usuario_id,
    })
    .select('id, inicio, fim, motivo')
    .single()

  if (error) return falhaInterna('painel/bloqueios', error, 'Erro ao bloquear horário')

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id,
    usuario_id: sessao.usuario_id,
    acao: 'criar',
    tabela: 'bloqueios_agenda',
    registro_id: data.id,
    depois: data,
    req,
  })

  return NextResponse.json(data, { status: 201 })
}
