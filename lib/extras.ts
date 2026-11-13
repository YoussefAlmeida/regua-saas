import type { SupabaseClient } from '@supabase/supabase-js'

/* ================================================================
   Colunas do "app completo" (migração 20261114000000), lidas à parte.
   Se a atualização do banco ainda não rodou, cada leitura devolve
   vazio em vez de derrubar a tela: o recurso só fica desligado.
   ================================================================ */

export interface ExtraServico { foto_url: string | null; descricao: string | null }
export async function extrasDosServicos(db: SupabaseClient, barbearia_id: string): Promise<Map<string, ExtraServico>> {
  const { data } = await db.from('servicos').select('id, foto_url, descricao').eq('barbearia_id', barbearia_id)
  return new Map(((data ?? []) as unknown as ({ id: string } & ExtraServico)[]).map(s => [s.id, { foto_url: s.foto_url, descricao: s.descricao }]))
}

export interface ExtraProfissional { comissao_pct: number | null; meta_mensal: number | null }
export async function extrasDosProfissionais(db: SupabaseClient, barbearia_id: string): Promise<{ mapa: Map<string, ExtraProfissional>; liberado: boolean }> {
  const { data, error } = await db.from('profissionais').select('id, comissao_pct, meta_mensal').eq('barbearia_id', barbearia_id)
  const linhas = (data ?? []) as unknown as { id: string; comissao_pct: number | string | null; meta_mensal: number | string | null }[]
  return {
    liberado: !error,
    mapa: new Map(linhas.map(p => [p.id, {
      comissao_pct: p.comissao_pct === null ? null : Number(p.comissao_pct),
      meta_mensal: p.meta_mensal === null ? null : Number(p.meta_mensal),
    }])),
  }
}

/** Junta "iniciado_em" (atendimento em andamento) numa lista de agendamentos */
export async function comInicio<T extends { id: string }>(db: SupabaseClient, ags: T[]): Promise<(T & { iniciado_em: string | null })[]> {
  if (!ags.length) return []
  const { data } = await db.from('agendamentos').select('id, iniciado_em').in('id', ags.map(a => a.id))
  const mapa = new Map(((data ?? []) as unknown as { id: string; iniciado_em: string | null }[]).map(a => [a.id, a.iniciado_em]))
  return ags.map(a => ({ ...a, iniciado_em: mapa.get(a.id) ?? null }))
}

/** 42703 = a coluna ainda não existe no banco */
export const semColuna = (e: { code?: string } | null | undefined) => e?.code === '42703'
export const AVISO_ATUALIZACAO = 'Esse recurso ainda não foi liberado nesta conta. Fala com o suporte do RÉGUA.'
