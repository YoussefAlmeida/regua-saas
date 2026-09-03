import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'

const SchemaPatch = z.object({
  status: z.enum(['aprovado', 'pendente']).optional(),
  ativo: z.boolean().optional(),
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

  // Garante que o usuário pertence à barbearia do dono
  const { data: usuario } = await db
    .from('usuarios')
    .select('id, papel')
    .eq('id', id)
    .eq('barbearia_id', sessao.barbearia_id)
    .eq('papel', 'barbeiro')
    .maybeSingle()

  if (!usuario) return NextResponse.json({ erro: 'Barbeiro não encontrado' }, { status: 404 })

  const { data, error } = await db
    .from('usuarios')
    .update(parse.data)
    .eq('id', id)
    .select('id, nome, status, ativo')
    .single()

  if (error) return NextResponse.json({ erro: 'Erro ao atualizar' }, { status: 500 })

  // Se aprovado, cria entrada em profissionais se ainda não existir
  if (parse.data.status === 'aprovado') {
    const { count } = await db
      .from('profissionais')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', id)
    if (!count || count === 0) {
      await db.from('profissionais').insert({
        barbearia_id: sessao.barbearia_id,
        usuario_id: id,
        nome: data.nome,
      })
    } else {
      await db.from('profissionais').update({ ativo: true }).eq('usuario_id', id)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const db = criarClienteServico()

  // Desativa em vez de deletar (preserva histórico)
  const { error } = await db
    .from('usuarios')
    .update({ ativo: false })
    .eq('id', id)
    .eq('barbearia_id', sessao.barbearia_id)
    .eq('papel', 'barbeiro')

  if (error) return NextResponse.json({ erro: 'Erro ao remover barbeiro' }, { status: 500 })

  await db.from('profissionais').update({ ativo: false }).eq('usuario_id', id)

  return NextResponse.json({ ok: true })
}
