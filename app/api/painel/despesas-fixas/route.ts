import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'

const SchemaPost = z.object({
  descricao: z.string().min(1).max(200),
  valor: z.number().positive(),
  dia_vencimento: z.number().int().min(1).max(28),
  categoria_id: z.string().uuid().optional(),
})

export async function GET() {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const db = criarClienteServico()
  const { data, error } = await db
    .from('despesas_fixas')
    .select('id, descricao, valor, dia_vencimento, ativa, criado_em, categoria:categorias_fin(nome, cor)')
    .eq('barbearia_id', sessao.barbearia_id)
    .order('dia_vencimento')

  if (error) return NextResponse.json({ erro: 'Erro ao buscar despesas' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parse = SchemaPost.safeParse(body)
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })

  const db = criarClienteServico()
  const { data, error } = await db
    .from('despesas_fixas')
    .insert({ ...parse.data, barbearia_id: sessao.barbearia_id })
    .select('id, descricao, valor, dia_vencimento, ativa, criado_em')
    .single()

  if (error) return NextResponse.json({ erro: 'Erro ao criar despesa' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
