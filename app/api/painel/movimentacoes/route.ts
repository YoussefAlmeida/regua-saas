import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { bloqueioSomenteLeitura } from '@/lib/conta'

const SchemaPost = z.object({
  tipo: z.enum(['entrada', 'saida']),
  descricao: z.string().min(1).max(200),
  valor: z.number().positive(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoria_id: z.string().uuid().optional(),
  profissional_id: z.string().uuid().optional(),
})

export async function GET(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const mes = req.nextUrl.searchParams.get('mes') // 'YYYY-MM'
  const db = criarClienteServico()

  let query = db
    .from('movimentacoes')
    .select('id, tipo, descricao, valor, data, origem, profissional_id, agendamento_id, criado_em, categoria:categorias_fin(nome, cor)')
    .eq('barbearia_id', sessao.barbearia_id)
    .order('data', { ascending: false })
    .order('criado_em', { ascending: false })

  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    query = query.gte('data', `${mes}-01`).lt('data', `${mes}-32`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ erro: 'Erro ao buscar movimentações' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const bloqueio = await bloqueioSomenteLeitura(sessao.barbearia_id)
  if (bloqueio) return bloqueio

  const body = await req.json().catch(() => null)
  const parse = SchemaPost.safeParse(body)
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })

  const db = criarClienteServico()
  const { data, error } = await db
    .from('movimentacoes')
    .insert({
      ...parse.data,
      barbearia_id: sessao.barbearia_id,
      origem: 'manual',
      criado_por: sessao.usuario_id,
    })
    .select('id, tipo, descricao, valor, data, origem, criado_em, categoria:categorias_fin(nome, cor)')
    .single()

  if (error) return NextResponse.json({ erro: 'Erro ao criar movimentação' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
