/* Envio de e-mail (opcional). Funciona quando RESEND_API_KEY e
   EMAIL_REMETENTE estão cadastrados na Vercel; sem eles, devolve false
   e o sistema mostra o caminho manual. */
export function emailConfigurado(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE)
}

export async function enviarEmail(para: string, assunto: string, texto: string): Promise<boolean> {
  if (!emailConfigurado()) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_REMETENTE, to: [para], subject: assunto, text: texto }),
    })
    if (!res.ok) console.error('[email]', res.status, await res.text().catch(() => ''))
    return res.ok
  } catch (e) {
    console.error('[email]', e)
    return false
  }
}
