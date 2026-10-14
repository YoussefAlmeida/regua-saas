import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { carregarBarbeariaPublica } from '@/lib/barbearia-publica'
import { situacaoPlano } from '@/lib/planos'
import AgendamentoPublico from './agendamento-publico'
import { urlDoSiteFixa } from '@/lib/site-url'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dados = await carregarBarbeariaPublica((await params).slug)
  if (!dados) return { title: 'Barbearia não encontrada · RÉGUA' }
  const descricao = `Marque seu horário na ${dados.barbearia.nome}${dados.barbearia.endereco ? ` (${dados.barbearia.endereco})` : ''} em menos de 1 minuto. Sem baixar app.`
  return {
    title: `Agendar na ${dados.barbearia.nome}`,
    description: descricao,
    alternates: { canonical: `/${dados.barbearia.slug}` },
    openGraph: { title: `Agende na ${dados.barbearia.nome}`, description: descricao, url: `/${dados.barbearia.slug}` },
  }
}

export default async function AgendamentoPublicoPage({ params }: Props) {
  const { slug } = await params
  const dados = await carregarBarbeariaPublica(slug)
  if (!dados) notFound()

  // Cliente que já entrou antes agenda sem digitar nada de novo
  const sessao = await getSessao()
  let clienteLogado: { nome: string } | null = null
  if (sessao?.papel === 'cliente' && sessao.barbearia_id === dados.barbearia.id) {
    const { data } = await criarClienteServico().from('usuarios').select('nome').eq('id', sessao.usuario_id).maybeSingle()
    if (data) clienteLogado = { nome: data.nome }
  }

  // Teste vencido ou suspensa: a página fica no ar, mas pausa o agendamento
  const aceitando = !situacaoPlano(dados.barbearia).somenteLeitura

  // Dados estruturados: o Google entende que é uma barbearia (SEO local)
  const site = urlDoSiteFixa()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    name: dados.barbearia.nome,
    url: `${site}/${dados.barbearia.slug}`,
    ...(dados.barbearia.telefone ? { telephone: dados.barbearia.telefone } : {}),
    ...(dados.barbearia.endereco ? { address: { '@type': 'PostalAddress', streetAddress: dados.barbearia.endereco, addressCountry: 'BR' } } : {}),
    ...(dados.barbearia.logo_url ? { image: dados.barbearia.logo_url } : {}),
    potentialAction: { '@type': 'ReserveAction', target: `${site}/${dados.barbearia.slug}` },
  }

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <AgendamentoPublico
      barbearia={dados.barbearia}
      profissionais={dados.profissionais}
      servicos={dados.servicos}
      clienteLogado={clienteLogado}
      aceitando={aceitando}
    />
    </>
  )
}
