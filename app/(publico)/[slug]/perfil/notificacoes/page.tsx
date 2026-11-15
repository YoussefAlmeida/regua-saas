import type { Metadata } from 'next'
import { carregarPerfilLogado } from '@/lib/perfil-cliente'
import { whatsappConfigurado } from '@/lib/whatsapp'
import NotificacoesCliente from './notificacoes-cliente'

export const metadata: Metadata = { title: 'Notificações', robots: { index: false } }

export default async function NotificacoesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { barbearia, tema, cliente } = await carregarPerfilLogado(slug)
  return (
    <div style={tema}>
      <NotificacoesCliente slug={barbearia.slug} iniciais={cliente.avisos} liberado={cliente.liberado} envioAtivo={whatsappConfigurado()} />
    </div>
  )
}
