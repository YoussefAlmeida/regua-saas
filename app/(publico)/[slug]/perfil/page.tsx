import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { carregarBarbeariaPublica } from '@/lib/barbearia-publica'
import { temaDaBarbearia } from '@/lib/tema'
import PerfilCliente from './perfil-cliente'

export const metadata: Metadata = { title: 'Perfil', robots: { index: false } }

export default async function PerfilPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const dados = await carregarBarbeariaPublica(slug)
  if (!dados) notFound()

  // Sem conta nesta barbearia: entra por "Meus horários"
  const sessao = await getSessao()
  if (sessao?.papel !== 'cliente' || sessao.barbearia_id !== dados.barbearia.id) redirect(`/${slug}/meus-agendamentos`)

  const { data: u } = await criarClienteServico().from('usuarios')
    .select('nome, whatsapp').eq('id', sessao.usuario_id).eq('barbearia_id', dados.barbearia.id).maybeSingle()
  if (!u) redirect(`/${slug}/meus-agendamentos`)

  return (
    <div style={temaDaBarbearia(dados.barbearia).vars as React.CSSProperties}>
      <PerfilCliente barbearia={{ nome: dados.barbearia.nome, slug: dados.barbearia.slug }} nomeInicial={u.nome} whatsapp={u.whatsapp ?? ''} />
    </div>
  )
}
