// Dia 5 — Webhook WhatsApp Cloud API (verificação e recebimento de mensagens)
import { NextRequest, NextResponse } from "next/server"

// Verificação do endpoint pela Meta (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mode      = searchParams.get("hub.mode")
  const token     = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse("Forbidden", { status: 403 })
}

// Recebimento de eventos (POST)
export async function POST() {
  return NextResponse.json({ received: true })
}
