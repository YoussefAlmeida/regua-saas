import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { registrarAuditoria } from '@/lib/auditoria'
import { falhaInterna, registrarErro } from '@/lib/erros'
import { bloqueioSomenteLeitura } from '@/lib/conta'
import { exigirSenha } from '@/lib/reautenticar'
import { limitesDoDia } from '@/lib/disponibilidade'

const SchemaPatch = z.object({
  status: z.enum(['agendado', 'confirmado', 'concluido', 'cancelado', 'faltou']),
  senha: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  // Status de atendimento é coisa da equipe; cliente só cancela o próprio em /api/cliente
  if (sessao.papel !== 'dono' && sessao.papel !== 'barbeiro') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const leitura = await bloqueioSomenteLeitura(sessao.barbearia_id)
  if (leitura) return leitura

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parse = SchemaPatch.safeParse(body)
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })

  const db = criarClienteServico()

  const { data: ag } = await db
    .from('agendamentos')
    .select('id, status, profissional_id')
    .eq('id', id)
    .eq('barbearia_id', sessao.barbearia_id)
    .maybeSingle()

  if (!ag) return NextResponse.json({ erro: 'Agendamento não encontrado' }, { status: 404 })

  // Barbeiro só pode atualizar agendamentos dos seus próprios horários
  if (sessao.papel === 'barbeiro' && sessao.profissional_id !== ag.profissional_id) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const statusAntes = ag.status
  if (statusAntes === parse.data.status) {
    return NextResponse.json({ erro: 'O agendamento já está com esse status' }, { status: 400 })
  }

  // Desfazer "concluído" tira dinheiro do caixa. Se a entrada caiu hoje é correção
  // de clique; entrada de outro dia só o dono, com a senha (igual no Financeiro).
  if (statusAntes === 'concluido') {
    const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
    const { count: antigas } = await db
      .from('movimentacoes')
      .select('id', { count: 'exact', head: true })
      .eq('agendamento_id', id)
      .eq('origem', 'automatica')
      .lt('criado_em', limitesDoDia(hoje).gte)
    if (antigas) {
      if (sessao.papel !== 'dono') {
        return NextResponse.json({ erro: 'Esse atendimento entrou no caixa em outro dia. Peça pro dono desfazer.' }, { status: 403 })
      }
      const negado = await exigirSenha(sessao, parse.data.senha, req)
      if (negado) return negado
    }
  }

  const update: Record<string, unknown> = {
    status: parse.data.status,
    atualizado_em: new Date().toISOString(),
  }
  if (parse.data.status === 'cancelado') {
    update.cancelado_por = sessao.papel
  }

  const { data, error } = await db
    .from('agendamentos')
    .update(update)
    .eq('id', id)
    .select(`
      id, inicio, fim, status, valor_servico, observacao, cancelado_por,
      profissional_id,
      profissional:profissionais!profissional_id(id, nome),
      cliente:usuarios!cliente_id(nome, whatsapp),
      servico:servicos!servico_id(nome, duracao_min, cor)
    `)
    .single()

  if (error) {
    // 23P01 = violação da regra "sem dois clientes no mesmo horário"
    if (error.code === '23P01') {
      return NextResponse.json(
        { erro: 'Esse horário já foi ocupado por outro cliente. Remarque antes de reativar.' },
        { status: 409 },
      )
    }
    return falhaInterna('painel/agendamentos/status', error, 'Erro ao atualizar', { detalhe: { agendamento_id: id, status: parse.data.status } })
  }

  // Saiu de "concluído" (marcou por engano): a entrada automática some junto
  let entrada: 'lancada' | 'removida' | null = null
  if (statusAntes === 'concluido' && parse.data.status !== 'concluido') {
    const { data: removidas } = await db
      .from('movimentacoes')
      .delete()
      .eq('agendamento_id', id)
      .eq('origem', 'automatica')
      .select('id')
    if (removidas?.length) entrada = 'removida'
  }

  // Gera entrada financeira automática ao concluir
  if (parse.data.status === 'concluido' && data) {
    const { count } = await db
      .from('movimentacoes')
      .select('id', { count: 'exact', head: true })
      .eq('agendamento_id', id)
    if (!count || count === 0) {
      const dataLocal = new Date(data.inicio).toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
      const servicoNome = Array.isArray(data.servico) ? data.servico[0]?.nome : (data.servico as { nome: string } | null)?.nome
      // Índice único no banco: clique duplo não lança duas vezes (23505 = já lançada)
      const { error: errEntrada } = await db.from('movimentacoes').insert({
        barbearia_id: sessao.barbearia_id,
        tipo: 'entrada',
        descricao: `Serviço — ${servicoNome ?? 'Atendimento'}`,
        valor: data.valor_servico,
        data: dataLocal,
        profissional_id: data.profissional_id,
        agendamento_id: id,
        origem: 'automatica',
        criado_por: sessao.usuario_id,
      })
      if (!errEntrada) entrada = 'lancada'
      else if (errEntrada.code !== '23505') await registrarErro('concluir: entrada automática', errEntrada, { barbearia_id: sessao.barbearia_id, usuario_id: sessao.usuario_id })
    }
  }

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id,
    usuario_id: sessao.usuario_id,
    acao: `status:${parse.data.status}`,
    tabela: 'agendamentos',
    registro_id: id,
    antes: { status: statusAntes },
    depois: { status: parse.data.status, entrada },
    req,
  })

  return NextResponse.json({ ...data, entrada })
}
