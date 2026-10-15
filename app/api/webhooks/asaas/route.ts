import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'
import { segredoConfere } from '@/lib/segredo'
import { registrarErro } from '@/lib/erros'
import { pagamentoConfirmado } from '@/lib/mudanca-plano'
import { planoPeloValor } from '@/lib/planos'

/* ================================================================
   Webhook do Asaas
   - Fechado por padrão: sem ASAAS_WEBHOOK_SECRET configurado, recusa tudo
   - Pagamento confirmado segue a MESMA regra do "Registrar pagamento"
     do admin (lib/mudanca-plano)
   - Idempotente: o pagamento entra em pagamentos_asaas (chave primária)
     ANTES de aplicar; CONFIRMED + RECEIVED ou reenvio contam uma vez
   - O plano sai do VALOR pago, não do texto da descrição
   - Atraso não corta nada: o vencimento (plano_ciclo_fim) + 5 dias de
     carência decidem, igual promete a FAQ e os Termos
   - Apagar uma cobrança ou a assinatura não cancela a conta: o mês pago
     vale até o fim; sem pagamento novo, entra a carência e depois só leitura
   - Estorno e chargeback ficam registrados pro admin decidir
   - Erro ao gravar responde 500 pro Asaas tentar de novo
   ================================================================ */

const ok = () => NextResponse.json({ received: true })
const falhou = () => NextResponse.json({ erro: 'tente de novo' }, { status: 500 })

const ESTORNO = new Set([
  'PAYMENT_REFUNDED', 'PAYMENT_PARTIALLY_REFUNDED', 'PAYMENT_REFUND_IN_PROGRESS',
  'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE', 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
])

export async function POST(req: NextRequest) {
  if (!segredoConfere(req.headers.get('asaas-access-token'), process.env.ASAAS_WEBHOOK_SECRET)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.event) return ok()

  const db = criarClienteServico()
  const { event, payment, subscription } = body

  // Identifica barbearia pelo externalReference (barbearia_id)
  const barbearia_id: string | undefined = payment?.externalReference ?? subscription?.externalReference
  if (!barbearia_id || !/^[0-9a-f-]{36}$/.test(barbearia_id)) return ok()

  const { data: b, error: errB } = await db.from('barbearias')
    .select('id, nome, plano, status, plano_ciclo_fim, plano_agendado').eq('id', barbearia_id).maybeSingle()
  if (errB) return falhou()
  if (!b) return ok()

  const pagamentoId: string | null = typeof payment?.id === 'string' ? payment.id : null
  const log = (acao: string, detalhe: Record<string, unknown>) =>
    db.from('admin_log').insert({ barbearia_id: b.id, barbearia_nome: b.nome, acao, detalhe })

  if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
    if (!pagamentoId) return ok()
    const plano = planoPeloValor(payment?.value)
    if (!plano) {
      // Valor que não é de nenhum plano: não adivinha, avisa o admin
      await registrarErro('webhook asaas: valor não bate com nenhum plano', String(payment?.value ?? 'sem valor'), { barbearia_id: b.id, detalhe: { pagamento: pagamentoId } })
      return ok()
    }

    // Trava primeiro: se o pagamento já está aqui, já foi contado
    const { error: errTrava } = await db.from('pagamentos_asaas')
      .insert({ pagamento_id: pagamentoId, barbearia_id: b.id, plano, valor: payment.value })
    if (errTrava) return errTrava.code === '23505' ? ok() : falhou()

    const mudanca = await pagamentoConfirmado(b, plano)
    const { error: errUp } = await db.from('barbearias')
      .update({ ...mudanca, atualizado_em: new Date().toISOString() }).eq('id', b.id)
    if (errUp) {
      // Solta a trava pra o reenvio do Asaas aplicar
      await db.from('pagamentos_asaas').delete().eq('pagamento_id', pagamentoId)
      await registrarErro('webhook asaas: aplicar pagamento', errUp, { barbearia_id: b.id, detalhe: { pagamento: pagamentoId } })
      return falhou()
    }
    await log('pagamento_asaas', { pagamento: pagamentoId, plano, valor: payment.value })
    return ok()
  }

  if (ESTORNO.has(event)) {
    if (pagamentoId) {
      await db.from('pagamentos_asaas').update({ estornado_em: new Date().toISOString() }).eq('pagamento_id', pagamentoId)
    }
    await log('estorno_asaas', { evento: event, pagamento: pagamentoId, valor: payment?.value ?? null })
    await registrarErro('webhook asaas: estorno/chargeback — conferir a barbearia', event, { barbearia_id: b.id, detalhe: { pagamento: pagamentoId } })
    return ok()
  }

  if (event === 'PAYMENT_OVERDUE' || event === 'PAYMENT_DELETED' || event === 'SUBSCRIPTION_DELETED') {
    await log(event === 'PAYMENT_OVERDUE' ? 'pagamento_atrasado_asaas' : event === 'PAYMENT_DELETED' ? 'cobranca_apagada_asaas' : 'assinatura_cancelada_asaas',
      { pagamento: pagamentoId, assinatura: subscription?.id ?? null })
  }

  return ok()
}
