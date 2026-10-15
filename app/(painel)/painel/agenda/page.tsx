import { headers } from 'next/headers'
import { criarClienteAutenticado } from '@/lib/supabase/usuario'
import { limitesDoDia } from '@/lib/disponibilidade'
import AgendaClient, { type Agendamento } from './agenda-client'

export default async function AgendaPage() {
  const h = await headers()
  const barbearia_id = h.get('x-barbearia-id')!
  const papel = h.get('x-papel')
  const meuProfissionalId = h.get('x-profissional-id')
  const db = await criarClienteAutenticado()

  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })

  let qHoje = db
    .from('agendamentos')
    .select(`
      id, inicio, fim, status, valor_servico, observacao,
      profissional:profissionais!profissional_id(id, nome),
      cliente:usuarios!cliente_id(nome, whatsapp),
      servico:servicos!servico_id(nome, duracao_min, cor)
    `)
    .eq('barbearia_id', barbearia_id)
    .neq('status', 'cancelado')
    .gte('inicio', limitesDoDia(hoje).gte)
    .lt('inicio', limitesDoDia(hoje).lt)
    .order('inicio')
  // Barbeiro recebe só a própria agenda: os clientes dos colegas não chegam ao navegador
  if (papel === 'barbeiro') qHoje = qHoje.eq('profissional_id', meuProfissionalId ?? '00000000-0000-0000-0000-000000000000')

  const [{ data: profissionais }, { data: servicos }, { data: agendamentosHoje }] = await Promise.all([
    db
      .from('profissionais')
      .select('id, nome, foto_url, ativo')
      .eq('barbearia_id', barbearia_id)
      .order('nome'),
    db
      .from('servicos')
      .select('id, nome, preco, duracao_min, cor')
      .eq('barbearia_id', barbearia_id)
      .eq('ativo', true)
      .order('nome'),
    qHoje,
  ])

  // Fora da agenda mas com horário já marcado: continua aparecendo pra atender
  const fora = (profissionais ?? []).filter(p => !p.ativo).map(p => p.id)
  const { data: futuros } = fora.length
    ? await db.from('agendamentos').select('profissional_id')
      .in('profissional_id', fora).in('status', ['agendado', 'confirmado'])
      .gte('inicio', new Date().toISOString()).limit(1000)
    : { data: [] as { profissional_id: string }[] }
  const comHorario = new Set((futuros ?? []).map(a => a.profissional_id))
  const visiveis = (profissionais ?? []).filter(p => p.ativo || comHorario.has(p.id) || p.id === meuProfissionalId)

  return (
    <AgendaClient
      // Barbeiro vê e marca só na própria agenda (seção 6.1.1)
      profissionaisIniciais={visiveis.filter(p => papel !== 'barbeiro' || p.id === meuProfissionalId)}
      servicosIniciais={servicos ?? []}
      agendamentosIniciais={(agendamentosHoje as unknown) as Agendamento[] ?? []}
      dataInicial={hoje}
    />
  )
}
