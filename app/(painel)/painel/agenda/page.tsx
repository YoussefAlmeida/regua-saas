import { headers, cookies } from 'next/headers'
import { criarClienteAutenticado } from '@/lib/supabase/server'
import { COOKIE_SESSION } from '@/lib/auth'
import AgendaClient, { type Agendamento } from './agenda-client'

export default async function AgendaPage() {
  const h = await headers()
  const barbearia_id = h.get('x-barbearia-id')!
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_SESSION)!.value
  const db = criarClienteAutenticado(token)

  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })

  const [{ data: profissionais }, { data: servicos }, { data: agendamentosHoje }] = await Promise.all([
    db
      .from('profissionais')
      .select('id, nome, foto_url')
      .eq('barbearia_id', barbearia_id)
      .eq('ativo', true)
      .order('nome'),
    db
      .from('servicos')
      .select('id, nome, preco, duracao_min, cor')
      .eq('barbearia_id', barbearia_id)
      .eq('ativo', true)
      .order('nome'),
    db
      .from('agendamentos')
      .select(`
        id, inicio, fim, status, valor_servico, observacao,
        profissional:profissionais!profissional_id(id, nome),
        cliente:usuarios!cliente_id(nome, whatsapp),
        servico:servicos!servico_id(nome, duracao_min, cor)
      `)
      .eq('barbearia_id', barbearia_id)
      .gte('inicio', `${hoje}T03:00:00.000Z`)
      .lt('inicio', `${hoje}T27:00:00.000Z`)
      .order('inicio'),
  ])

  return (
    <AgendaClient
      profissionaisIniciais={profissionais ?? []}
      servicosIniciais={servicos ?? []}
      agendamentosIniciais={(agendamentosHoje as unknown) as Agendamento[] ?? []}
      dataInicial={hoje}
    />
  )
}
