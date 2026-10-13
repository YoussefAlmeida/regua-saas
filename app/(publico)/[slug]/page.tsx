import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { carregarBarbeariaPublica } from '@/lib/barbearia-publica'
import AgendamentoPublico from './agendamento-publico'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dados = await carregarBarbeariaPublica((await params).slug)
  if (!dados) return { title: 'Barbearia não encontrada · RÉGUA' }
  return {
    title: `Agendar na ${dados.barbearia.nome}`,
    description: `Marque seu horário na ${dados.barbearia.nome} em menos de 1 minuto. Sem baixar app.`,
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

  const aceitando = dados.barbearia.status !== 'leitura'

  return (
    <AgendamentoPublico
      barbearia={dados.barbearia}
      profissionais={dados.profissionais}
      servicos={dados.servicos}
      clienteLogado={clienteLogado}
      aceitando={aceitando}
    />
  )
}
