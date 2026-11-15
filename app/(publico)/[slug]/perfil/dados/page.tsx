import type { Metadata } from 'next'
import { carregarPerfilLogado } from '@/lib/perfil-cliente'
import DadosCliente from './dados-cliente'

export const metadata: Metadata = { title: 'Meus dados', robots: { index: false } }

export default async function DadosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { barbearia, tema, cliente } = await carregarPerfilLogado(slug)
  return (
    <div style={tema}>
      <DadosCliente slug={barbearia.slug} inicial={{ nome: cliente.nome, whatsapp: cliente.whatsapp, email: cliente.email ?? '', foto: cliente.foto_url }} liberado={cliente.liberado} />
    </div>
  )
}
