import { headers, cookies } from 'next/headers'
import { criarClienteAutenticado } from '@/lib/supabase/server'
import { COOKIE_SESSION } from '@/lib/auth'
import HojeClient from './hoje-client'

export default async function HojePage() {
  const h = await headers()
  const barbearia_id = h.get('x-barbearia-id')!
  const souBarbeiro = h.get('x-papel') === 'barbeiro'
  const meuProfissionalId = h.get('x-profissional-id') ?? ''
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_SESSION)!.value
  const db = criarClienteAutenticado(token)

  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
  const [y, m, d] = hoje.split('-').map(Number)
  const inicio_gte = new Date(Date.UTC(y, m - 1, d, 3, 0, 0)).toISOString()
  const inicio_lt  = new Date(Date.UTC(y, m - 1, d + 1, 3, 0, 0)).toISOString()

  let qHoje = db
    .from('agendamentos')
    .select(`
      id, inicio, fim, status, valor_servico, observacao,
      profissional:profissionais!profissional_id(id, nome),
      cliente:usuarios!cliente_id(nome, whatsapp),
      servico:servicos!servico_id(nome, duracao_min, cor)
    `)
    .eq('barbearia_id', barbearia_id)
    .gte('inicio', inicio_gte)
    .lt('inicio', inicio_lt)
    .order('inicio')
  // Barbeiro vê só a própria agenda e o próprio número (seção 6.1.1)
  if (souBarbeiro) qHoje = qHoje.eq('profissional_id', meuProfissionalId)
  const { data: agendamentos } = await qHoje

  // Atendimentos que já passaram e ninguém marcou (últimos 7 dias, antes de hoje)
  const seteDiasAtras = new Date(Date.UTC(y, m - 1, d - 7, 3, 0, 0)).toISOString()
  let qEsq = db
    .from('agendamentos')
    .select(`
      id, inicio, fim, status, valor_servico, observacao,
      profissional:profissionais!profissional_id(id, nome),
      cliente:usuarios!cliente_id(nome, whatsapp),
      servico:servicos!servico_id(nome, duracao_min, cor)
    `)
    .eq('barbearia_id', barbearia_id)
    .in('status', ['agendado', 'confirmado'])
    .gte('inicio', seteDiasAtras)
    .lt('inicio', inicio_gte)
    .order('inicio')
  if (souBarbeiro) qEsq = qEsq.eq('profissional_id', meuProfissionalId)
  const { data: esquecidos } = await qEsq

  const { data: movHoje } = souBarbeiro
    ? { data: [] }
    : await db
        .from('movimentacoes')
        .select('id, tipo, descricao, valor, origem')
        .eq('barbearia_id', barbearia_id)
        .eq('data', hoje)

  // Primeiro acesso do barbeiro: lembra de completar perfil e horário
  const pendencias: { href: string; texto: string }[] = []
  if (souBarbeiro && meuProfissionalId) {
    const [{ data: prof }, { count: nHorarios }] = await Promise.all([
      db.from('profissionais').select('foto_url, especialidade').eq('id', meuProfissionalId).maybeSingle(),
      db.from('horarios_trabalho').select('id', { count: 'exact', head: true }).eq('profissional_id', meuProfissionalId),
    ])
    if (!prof?.foto_url || !prof?.especialidade) pendencias.push({ href: '/painel/mais/perfil', texto: 'Coloca sua foto e especialidade — o cliente escolhe por elas' })
    if (!nHorarios) pendencias.push({ href: '/painel/mais/horarios', texto: 'Confere seus dias e horário de almoço' })
  }
  if (!souBarbeiro) {
    const [{ count: nServicos }, { count: nProfs }] = await Promise.all([
      db.from('servicos').select('id', { count: 'exact', head: true }).eq('barbearia_id', barbearia_id).eq('ativo', true),
      db.from('profissionais').select('id', { count: 'exact', head: true }).eq('barbearia_id', barbearia_id).eq('ativo', true),
    ])
    if (!nServicos || !nProfs) {
      pendencias.push({ href: '/painel/comecar', texto: 'Termina de configurar: falta ' + (!nProfs ? 'quem corta' : 'cadastrar os serviços') + ' pra liberar o link de agendamento' })
    }
  }

  return (
    <HojeClient
      pendencias={pendencias}
      agendamentosIniciais={(agendamentos ?? []) as never[]}
      esquecidosIniciais={(esquecidos ?? []) as never[]}
      movimentacoesHoje={movHoje ?? []}
      data={hoje}
      souBarbeiro={souBarbeiro}
    />
  )
}
