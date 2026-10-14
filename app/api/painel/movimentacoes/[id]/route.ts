import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { CAMPOS_MOV } from '@/lib/financeiro'
import { criarClienteServico } from '@/lib/supabase/server'
import { exigirSenha } from '@/lib/reautenticar'
import { registrarAuditoria } from '@/lib/auditoria'
import { falhaInterna } from '@/lib/erros'
import { bloqueioSomenteLeitura } from '@/lib/conta'

/* Mexer em dinheiro já lançado pede a senha de novo e fica no log (seção 10) */

const CAMPOS = CAMPOS_MOV

const SchemaPatch = z.object({
  senha: z.string().min(1),
  descricao: z.string().trim().min(1).max(200).optional(),
  valor: z.number().positive().max(1_000_000).optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

async function carregar(id: string, barbearia_id: string) {
  const { data } = await criarClienteServico()
    .from('movimentacoes')
    .select(CAMPOS)
    .eq('id', id)
    .eq('barbearia_id', barbearia_id)
    .maybeSingle()
  return data
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  const leitura = await bloqueioSomenteLeitura(sessao.barbearia_id)
  if (leitura) return leitura

  const parse = SchemaPatch.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
  const { senha, ...mudancas } = parse.data

  const negado = await exigirSenha(sessao, senha, req)
  if (negado) return negado

  const { id } = await params
  const mov = await carregar(id, sessao.barbearia_id)
  if (!mov) return NextResponse.json({ erro: 'Lançamento não encontrado' }, { status: 404 })
  if (mov.agendamento_id && (mudancas.valor !== undefined || mudancas.data !== undefined)) {
    return NextResponse.json(
      { erro: 'Essa entrada veio de um agendamento. O valor é o do serviço na hora em que foi marcado.' },
      { status: 400 },
    )
  }

  const { data, error } = await criarClienteServico()
    .from('movimentacoes')
    .update(mudancas)
    .eq('id', id)
    .select(CAMPOS)
    .single()
  if (error) return falhaInterna('painel/movimentacoes/id', error, 'Erro ao salvar')

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id,
    usuario_id: sessao.usuario_id,
    acao: 'editar',
    tabela: 'movimentacoes',
    registro_id: id,
    antes: { descricao: mov.descricao, valor: mov.valor, data: mov.data },
    depois: mudancas,
    req,
  })

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  const leitura = await bloqueioSomenteLeitura(sessao.barbearia_id)
  if (leitura) return leitura

  const body = await req.json().catch(() => ({}))
  const negado = await exigirSenha(sessao, body?.senha, req)
  if (negado) return negado

  const { id } = await params
  const mov = await carregar(id, sessao.barbearia_id)
  if (!mov) return NextResponse.json({ erro: 'Lançamento não encontrado' }, { status: 404 })

  // Entrada que veio de agendamento some sozinha quando o status volta.
  // Despesa fixa lançada pelo cron pode ser apagada (o mês teve valor diferente).
  if (mov.origem === 'automatica' && mov.agendamento_id) {
    return NextResponse.json({ erro: 'Essa entrada veio de um agendamento — mude o status dele pra remover' }, { status: 400 })
  }

  const { error } = await criarClienteServico().from('movimentacoes').delete().eq('id', id)
  if (error) return falhaInterna('painel/movimentacoes/id', error, 'Erro ao apagar')

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id,
    usuario_id: sessao.usuario_id,
    acao: 'apagar',
    tabela: 'movimentacoes',
    registro_id: id,
    antes: { tipo: mov.tipo, descricao: mov.descricao, valor: mov.valor, data: mov.data, origem: mov.origem },
    req,
  })

  return NextResponse.json({ ok: true })
}
