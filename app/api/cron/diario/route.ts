import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'
import { enviarTexto, textoFimTrial } from '@/lib/whatsapp'
import { registrarErro } from '@/lib/erros'
import { situacaoPlano } from '@/lib/planos'
import { aplicarMudanca, UM_MES } from '@/lib/mudanca-plano'

/* ================================================================
   Cron diário (06h na Bahia) — seções 6.1 Módulo 4 e 6.1.3
   1. Lança as despesas fixas que vencem hoje
   2. Trial vencido → modo somente leitura
   3. Lembrete de fim de trial 3 dias antes
   4. Mudança pra plano menor que chegou no dia (fim do mês pago)
      e virada do ciclo das contas ativas
   ================================================================ */

function hojeNaBahia(): { iso: string; dia: number; inicioMes: string } {
  // Bahia = UTC-3 fixo, sem horário de verão
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const iso = agora.toISOString().slice(0, 10)
  return { iso, dia: agora.getUTCDate(), inicioMes: `${iso.slice(0, 7)}-01` }
}

async function lancarDespesasFixas(db: ReturnType<typeof criarClienteServico>) {
  const hoje = hojeNaBahia()

  const { data: despesas, error } = await db
    .from('despesas_fixas')
    .select('id, barbearia_id, descricao, valor, categoria_id, barbearia:barbearias!barbearia_id(status, plano, trial_fim)')
    .eq('ativa', true)
    .eq('dia_vencimento', hoje.dia)

  if (error || !despesas) return { lancadas: 0, erro: !!error }

  let lancadas = 0
  for (const d of despesas) {
    const barbearia = Array.isArray(d.barbearia) ? d.barbearia[0] : d.barbearia
    if (!barbearia) continue
    const p = situacaoPlano(barbearia)
    if (p.somenteLeitura || !p.recursos.despesasFixas) continue

    // Idempotente: não lança duas vezes no mesmo mês se o cron rodar de novo
    const { count } = await db
      .from('movimentacoes')
      .select('id', { count: 'exact', head: true })
      .eq('recorrente_id', d.id)
      .gte('data', hoje.inicioMes)
    if (count) continue

    // criado_por é obrigatório: o lançamento automático fica no nome do dono
    const { data: dono } = await db
      .from('usuarios')
      .select('id')
      .eq('barbearia_id', d.barbearia_id)
      .eq('papel', 'dono')
      .limit(1)
      .maybeSingle()
    if (!dono) continue

    const { error: errIns } = await db.from('movimentacoes').insert({
      barbearia_id: d.barbearia_id,
      tipo: 'saida',
      descricao: d.descricao,
      valor: d.valor,
      data: hoje.iso,
      categoria_id: d.categoria_id,
      origem: 'automatica',
      recorrente_id: d.id,
      criado_por: dono.id,
    })
    if (errIns) await registrarErro('cron: despesa fixa', errIns, { barbearia_id: d.barbearia_id, usuario_id: null, detalhe: { despesa: d.descricao } })
    else lancadas++
  }

  return { lancadas, erro: false }
}

async function vencerTrials(db: ReturnType<typeof criarClienteServico>) {
  const { data } = await db
    .from('barbearias')
    .update({ status: 'leitura' })
    .eq('status', 'trial')
    .lt('trial_fim', new Date().toISOString())
    .select('id')
  return data?.length ?? 0
}

async function avisarFimTrial(db: ReturnType<typeof criarClienteServico>) {
  // Janela de 24h que começa em 2 dias: roda uma vez por dia, então avisa uma vez só
  const agora = Date.now()
  const { data: barbearias } = await db
    .from('barbearias')
    .select('nome, telefone')
    .eq('status', 'trial')
    .gte('trial_fim', new Date(agora + 2 * 86400000).toISOString())
    .lt('trial_fim', new Date(agora + 3 * 86400000).toISOString())

  let avisos = 0
  for (const b of barbearias ?? []) {
    if (!b.telefone) continue
    if (await enviarTexto(b.telefone, textoFimTrial({ barbeariaNome: b.nome, dias: 3 }))) avisos++
  }
  return avisos
}

async function mudancasDePlano(db: ReturnType<typeof criarClienteServico>) {
  const agora = new Date()
  const { data: devidas, error } = await db.from('barbearias')
    .select('id').eq('status', 'ativo')
    .not('plano_agendado', 'is', null).lte('plano_agendado_em', agora.toISOString())
  if (error) return { aplicadas: 0, ciclos: 0, erro: true }

  let aplicadas = 0
  for (const b of devidas ?? []) {
    try {
      if ((await aplicarMudanca(b.id)).ok) aplicadas++
    } catch (e) {
      await registrarErro('cron: mudança de plano', e, { barbearia_id: b.id, usuario_id: null })
    }
  }

  // Mês pago que venceu: abre o próximo (quem não paga, o suporte suspende)
  const { data: vencidos } = await db.from('barbearias')
    .select('id, plano_ciclo_fim').eq('status', 'ativo').lte('plano_ciclo_fim', agora.toISOString())
  let ciclos = 0
  for (const b of vencidos ?? []) {
    let fim = new Date(b.plano_ciclo_fim)
    while (fim <= agora) fim = UM_MES(fim)
    const { error: e } = await db.from('barbearias').update({ plano_ciclo_fim: fim.toISOString() }).eq('id', b.id)
    if (!e) ciclos++
  }
  return { aplicadas, ciclos, erro: false }
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const db = criarClienteServico()

  const despesas = await lancarDespesasFixas(db)
  const trials_vencidos = await vencerTrials(db)
  const avisos_trial = await avisarFimTrial(db)
  // Antes de virar o ciclo, pra mudança que vence hoje não escapar
  const planos = await mudancasDePlano(db)

  return NextResponse.json({
    ok: !despesas.erro && !planos.erro,
    mudancas_plano: planos.aplicadas,
    ciclos_renovados: planos.ciclos,
    despesas_lancadas: despesas.lancadas,
    trials_vencidos,
    avisos_trial,
  })
}
