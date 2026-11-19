import { ImageResponse } from 'next/og'

export const alt = 'CUBO — agenda e caixa da barbearia, sem app pra baixar'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/* Imagem que aparece quando o link do site é compartilhado (WhatsApp, Instagram…) */
export default function Imagem() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#0B0D10', color: '#F4F5F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          <svg width="150" height="150" viewBox="0 0 64 64" fill="none" stroke="#A3FF3E" strokeWidth="3" strokeLinejoin="round">
            <path d="M32 4 56 18v28L32 60 8 46V18z" />
            <path d="M8 18 32 32 56 18M32 32v28" />
            <path strokeWidth="2.4" d="M32 11 44 18 32 25 20 18z" />
            <path strokeWidth="2.4" d="M14 28.5 26 35.5v14L14 42.5z" />
            <path strokeWidth="2.4" d="M38 35.5 50 28.5v14L38 49.5z" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 132, fontWeight: 800, letterSpacing: 8, lineHeight: 1 }}>CUBO</div>
            <div style={{ fontSize: 26, letterSpacing: 10, color: '#9BA1A8', marginTop: 10 }}>GESTÃO PARA BARBEARIAS</div>
          </div>
        </div>
        <div style={{ width: 120, height: 8, background: '#A3FF3E', borderRadius: 4, margin: '44px 0 36px' }} />
        <div style={{ display: 'flex', fontSize: 54, fontWeight: 700, lineHeight: 1.15 }}>Organize, gerencie e faça sua barbearia crescer.</div>
        <div style={{ fontSize: 30, marginTop: 22, color: '#9BA1A8' }}>Seu cliente marca pelo link, sem baixar app. Agenda e caixa no celular. 14 dias grátis.</div>
      </div>
    ),
    size,
  )
}
