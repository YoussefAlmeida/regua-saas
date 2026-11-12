import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { criarClienteAutenticado } from '@/lib/supabase/usuario'
import { urlDoSiteAtual } from '@/lib/site-url'
import ConfiguracoesClient from './configuracoes-client'
import AparenciaBarbearia from '@/components/aparencia-barbearia'
import { criarClienteServico } from '@/lib/supabase/server'

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

  // Identidade visual: colunas novas (migração 20261113000000). Sem elas, a seção avisa.
  const { data: marca, error: errMarca } = await criarClienteServico().from('barbearias')
    .select('logo_url, capa_url, sobre, cor_primaria, cor_secundaria').eq('id', barbearia_id)
    .maybeSingle<{ logo_url: string | null; capa_url: string | null; sobre: string | null; cor_primaria: string | null; cor_secundaria: string | null }>()

  return (
    <>
      <ConfiguracoesClient barbearia={barbearia ?? null} siteUrl={await urlDoSiteAtual()} />
      {barbearia && (
        <AparenciaBarbearia
          liberada={!errMarca}
          marca={{
            nome: barbearia.nome, slug: barbearia.slug,
            logo_url: marca?.logo_url ?? null, capa_url: marca?.capa_url ?? null, sobre: marca?.sobre ?? null,
            cor_primaria: marca?.cor_primaria ?? null, cor_secundaria: marca?.cor_secundaria ?? null,
          }}
        />
      )}
    </>
  )
}
