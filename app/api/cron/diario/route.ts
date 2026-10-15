import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'
import { enviarTexto, textoFimTrial } from '@/lib/whatsapp'
import { registrarErro } from '@/lib/erros'
import { cronAutorizado } from '@/lib/segredo'
import { todasAsLinhas } from '@/lib/paginar'
import { situacaoPlano, CARENCIA_DIAS } from '@/lib/planos'

/* ================================================================
   Cron diário (06h na Bahia) — seções 6.1 Módulo 4 e 6.1.3
   1. Lança as despesas fixas que já venceram no mês e ainda não saíram
      (se o cron falhou num dia, o próximo recupera)
   2. Trial vencido → modo somente leitura
   3. Lembrete de fim de trial 3 dias antes
   4. Aviso de vencimento do plano pago (3 dias antes e 1 dia depois)
   5. Limpeza de dados antigos (LGPD)
   ================================================================ */

function hojeNaBahia(): { iso: string; dia: number; inicioMes: string } {
  // Bahia = UTC-3 fixo, sem horário de verão
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const iso = agora.toISOString().slice(0, 10)
  return { iso, dia: agora.getUTCDate(), inicioMes: `${iso.slice(0, 7)}-01` }
}

async function lancarDespesasFixas(db: ReturnType<typeof criarClienteServico>) {
  const hoje = hojeNaBahia()

  // Tudo que vence até hoje neste mês (não só hoje): dia perdido não some
  const { data: despesas, error } = await todasAsLinhas((de, ate) => db
    .from('despesas_fixas')
    .select('id, barbearia_id, descricao, valor, categoria_id, dia_vencimento, criado_em, barbearia:barbearias!barbearia_id(status, plano, trial_fim, plano_ciclo_fim)')
    .eq('ativa', true)
    .lte('dia_vencimento', hoje.dia)
    .order('id').range(de, ate))

  if (error || !despesas) return { lancadas: 0, erro: !!error }
  if (!despesas.length) return { lancadas: 0, erro: false }

  // O que já saiu este mês, numa consulta só
  const { data: jaLancadas } = await todasAsLinhas((de, ate) => db
    .from('movimentacoes')
    .select('id, recorrente_id')
    .not('recorrente_id', 'is', null)
    .gte('data', hoje.inicioMes)
    .order('id').range(de, ate))
  const feitas = new Set((jaLancadas ?? []).map(m => m.recorrente_id))

  // criado_por é obrigatório: o lançamento automático fica no nome do dono
  const { data: donos } = await todasAsLinhas((de, ate) => db.from('usuarios').select('id, barbearia_id')
    .eq('papel', 'dono').order('id').range(de, ate))
  const donoDe = new Map((donos ?? []).map(u => [u.barbearia_id, u.id]))

  let lancadas = 0
  for (const d of despesas) {
    if (feitas.has(d.id)) continue
    const barbearia = Array.isArray(d.barbearia) ? d.barbearia[0] : d.barbearia
    if (!barbearia) continue
    const p = situacaoPlano(barbearia)
    if (p.somenteLeitura || !p.recursos.despesasFixas) continue
    const dono = donoDe.get(d.barbearia_id)
    if (!dono) continue

    // Lança na data do vencimento (não na de hoje) pra o mês fechar certo
    const data = `${hoje.inicioMes.slice(0, 8)}${String(d.dia_vencimento).padStart(2, '0')}`
    // Cadastrada depois do vencimento deste mês: começa a lançar no mês que vem
    if (new Date(d.criado_em).toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' }) > data) continue
    const { error: errIns } = await db.from('movimentacoes').insert({
      barbearia_id: d.barbearia_id,
      tipo: 'saida',
      descricao: d.descricao,
      valor: d.valor,
      data,
      categoria_id: d.categoria_id,
      origem: 'automatica',
      recorrente_id: d.id,
      criado_por: dono,
    })
    // 23505 = o banco já tem esta despesa no mês (cron rodou duas vezes ao mesmo tempo)
    if (!errIns) lancadas++
    else if (errIns.code !== '23505') await registrarErro('cron: despesa fixa', errIns, { barbearia_id: d.barbearia_id, usuario_id: null, detalhe: { despesa: d.descricao } })
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

/* Plano pago: lembra 3 dias antes de vencer e no dia seguinte ao vencimento
   (janela de 24h: roda uma vez por dia, então avisa uma vez só) */
async function avisarVencimento(db: ReturnType<typeof criarClienteServico>) {
  const agora = Date.now(), DIA = 86_400_000
  const janela = (de: number) => ({ gte: new Date(agora + de * DIA).toISOString(), lt: new Date(agora + (de + 1) * DIA).toISOString() })
  let avisos = 0
  for (const [de, texto] of [
    [2, (n: string) => `RÉGUA: o plano da ${n} vence em 3 dias. Pra não parar a agenda, é só pagar a próxima mensalidade. Qualquer dúvida, responde aqui.`],
    [-2, (n: string) => `RÉGUA: o pagamento do plano da ${n} venceu ontem. Você tem ${CARENCIA_DIAS - 1} dias de carência antes da agenda ficar só leitura. Fala com a gente pra pagar.`],
  ] as const) {
    const j = janela(de)
    const { data } = await db.from('barbearias').select('nome, telefone')
      .eq('status', 'ativo').gte('plano_ciclo_fim', j.gte).lt('plano_ciclo_fim', j.lt)
    for (const b of data ?? []) {
      if (b.telefone && await enviarTexto(b.telefone, texto(b.nome))) avisos++
    }
  }
  return avisos
}

/* LGPD — não guardar mais que o necessário (prazos na Política de Privacidade) */
async function limparDadosAntigos(db: ReturnType<typeof criarClienteServico>) {
  const dias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
  const r = await Promise.all([
    db.from('tentativas_login').delete().lt('atualizado_em', dias(30)).select('chave'),
    db.from('erros_sistema').delete().lt('criado_em', dias(365)).select('id'),
    // Registro de ações fica (é o histórico do dono), mas o IP some depois de 6 meses
    db.from('auditoria').update({ ip: null }).lt('criado_em', dias(180)).not('ip', 'is', null).select('id'),
    db.from('admin_log').update({ ip: null }).lt('criado_em', dias(180)).not('ip', 'is', null).select('id'),
  ])
  return r.reduce((t, x) => t + (x.data?.length ?? 0), 0)
}

export async function GET(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const db = criarClienteServico()

  const despesas = await lancarDespesasFixas(db)
  const trials_vencidos = await vencerTrials(db)
  const avisos_trial = await avisarFimTrial(db)
  const avisos_vencimento = await avisarVencimento(db)
  const dados_limpos = await limparDadosAntigos(db)

  return NextResponse.json({
    ok: !despesas.erro,
    despesas_lancadas: despesas.lancadas,
    trials_vencidos,
    avisos_trial,
    avisos_vencimento,
    dados_limpos,
  })
}
