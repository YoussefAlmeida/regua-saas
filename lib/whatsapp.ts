const WA_URL = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`

function formatarNumero(whatsapp: string): string {
  const digits = whatsapp.replace(/\D/g, '')
  return digits.startsWith('55') ? digits : `55${digits}`
}

async function enviar(body: unknown): Promise<boolean> {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) return false
  try {
    const res = await fetch(WA_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function enviarTexto(whatsapp: string, texto: string): Promise<boolean> {
  return enviar({
    messaging_product: 'whatsapp',
    to: formatarNumero(whatsapp),
    type: 'text',
    text: { body: texto, preview_url: false },
  })
}

export function textoConfirmacaoCliente(opts: {
  clienteNome: string
  barbeariaNome: string
  servicoNome: string
  barbeiiroNome: string
  data: string   // 'YYYY-MM-DD'
  hora: string   // 'HH:MM'
}): string {
  const dataFmt = new Date(opts.data + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })
  return (
    `✂️ *${opts.barbeariaNome}* — Agendamento confirmado!\n\n` +
    `Olá, ${opts.clienteNome}!\n\n` +
    `📋 *${opts.servicoNome}*\n` +
    `💈 ${opts.barbeiiroNome}\n` +
    `📅 ${dataFmt}\n` +
    `🕐 ${opts.hora}\n\n` +
    `Até lá! 👋`
  )
}

export function textoLembreteCliente(opts: {
  clienteNome: string
  barbeariaNome: string
  servicoNome: string
  barbeiiroNome: string
  hora: string
}): string {
  return (
    `⏰ *Lembrete — ${opts.barbeariaNome}*\n\n` +
    `Oi, ${opts.clienteNome}! Seu agendamento é em 2 horas:\n\n` +
    `💈 ${opts.barbeiiroNome} · ${opts.servicoNome}\n` +
    `🕐 ${opts.hora}\n\n` +
    `Até logo! ✂️`
  )
}

export function textoNotificacaoBarbeiro(opts: {
  barbeiiroNome: string
  clienteNome: string
  servicoNome: string
  data: string
  hora: string
}): string {
  const dataFmt = new Date(opts.data + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
  })
  return (
    `📩 *Novo agendamento!*\n\n` +
    `Oi, ${opts.barbeiiroNome}!\n\n` +
    `👤 ${opts.clienteNome}\n` +
    `✂️ ${opts.servicoNome}\n` +
    `📅 ${dataFmt} às ${opts.hora}`
  )
}
