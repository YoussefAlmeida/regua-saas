import { criarClienteServico } from '@/lib/supabase/server'
import { tirarDaAgenda } from '@/lib/agenda-saida'
import { registrarAuditoria } from '@/lib/auditoria'
import { PLANOS, type PlanoPagoId } from '@/lib/planos'

/* ================================================================
   Mudança pra um plano menor — vale no fim do mês já pago.
   1. Dono escolhe o plano e quem fica na agenda (agendado)
   2. No dia, o cron troca o plano, tira da agenda quem não ficou
      (cancela os horários dele) e guarda a lista de clientes
      pra o dono avisar (aviso_mudanca)
   3. Até lá, o dono pode cancelar a mudança
   ================================================================ */

export interface MudancaAgendada {
  para: PlanoPagoId
  em: string
  manter: string[]   // ids de usuário que continuam na agenda
}

export interface AvisoMudanca {
  de: string
  para: string
  em: string
  saiu: string[]
  cancelados: unknown[]
}

export const UM_MES = (de: Date) => {
  const d = new Date(de)
  d.setUTCMonth(d.getUTCMonth() + 1)
  return d
}

/** Aplica a mudança agendada de uma barbearia (cron ou na hora, se não há mês pago) */
export async function aplicarMudanca(barbearia_id: string): Promise<{ ok: boolean; cancelados: number }> {
  const db = criarClienteServico()
  const { data: b } = await db.from('barbearias')
    .select('id, plano, status, plano_agendado, plano_agendado_manter')
    .eq('id', barbearia_id).maybeSingle()
  if (!b?.plano_agendado) return { ok: false, cancelados: 0 }

  const para = b.plano_agendado as PlanoPagoId
  const manter = new Set<string>(Array.isArray(b.plano_agendado_manter) ? b.plano_agendado_manter : [])
  const max = PLANOS[para].maxProfissionais

  // Quem sai: está na agenda e não foi escolhido. Se a escolha ficou velha
  // (alguém novo entrou), quem não cabe fica pro dono escolher no painel.
  const { data: profs } = await db.from('profissionais')
    .select('id, nome, usuario_id').eq('barbearia_id', barbearia_id).eq('ativo', true)
  const sair = max === null ? [] : (profs ?? []).filter(p => !manter.has(p.usuario_id))

  const cancelados: unknown[] = []
  for (const p of sair) cancelados.push(...await tirarDaAgenda(p.id))

  const aviso: AvisoMudanca = {
    de: PLANOS[b.plano as PlanoPagoId]?.nome ?? b.plano,
    para: PLANOS[para].nome,
    em: new Date().toISOString(),
    saiu: sair.map(p => p.nome),
    cancelados,
  }

  await db.from('barbearias').update({
    plano: para,
    plano_agendado: null,
    plano_agendado_em: null,
    plano_agendado_manter: null,
    aviso_mudanca: aviso,
    atualizado_em: new Date().toISOString(),
  }).eq('id', barbearia_id)

  const { data: dono } = await db.from('usuarios').select('id')
    .eq('barbearia_id', barbearia_id).eq('papel', 'dono').limit(1).maybeSingle()
  if (dono) {
    await registrarAuditoria({
      barbearia_id, usuario_id: dono.id,
      acao: 'aplicar_mudanca_plano', tabela: 'barbearias', registro_id: barbearia_id,
      antes: { plano: b.plano },
      depois: { para, saiu: aviso.saiu, agendamentos_cancelados: cancelados.length },
    })
  }
  return { ok: true, cancelados: cancelados.length }
}
