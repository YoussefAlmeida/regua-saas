import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { carregarBarbeariaPublica } from '@/lib/barbearia-publica'
import { situacaoPlano } from '@/lib/planos'
import AgendamentoPublico from './agendamento-publico'
import { urlDoSiteFixa } from '@/lib/site-url'
import { temaDaBarbearia } from '@/lib/tema'
import { whatsappConfigurado } from '@/lib/whatsapp'
import { funcionamentoDoDia, paraHora } from '@/lib/disponibilidade'

interface Props {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ servico?: string; profissional?: string }>
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

export default async function AgendamentoPublicoPage({ params, searchParams }: Props) {
  const { slug } = await params
  const pre = (await searchParams) ?? {}
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

  // "Aberta até 19:00" / "Fechada agora", pelo funcionamento que o dono definiu
  const agoraLocal = new Date().toLocaleString('sv-SE', { timeZone: 'America/Bahia' })
  const funcionamento = funcionamentoDoDia({ id: dados.barbearia.id, horario_funcionamento: dados.barbearia.horario_funcionamento, dias_fechados: dados.barbearia.dias_fechados }, agoraLocal.slice(0, 10))
  const minutoAgora = Number(agoraLocal.slice(11, 13)) * 60 + Number(agoraLocal.slice(14, 16))
  const situacao = !funcionamento ? { aberta: false, texto: 'Fechada hoje' }
    : minutoAgora < funcionamento.inicio ? { aberta: false, texto: `Abre às ${paraHora(funcionamento.inicio)}` }
    : minutoAgora >= funcionamento.fim ? { aberta: false, texto: 'Fechada agora' }
    : { aberta: true, texto: `Aberta até ${paraHora(funcionamento.fim)}` }

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
    {/* Cores da barbearia (já ajustadas pra continuar legíveis): valem só dentro desta página */}
    <div style={temaDaBarbearia(dados.barbearia).vars as React.CSSProperties}>
    <AgendamentoPublico
      barbearia={dados.barbearia}
      profissionais={dados.profissionais}
      servicos={dados.servicos}
      clienteLogado={clienteLogado}
      aceitando={aceitando}
      lembreteAtivo={whatsappConfigurado()}
      situacao={situacao}
      pre={{ servico: pre.servico, profissional: pre.profissional }}
    />
    </div>
    </>
  )
}
