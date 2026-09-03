import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { criarClienteAutenticado } from '@/lib/supabase/server'
import { COOKIE_SESSION } from '@/lib/auth'
import ClientesClient from './clientes-client'

export default async function ClientesPage() {
  const h = await headers()
  const papel = h.get('x-papel')
  if (papel !== 'dono') redirect('/painel/mais')

  const barbearia_id = h.get('x-barbearia-id')!
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_SESSION)!.value
  const db = criarClienteAutenticado(token)

  const { data: clientes } = await db
    .from('usuarios')
    .select(`
      id, nome, whatsapp, criado_em,
      agendamentos:agendamentos!cliente_id(id, inicio, status)
    `)
    .eq('barbearia_id', barbearia_id)
    .eq('papel', 'cliente')
    .order('criado_em', { ascending: false })

  return <ClientesClient clientesIniciais={clientes ?? []} />
}
