import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { criarClienteAutenticado } from '@/lib/supabase/usuario'
import { urlDoSiteAtual } from '@/lib/site-url'
import ConfiguracoesClient from './configuracoes-client'

export default async function ConfiguracoesPage() {
  const h = await headers()
  const papel = h.get('x-papel')
  if (papel !== 'dono') redirect('/painel/mais')

  const barbearia_id = h.get('x-barbearia-id')!
  const db = await criarClienteAutenticado()

  const { data: barbearia } = await db
    .from('barbearias')
    .select('id, nome, slug, telefone, endereco, instagram, horario_funcionamento, dias_fechados')
    .eq('id', barbearia_id)
    .single()

  return <ConfiguracoesClient barbearia={barbearia ?? null} siteUrl={await urlDoSiteAtual()} />
}
