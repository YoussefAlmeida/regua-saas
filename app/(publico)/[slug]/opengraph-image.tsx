import { ImageResponse } from 'next/og'
import { carregarBarbeariaPublica } from '@/lib/barbearia-publica'

export const alt = 'Agende seu horário'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/* Link da barbearia compartilhado no WhatsApp/Instagram já aparece com o nome dela */
export default async function Imagem({ params }: { params: Promise<{ slug: string }> }) {
  const dados = await carregarBarbeariaPublica((await params).slug)
  const nome = dados?.barbearia.nome ?? 'Barbearia'
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#0B0B0C', color: '#F2F1ED' }}>
        <div style={{ fontSize: 34, color: '#A1A1A8', letterSpacing: 6 }}>AGENDE SEU HORÁRIO</div>
        <div style={{ fontSize: nome.length > 22 ? 88 : 112, fontWeight: 800, color: '#E8B04B', lineHeight: 1.05, marginTop: 16 }}>{nome}</div>
        <div style={{ width: 220, height: 10, background: '#E8B04B', borderRadius: 5, margin: '36px 0' }} />
        <div style={{ fontSize: 36 }}>Escolha o serviço, o barbeiro e o horário em 1 minuto. Sem baixar app.</div>
        {dados?.barbearia.endereco ? <div style={{ fontSize: 28, color: '#A1A1A8', marginTop: 20 }}>{dados.barbearia.endereco}</div> : null}
      </div>
    ),
    size,
  )
}
