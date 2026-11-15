import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { criarClienteAutenticado } from '@/lib/supabase/usuario'
import ClientesClient from './clientes-client'
import { todasAsLinhas } from '@/lib/paginar'

export default async function ClientesPage() {
  const h = await headers()
  const papel = h.get('x-papel')
  if (papel !== 'dono') redirect('/painel/mais')

  const barbearia_id = h.get('x-barbearia-id')!
  const db = await criarClienteAutenticado()

  const { data: clientes } = await todasAsLinhas((de, ate) => db
    .from('usuarios')
    .select(`
      id, nome, whatsapp, criado_em,
      agendamentos:agendamentos!cliente_id(id, inicio, status)
    `)
    .eq('barbearia_id', barbearia_id)
    .eq('papel', 'cliente')
    .eq('ativo', true)
    .order('criado_em', { ascending: false })
    .order('id')
    .range(de, ate))

  return <ClientesClient clientesIniciais={clientes ?? []} />
}
