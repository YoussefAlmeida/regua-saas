import { ImageResponse } from 'next/og'

export const alt = 'RÉGUA — agenda e caixa da barbearia, sem app pra baixar'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/* Imagem que aparece quando o link do site é compartilhado (WhatsApp, Instagram…) */
export default function Imagem() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#0B0B0C', color: '#F2F1ED' }}>
        <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: 12, color: '#E8B04B' }}>RÉGUA</div>
        <div style={{ width: 220, height: 10, background: '#E8B04B', borderRadius: 5, margin: '16px 0 40px' }} />
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.15 }}>Sua barbearia na régua.</div>
        <div style={{ fontSize: 32, marginTop: 24, color: '#A1A1A8' }}>Agendamento pelo link, lembrete no WhatsApp e caixa no celular. 14 dias grátis.</div>
      </div>
    ),
    size,
  )
}
