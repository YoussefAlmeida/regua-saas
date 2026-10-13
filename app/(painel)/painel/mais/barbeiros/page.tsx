import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { criarClienteAutenticado } from '@/lib/supabase/server'
import { COOKIE_SESSION } from '@/lib/auth'
import BarbeirosClient from './barbeiros-client'

export default async function BarbeirosPage() {
  const h = await headers()
  const papel = h.get('x-papel')
  if (papel !== 'dono') redirect('/painel/mais')

  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_SESSION)!.value
  const db = criarClienteAutenticado(token)

  const { data: barbeiros } = await db
    .from('usuarios')
    .select('id, nome, whatsapp, status, ativo, criado_em, profissionais(id)')
    .eq('papel', 'barbeiro')
    .order('criado_em', { ascending: false })

  return <BarbeirosClient barbeirosIniciais={barbeiros ?? []} />
}
