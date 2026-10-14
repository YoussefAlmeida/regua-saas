import { cache } from 'react'
import { criarClienteServico } from '@/lib/supabase/server'

/** Dados que a página pública mostra — sem passar pela própria API (evita depender de URL do site) */
export const carregarBarbeariaPublica = cache(async (slug: string) => {
  const db = criarClienteServico()
  const { data: barbearia } = await db
    .from('barbearias')
    .select('id, nome, slug, telefone, endereco, instagram, logo_url, status, plano, trial_fim, plano_ciclo_fim')
    .eq('slug', slug)
    .maybeSingle()

  if (!barbearia || barbearia.status === 'cancelado') return null

  const [{ data: profissionais }, { data: servicos }] = await Promise.all([
    db.from('profissionais')
      .select('id, nome, foto_url, especialidade')
      .eq('barbearia_id', barbearia.id)
      .eq('ativo', true)
      .order('nome'),
    db.from('servicos')
      .select('id, nome, preco, duracao_min, cor')
      .eq('barbearia_id', barbearia.id)
      .eq('ativo', true)
      .order('preco'),
  ])

  return { barbearia, profissionais: profissionais ?? [], servicos: servicos ?? [] }
})
