import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { falhaInterna } from '@/lib/erros'

const PALETA = ['#2E7A4E', '#B4322A', '#9A4A1A', '#2F5F8A', '#6A635B']

export async function GET() {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

  const { data, error } = await criarClienteServico()
    .from('categorias_fin')
    .select('id, nome, tipo, cor, padrao')
    .eq('barbearia_id', sessao.barbearia_id)
    .order('padrao', { ascending: false })
    .order('nome')
  if (error) return falhaInterna('painel/categorias', error, 'Erro ao buscar categorias')
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
    return falhaInterna('painel/categorias', error, 'Erro ao criar categoria')
  }
  return NextResponse.json(data, { status: 201 })
}
