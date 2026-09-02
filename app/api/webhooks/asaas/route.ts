// Dia 5 — Webhook Asaas: cobrança recorrente do SaaS
import { NextRequest, NextResponse } from "next/server"

export async function POST(_req: NextRequest) {
  // TODO (Dia 5): validar ASAAS_WEBHOOK_SECRET e processar eventos
  return NextResponse.json({ received: true })
}
