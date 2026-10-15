import { criarClienteServico } from '@/lib/supabase/server'
import { desligarDaAgenda } from '@/lib/agenda-saida'
import { registrarAuditoria } from '@/lib/auditoria'
import { PLANOS, fimDoCicloAposPagamento, type PlanoPagoId } from '@/lib/planos'

/* ================================================================
   Mudança de plano — só vale quando o pagamento é confirmado.
   Subir: paga o valor cheio do plano novo, vale na hora e o mês
   novo começa no dia do pagamento (não importa o que já foi pago).
   Descer: o dono faz o pedido e escolhe quem fica na agenda; quando
   paga o plano menor, a troca acontece. Quem sai da agenda não perde
   os horários já marcados, só não recebe horário novo.
   ================================================================ */

export interface AvisoMudanca {
  de: string
  para: string
  em: string
  saiu: string[]
}

export interface BarbeariaPagamento {
  id: string
  plano: string
  status: string
  plano_ciclo_fim: string | null
  plano_agendado: string | null
}

/**
 * Pagamento confirmado (admin ou Asaas) — o que muda na barbearia.
 * Mesmo plano em dia (ou na carência): soma 1 mês ao vencimento. Plano
 * diferente (subiu ou desceu): valor cheio, vale na hora e o mês começa hoje.
 * Se era o plano que o dono pediu, tira da agenda quem ele não escolheu.
 */
export async function pagamentoConfirmado(b: BarbeariaPagamento, plano: PlanoPagoId): Promise<Record<string, unknown>> {
  if (b.plano_agendado === plano) await aplicarMudanca(b.id)
  return {
    status: 'ativo', plano,
    plano_agendado: null, plano_agendado_em: null, plano_agendado_manter: null,
    plano_ciclo_fim: fimDoCicloAposPagamento(b, plano).toISOString(),
  }
}

/** Pagamento do plano pedido confirmado: troca e tira da agenda quem não ficou */
export async function aplicarMudanca(barbearia_id: string): Promise<{ ok: boolean; saiu: string[] }> {
  const db = criarClienteServico()
  const { data: b } = await db.from('barbearias')
    .select('id, plano, plano_agendado, plano_agendado_manter')
    .eq('id', barbearia_id).maybeSingle()
  if (!b?.plano_agendado) return { ok: false, saiu: [] }

  const para = b.plano_agendado as PlanoPagoId
  const manter = new Set<string>(Array.isArray(b.plano_agendado_manter) ? b.plano_agendado_manter : [])
  const max = PLANOS[para].maxProfissionais

  // Quem sai: está na agenda e não foi escolhido. Se a escolha ficou velha
  // (alguém entrou depois), quem passar do limite o dono escolhe no painel.
  const { data: profs } = await db.from('profissionais')
    .select('id, nome, usuario_id').eq('barbearia_id', barbearia_id).eq('ativo', true)
  const sair = max === null ? [] : (profs ?? []).filter(p => !manter.has(p.usuario_id))
  for (const p of sair) await desligarDaAgenda(p.id)

  const aviso: AvisoMudanca = {
    de: PLANOS[b.plano as PlanoPagoId]?.nome ?? b.plano,
    para: PLANOS[para].nome,
    em: new Date().toISOString(),
    saiu: sair.map(p => p.nome),
  }

  await db.from('barbearias').update({
    plano: para,
    plano_agendado: null,
    plano_agendado_em: null,
    plano_agendado_manter: null,
    aviso_mudanca: aviso,
  }).eq('id', barbearia_id)

  const { data: dono } = await db.from('usuarios').select('id')
    .eq('barbearia_id', barbearia_id).eq('papel', 'dono').limit(1).maybeSingle()
  if (dono) {
    await registrarAuditoria({
      barbearia_id, usuario_id: dono.id,
      acao: 'aplicar_mudanca_plano', tabela: 'barbearias', registro_id: barbearia_id,
      antes: { plano: b.plano }, depois: { para, saiu: aviso.saiu },
    })
  }
  return { ok: true, saiu: aviso.saiu }
}
