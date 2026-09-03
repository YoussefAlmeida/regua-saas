import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { criarClienteAutenticado } from '@/lib/supabase/server'
import { COOKIE_SESSION } from '@/lib/auth'
import ServicosClient from './servicos-client'

export default async function ServicosPage() {
  const h = await headers()
  const papel = h.get('x-papel')
  if (papel !== 'dono') redirect('/painel/mais')

  const barbearia_id = h.get('x-barbearia-id')!
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_SESSION)!.value
  const db = criarClienteAutenticado(token)

  const { data: servicos } = await db
    .from('servicos')
    .select('*')
    .order('nome')

  return <ServicosClient servicosIniciais={servicos ?? []} barbearia_id={barbearia_id} />
}
