import type { Metadata } from 'next'
import { criarClienteServico } from '@/lib/supabase/server'
import { carregarPerfilLogado } from '@/lib/perfil-cliente'
import { extrasDosServicos } from '@/lib/extras'
import { minhasAvaliacoes } from '@/lib/avaliacoes'
import MeusAgendamentos, { type MeuAgendamento } from './meus-agendamentos'

export const metadata: Metadata = { title: 'Meus agendamentos', robots: { index: false } }

export default async function AgendamentosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { barbearia, tema, cliente } = await carregarPerfilLogado(slug)
  const db = criarClienteServico()
  const [{ data: ags }, fotos, avaliacoes] = await Promise.all([
    db.from('agendamentos')
      .select(`
        id, inicio, fim, status, valor_servico, cancelado_por, servico_id, profissional_id,
        profissional:profissionais!profissional_id(nome),
        servico:servicos!servico_id(nome, duracao_min)
      `)
      .eq('cliente_id', cliente.id)
      .eq('barbearia_id', barbearia.id)
      .order('inicio', { ascending: false })
      .limit(100),
    extrasDosServicos(db, barbearia.id),
    minhasAvaliacoes(db, cliente.id),
  ])
  const lista = ((ags ?? []) as unknown as MeuAgendamento[]).map(a => ({ ...a, foto: (a.servico_id && fotos.get(a.servico_id)?.foto_url) || null }))

  return (
    <div style={tema}>
      <MeusAgendamentos
        barbearia={{ nome: barbearia.nome, slug: barbearia.slug, telefone: barbearia.telefone, endereco: barbearia.endereco }}
        agendamentosIniciais={lista}
        notasIniciais={avaliacoes.notas}
        podeAvaliar={avaliacoes.liberado}
      />
    </div>
  )
}
