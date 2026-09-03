import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'

const PLANO_MAP: Record<string, string> = {
  CADEIRA:   'cadeira',
  BARBEARIA: 'barbearia',
  REDE:      'rede',
}

export async function POST(req: NextRequest) {
  const secret = process.env.ASAAS_WEBHOOK_SECRET
  if (secret) {
    const sig = req.headers.get('asaas-access-token')
    if (sig !== secret) return new NextResponse('Forbidden', { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.event) return NextResponse.json({ received: true })

  const db = criarClienteServico()
  const { event, payment, subscription } = body

  // Identifica barbearia pelo externalReference (barbearia_id)
  const barbearia_id = payment?.externalReference ?? subscription?.externalReference

  switch (event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED': {
      if (!barbearia_id) break
      const planoRaw = subscription?.description?.toUpperCase() ?? ''
      const plano = Object.entries(PLANO_MAP).find(([k]) => planoRaw.includes(k))?.[1] ?? 'barbearia'
      await db
        .from('barbearias')
        .update({ status: 'ativo', plano })
        .eq('id', barbearia_id)
      break
    }
    case 'PAYMENT_OVERDUE': {
      if (!barbearia_id) break
      await db
        .from('barbearias')
        .update({ status: 'leitura' })
        .eq('id', barbearia_id)
      break
    }
    case 'SUBSCRIPTION_DELETED':
    case 'PAYMENT_DELETED': {
      if (!barbearia_id) break
      await db
        .from('barbearias')
        .update({ status: 'cancelado' })
        .eq('id', barbearia_id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
