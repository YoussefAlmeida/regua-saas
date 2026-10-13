import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { carregarBarbeariaPublica } from '@/lib/barbearia-publica'
import MeusAgendamentos, { type MeuAgendamento } from './meus-agendamentos'

interface Props { params: Promise<{ slug: string }> }

export const metadata: Metadata = { title: 'Meus horários' }

export default async function MeusAgendamentosPage({ params }: Props) {
  const { slug } = await params
  const dados = await carregarBarbeariaPublica(slug)
  if (!dados) notFound()

  const sessao = await getSessao()
  const logado = sessao?.papel === 'cliente' && sessao.barbearia_id === dados.barbearia.id

  let nome: string | null = null
  let agendamentos: MeuAgendamento[] = []
  if (logado) {
    const db = criarClienteServico()
    const [{ data: u }, { data: ags }] = await Promise.all([
      db.from('usuarios').select('nome').eq('id', sessao.usuario_id).maybeSingle(),
      db.from('agendamentos')
        .select(`
          id, inicio, fim, status, valor_servico, cancelado_por,
          profissional:profissionais!profissional_id(nome),
          servico:servicos!servico_id(nome, duracao_min)
        `)
        .eq('cliente_id', sessao.usuario_id)
        .eq('barbearia_id', dados.barbearia.id)
        .order('inicio', { ascending: false })
        .limit(100),
    ])
    nome = u?.nome ?? null
    agendamentos = (ags ?? []) as unknown as MeuAgendamento[]
  }

  return (
    <MeusAgendamentos
      barbearia={{ nome: dados.barbearia.nome, slug: dados.barbearia.slug, telefone: dados.barbearia.telefone }}
      nome={logado ? nome : null}
      agendamentosIniciais={agendamentos}
    />
  )
}
