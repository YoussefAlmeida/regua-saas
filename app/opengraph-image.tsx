import { ImageResponse } from 'next/og'

export const alt = 'RÉGUA — agenda e caixa da barbearia, sem app pra baixar'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/* Imagem que aparece quando o link do site é compartilhado (WhatsApp, Instagram…) */
export default function Imagem() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#101010', color: '#FFFFFF' }}>
        <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: 18, color: '#FFFFFF' }}>RÉGUA</div>
        <div style={{ width: 220, height: 10, background: '#F5D900', borderRadius: 5, margin: '16px 0 40px' }} />
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.15 }}>Sua barbearia na régua.</div>
        <div style={{ fontSize: 32, marginTop: 24, color: '#9B9B9B' }}>Agendamento pelo link, agenda da equipe e caixa no celular. 14 dias grátis.</div>
      </div>
    ),
    size,
  )
}
