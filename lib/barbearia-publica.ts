import { cache } from 'react'
import { criarClienteServico } from '@/lib/supabase/server'
import { extrasDosServicos } from '@/lib/extras'

/** Dados que a página pública mostra — sem passar pela própria API (evita depender de URL do site) */
export const carregarBarbeariaPublica = cache(async (slug: string) => {
  const db = criarClienteServico()
  const BASE = 'id, nome, slug, telefone, endereco, instagram, logo_url, status, plano, trial_fim, plano_ciclo_fim, horario_funcionamento, dias_fechados'
  type Linha = {
    id: string; nome: string; slug: string; telefone: string | null; endereco: string | null; instagram: string | null
    logo_url: string | null; status: string; plano: string; trial_fim: string | null; plano_ciclo_fim: string | null
    horario_funcionamento: Record<string, { ativo?: boolean; inicio?: string; fim?: string }> | null; dias_fechados: string[] | null
    capa_url?: string | null; sobre?: string | null; cor_primaria?: string | null; cor_secundaria?: string | null
  }
  let { data: barbearia, error } = await db.from('barbearias')
    .select(`${BASE}, capa_url, sobre, cor_primaria, cor_secundaria`).eq('slug', slug).maybeSingle<Linha>()
  // 42703 = as colunas de identidade visual ainda não existem (migração 20261113000000):
  // a página continua no ar com a identidade padrão
  if (error?.code === '42703') {
    ({ data: barbearia, error } = await db.from('barbearias').select(BASE).eq('slug', slug).maybeSingle<Linha>())
  }

  if (!barbearia || barbearia.status === 'cancelado') return null

  const [{ data: profissionais }, { data: servicos }, extras] = await Promise.all([
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
    extrasDosServicos(db, barbearia.id),
  ])

  // Foto e descrição de cada serviço (quando a atualização do banco já rodou)
  const comExtras = (servicos ?? []).map(sv => ({ ...sv, foto_url: extras.get(sv.id)?.foto_url ?? null, descricao: extras.get(sv.id)?.descricao ?? null }))

  return { barbearia, profissionais: profissionais ?? [], servicos: comExtras }
})
