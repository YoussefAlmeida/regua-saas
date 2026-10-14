import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { registrarAuditoria } from '@/lib/auditoria'
import { falhaInterna } from '@/lib/erros'
import { bloqueioSomenteLeitura } from '@/lib/conta'

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
  const leitura = await bloqueioSomenteLeitura(sessao.barbearia_id)
  if (leitura) return leitura

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

  if (error) return falhaInterna('painel/despesas-fixas/id', error, 'Erro ao atualizar')
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }
  const leitura = await bloqueioSomenteLeitura(sessao.barbearia_id)
  if (leitura) return leitura

  const { id } = await params
  const db = criarClienteServico()

  const { data: fixa } = await db
    .from('despesas_fixas')
    .select('id, descricao, valor, dia_vencimento')
    .eq('id', id)
    .eq('barbearia_id', sessao.barbearia_id)
    .maybeSingle()
  if (!fixa) return NextResponse.json({ erro: 'Despesa fixa não encontrada' }, { status: 404 })

  // Os meses já lançados continuam no extrato — só soltam o vínculo
  await db.from('movimentacoes').update({ recorrente_id: null }).eq('recorrente_id', id)

  const { error } = await db.from('despesas_fixas').delete().eq('id', id)
  if (error) return falhaInterna('painel/despesas-fixas/id', error, 'Erro ao apagar')

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id,
    usuario_id: sessao.usuario_id,
    acao: 'apagar',
    tabela: 'despesas_fixas',
    registro_id: id,
    antes: fixa,
    req,
  })
  return NextResponse.json({ ok: true })
}
