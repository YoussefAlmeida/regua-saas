import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { criarClienteAutenticado } from '@/lib/supabase/server'
import { COOKIE_SESSION } from '@/lib/auth'
import ConfiguracoesClient from './configuracoes-client'

export default async function ConfiguracoesPage() {
  const h = await headers()
  const papel = h.get('x-papel')
  if (papel !== 'dono') redirect('/painel/mais')

  const barbearia_id = h.get('x-barbearia-id')!
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_SESSION)!.value
  const db = criarClienteAutenticado(token)

  const { data: barbearia } = await db
    .from('barbearias')
    .select('id, nome, slug, telefone, endereco, instagram, horario_funcionamento, dias_fechados')
    .eq('id', barbearia_id)
    .single()

  return <ConfiguracoesClient barbearia={barbearia ?? null} />
}
