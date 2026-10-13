import { headers, cookies } from 'next/headers'
import { criarClienteAutenticado } from '@/lib/supabase/server'
import { COOKIE_SESSION } from '@/lib/auth'
import HojeClient from './hoje-client'

export default async function HojePage() {
  const h = await headers()
  const barbearia_id = h.get('x-barbearia-id')!
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_SESSION)!.value
  const db = criarClienteAutenticado(token)

  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
  const [y, m, d] = hoje.split('-').map(Number)
  const inicio_gte = new Date(Date.UTC(y, m - 1, d, 3, 0, 0)).toISOString()
  const inicio_lt  = new Date(Date.UTC(y, m - 1, d + 1, 3, 0, 0)).toISOString()

  const { data: agendamentos } = await db
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

  // Atendimentos que já passaram e ninguém marcou (últimos 7 dias, antes de hoje)
  const seteDiasAtras = new Date(Date.UTC(y, m - 1, d - 7, 3, 0, 0)).toISOString()
  const { data: esquecidos } = await db
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

  const { data: movHoje } = await db
    .from('movimentacoes')
    .select('id, tipo, descricao, valor, origem')
    .eq('barbearia_id', barbearia_id)
    .eq('data', hoje)

  return (
    <HojeClient
      agendamentosIniciais={(agendamentos ?? []) as never[]}
      esquecidosIniciais={(esquecidos ?? []) as never[]}
      movimentacoesHoje={movHoje ?? []}
      data={hoje}
    />
  )
}
