import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { podeExecutar } from '@/lib/permissoes'
import { falhaInterna } from '@/lib/erros'

const Schema = z.object({
  nome: z.string().min(1).max(80).optional(),
  preco: z.number().min(0).optional(),
  duracao_min: z.number().int().min(5).max(480).optional(),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  ativo: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!podeExecutar('servicos:write', sessao)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parse = Schema.safeParse(body)
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })

  const db = criarClienteServico()
  const { data, error } = await db
    .from('servicos')
    .update(parse.data)
    .eq('id', id)
    .eq('barbearia_id', sessao.barbearia_id)
    .select()
    .single()

  if (error) return falhaInterna('painel/servicos/id', error, 'Erro ao atualizar')
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!podeExecutar('servicos:write', sessao)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const db = criarClienteServico()

  // Verifica se há agendamentos futuros antes de deletar
  const { count } = await db
    .from('agendamentos')
    .select('id', { count: 'exact', head: true })
    .eq('servico_id', id)
    .eq('barbearia_id', sessao.barbearia_id)
    .gte('inicio', new Date().toISOString())
    .in('status', ['agendado', 'confirmado'])

  if (count && count > 0) {
    return NextResponse.json(
      { erro: 'Existem agendamentos futuros com este serviço. Desative-o em vez de deletar.' },
      { status: 409 },
    )
  }

  const { error } = await db
    .from('servicos')
    .delete()
    .eq('id', id)
    .eq('barbearia_id', sessao.barbearia_id)

  if (error) return falhaInterna('painel/servicos/id', error, 'Erro ao deletar')
  return NextResponse.json({ ok: true })
}
