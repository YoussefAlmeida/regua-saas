import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'

const PALETA = ['#4FB477', '#E2564D', '#E8B04B', '#6BA3D6', '#A1A1A8']

export async function GET() {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

  const { data, error } = await criarClienteServico()
    .from('categorias_fin')
    .select('id, nome, tipo, cor, padrao')
    .eq('barbearia_id', sessao.barbearia_id)
    .order('padrao', { ascending: false })
    .order('nome')
  if (error) return NextResponse.json({ erro: 'Erro ao buscar categorias' }, { status: 500 })
  return NextResponse.json(data)
}

const SchemaPost = z.object({
  nome: z.string().trim().min(2).max(40),
  tipo: z.enum(['entrada', 'saida']),
})

export async function POST(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

  const parse = SchemaPost.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Nome da categoria: 2 a 40 letras' }, { status: 400 })

  const { data, error } = await criarClienteServico()
    .from('categorias_fin')
    .insert({
      barbearia_id: sessao.barbearia_id,
      nome: parse.data.nome,
      tipo: parse.data.tipo,
      cor: PALETA[Math.floor(Math.random() * PALETA.length)],
      padrao: false,
    })
    .select('id, nome, tipo, cor, padrao')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ erro: 'Essa categoria já existe' }, { status: 409 })
    return NextResponse.json({ erro: 'Erro ao criar categoria' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
