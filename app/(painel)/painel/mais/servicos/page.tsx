import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { criarClienteAutenticado } from '@/lib/supabase/usuario'
import ServicosClient from './servicos-client'

export default async function ServicosPage() {
  const h = await headers()
  const papel = h.get('x-papel')
  if (papel !== 'dono') redirect('/painel/mais')

  const barbearia_id = h.get('x-barbearia-id')!
  const db = await criarClienteAutenticado()

  const { data: servicos } = await db
    .from('servicos')
    .select('*')
    .order('nome')

  return <ServicosClient servicosIniciais={servicos ?? []} barbearia_id={barbearia_id} />
}
