import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { podeMexerNaAgendaDe } from '@/lib/profissional-acesso'
import { registrarAuditoria } from '@/lib/auditoria'
import { paraMin } from '@/lib/disponibilidade'
import { falhaInterna } from '@/lib/erros'

const hora = z.string().regex(/^\d{2}:\d{2}$/)

const SchemaPut = z.object({
  profissional_id: z.string().uuid(),
  dias: z.array(z.object({
    dia_semana: z.number().int().min(0).max(6),
    inicio: hora,
    fim: hora,
    intervalo_inicio: hora.nullable().optional(),
    intervalo_fim: hora.nullable().optional(),
  })).max(7),
})

export async function GET(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const profissional_id = req.nextUrl.searchParams.get('profissional_id') ?? sessao.profissional_id
  if (!profissional_id || !(await podeMexerNaAgendaDe(sessao, profissional_id))) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { data, error } = await criarClienteServico()
    .from('horarios_trabalho')
    .select('dia_semana, inicio, fim, intervalo_inicio, intervalo_fim')
    .eq('profissional_id', profissional_id)
    .order('dia_semana')

  if (error) return falhaInterna('painel/horarios', error, 'Erro ao buscar horários')
  return NextResponse.json(data)
}

/** Substitui a semana inteira do barbeiro. Lista vazia = volta a seguir o horário da barbearia */
export async function PUT(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const parse = SchemaPut.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
  const { profissional_id, dias } = parse.data

  if (!(await podeMexerNaAgendaDe(sessao, profissional_id))) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const vistos = new Set<number>()
  for (const d of dias) {
    if (vistos.has(d.dia_semana)) return NextResponse.json({ erro: 'Dia repetido' }, { status: 400 })
    vistos.add(d.dia_semana)
    if (paraMin(d.fim) <= paraMin(d.inicio)) {
      return NextResponse.json({ erro: 'O fim do expediente precisa ser depois do início' }, { status: 400 })
    }
    const temInt = d.intervalo_inicio || d.intervalo_fim
    if (temInt) {
      if (!d.intervalo_inicio || !d.intervalo_fim) {
        return NextResponse.json({ erro: 'Preencha início e fim do almoço' }, { status: 400 })
      }
      const a = paraMin(d.intervalo_inicio), b = paraMin(d.intervalo_fim)
      if (b <= a || a < paraMin(d.inicio) || b > paraMin(d.fim)) {
        return NextResponse.json({ erro: 'O almoço precisa ficar dentro do expediente' }, { status: 400 })
      }
    }
  }

  const db = criarClienteServico()
  const { data: antes } = await db
    .from('horarios_trabalho')
    .select('dia_semana, inicio, fim, intervalo_inicio, intervalo_fim')
    .eq('profissional_id', profissional_id)

  const { error: errDel } = await db.from('horarios_trabalho').delete().eq('profissional_id', profissional_id)
  if (errDel) return falhaInterna('painel/horarios', errDel, 'Erro ao salvar horários')

  if (dias.length > 0) {
    const { error } = await db.from('horarios_trabalho').insert(
      dias.map(d => ({
        profissional_id,
        dia_semana: d.dia_semana,
        inicio: d.inicio,
        fim: d.fim,
        intervalo_inicio: d.intervalo_inicio || null,
        intervalo_fim: d.intervalo_fim || null,
      })),
    )
    if (error) {
      // Tenta devolver o que tinha antes pra não deixar o barbeiro sem agenda
      if (antes?.length) await db.from('horarios_trabalho').insert(antes.map(a => ({ ...a, profissional_id })))
      return falhaInterna('painel/horarios', error, 'Erro ao salvar horários')
    }
  }

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id,
    usuario_id: sessao.usuario_id,
    acao: 'editar',
    tabela: 'horarios_trabalho',
    registro_id: profissional_id,
    antes,
    depois: dias,
    req,
  })

  return NextResponse.json({ ok: true })
}
