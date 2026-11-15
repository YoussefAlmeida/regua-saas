import type { Metadata } from 'next'
import { carregarPerfil } from '@/lib/perfil-cliente'
import PerfilCliente from './perfil-cliente'

export const metadata: Metadata = { title: 'Meu perfil', robots: { index: false } }

export default async function PerfilPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { barbearia, tema, cliente } = await carregarPerfil(slug)
  return (
    <div style={tema}>
      <PerfilCliente
        barbearia={{ nome: barbearia.nome, slug: barbearia.slug }}
        cliente={cliente && { nome: cliente.nome, whatsapp: cliente.whatsapp, email: cliente.email, foto: cliente.foto_url, avisosLigados: Object.values(cliente.avisos).some(Boolean) }}
      />
    </div>
  )
}
