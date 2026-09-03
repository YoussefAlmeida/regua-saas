import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'

const SchemaPatch = z.object({
  descricao: z.string().min(1).max(200).optional(),
  valor: z.number().positive().optional(),
  dia_vencimento: z.number().int().min(1).max(28).optional(),
  ativa: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parse = SchemaPatch.safeParse(body)
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })

  const db = criarClienteServico()
  const { data, error } = await db
    .from('despesas_fixas')
    .update(parse.data)
    .eq('id', id)
    .eq('barbearia_id', sessao.barbearia_id)
    .select('id, descricao, valor, dia_vencimento, ativa')
    .single()

  if (error) return NextResponse.json({ erro: 'Erro ao atualizar' }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const db = criarClienteServico()
  const { error } = await db
    .from('despesas_fixas')
    .delete()
    .eq('id', id)
    .eq('barbearia_id', sessao.barbearia_id)

  if (error) return NextResponse.json({ erro: 'Erro ao deletar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
