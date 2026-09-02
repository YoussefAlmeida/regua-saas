// Dia 5 — Job de lembrete: roda a cada 15 min via Vercel Cron / pg_cron
// Busca agendamentos com início entre 1h45 e 2h a partir de agora,
// status = confirmado e lembrete_cliente_enviado = false — dispara e marca.
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  // Valida que a chamada vem do Vercel Cron (header Authorization)
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // TODO (Dia 5): implementar lógica de lembrete
  return NextResponse.json({ ok: true, lembretes_enviados: 0 })
}
