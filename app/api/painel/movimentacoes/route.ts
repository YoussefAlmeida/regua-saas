import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { CAMPOS_MOV } from '@/lib/financeiro'
import { criarClienteServico } from '@/lib/supabase/server'
import { bloqueioSomenteLeitura } from '@/lib/conta'
import { registrarAuditoria } from '@/lib/auditoria'
import { limitesDoMes } from '@/lib/periodo'

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
    .select(CAMPOS_MOV)
    .eq('barbearia_id', sessao.barbearia_id)
    .order('data', { ascending: false })
    .order('criado_em', { ascending: false })

  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const { de, ate } = limitesDoMes(mes)
    query = query.gte('data', de).lt('data', ate)
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
  if (parse.data.categoria_id) {
    const { data: cat } = await db.from('categorias_fin').select('tipo')
      .eq('id', parse.data.categoria_id).eq('barbearia_id', sessao.barbearia_id).maybeSingle()
    if (!cat || cat.tipo !== parse.data.tipo) return NextResponse.json({ erro: 'Categoria inválida' }, { status: 400 })
  }
  if (parse.data.profissional_id) {
    const { data: p } = await db.from('profissionais').select('id')
      .eq('id', parse.data.profissional_id).eq('barbearia_id', sessao.barbearia_id).maybeSingle()
    if (!p) return NextResponse.json({ erro: 'Barbeiro inválido' }, { status: 400 })
  }

  const { data, error } = await db
    .from('movimentacoes')
    .insert({
      ...parse.data,
      barbearia_id: sessao.barbearia_id,
      origem: 'manual',
      criado_por: sessao.usuario_id,
    })
    .select(CAMPOS_MOV)
    .single()

  if (error) return NextResponse.json({ erro: 'Erro ao criar movimentação' }, { status: 500 })

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id,
    usuario_id: sessao.usuario_id,
    acao: 'criar',
    tabela: 'movimentacoes',
    registro_id: data.id,
    depois: { tipo: data.tipo, descricao: data.descricao, valor: data.valor, data: data.data },
    req,
  })

  return NextResponse.json(data, { status: 201 })
}
