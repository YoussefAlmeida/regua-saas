import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'
import { segredoConfere } from '@/lib/segredo'
import { registrarErro } from '@/lib/erros'
import { pagamentoConfirmado } from '@/lib/mudanca-plano'
import type { PlanoPagoId } from '@/lib/planos'

/* ================================================================
   Webhook do Asaas
   - Fechado por padrão: sem ASAAS_WEBHOOK_SECRET configurado, recusa tudo
   - Pagamento confirmado segue a MESMA regra do "Registrar pagamento"
     do admin (lib/mudanca-plano)
   - Idempotente: o mesmo pagamento (CONFIRMED + RECEIVED) conta uma vez
   ================================================================ */

const PLANO_MAP: Record<string, PlanoPagoId> = {
  CADEIRA:   'cadeira',
  BARBEARIA: 'barbearia',
  REDE:      'rede',
}

export async function POST(req: NextRequest) {
  if (!segredoConfere(req.headers.get('asaas-access-token'), process.env.ASAAS_WEBHOOK_SECRET)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.event) return NextResponse.json({ received: true })

  const db = criarClienteServico()
  const { event, payment, subscription } = body

  // Identifica barbearia pelo externalReference (barbearia_id)
  const barbearia_id: string | undefined = payment?.externalReference ?? subscription?.externalReference
  if (!barbearia_id || !/^[0-9a-f-]{36}$/.test(barbearia_id)) return NextResponse.json({ received: true })

  const { data: b } = await db.from('barbearias')
    .select('id, nome, plano, status, plano_ciclo_fim, plano_agendado').eq('id', barbearia_id).maybeSingle()
  if (!b) return NextResponse.json({ received: true })

  switch (event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED': {
      const pagamentoId: string | undefined = payment?.id
      if (pagamentoId) {
        const { count } = await db.from('admin_log').select('id', { count: 'exact', head: true })
          .eq('acao', 'pagamento_asaas').eq('barbearia_id', b.id).contains('detalhe', { pagamento: pagamentoId })
        if (count) break   // já contado
      }
      const texto = `${subscription?.description ?? ''} ${payment?.description ?? ''}`.toUpperCase()
      const plano = Object.entries(PLANO_MAP).find(([k]) => texto.includes(k))?.[1]
      if (!plano) {
        await registrarErro('webhook asaas: plano não reconhecido', texto || 'sem descrição', { barbearia_id: b.id, detalhe: { pagamento: pagamentoId } })
        break
      }
      const mudanca = await pagamentoConfirmado(b, plano)
      await db.from('barbearias').update({ ...mudanca, atualizado_em: new Date().toISOString() }).eq('id', b.id)
      await db.from('admin_log').insert({
        barbearia_id: b.id, barbearia_nome: b.nome, acao: 'pagamento_asaas',
        detalhe: { pagamento: pagamentoId ?? null, plano, valor: payment?.value ?? null },
      })
      break
    }
    case 'PAYMENT_OVERDUE':
      await db.from('barbearias').update({ status: 'leitura' }).eq('id', b.id)
      break
    case 'SUBSCRIPTION_DELETED':
    case 'PAYMENT_DELETED':
      await db.from('barbearias').update({ status: 'cancelado' }).eq('id', b.id)
      break
  }

  return NextResponse.json({ received: true })
}
