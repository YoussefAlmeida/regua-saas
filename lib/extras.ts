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

/** 42703 = a coluna ainda não existe no banco */
export const semColuna = (e: { code?: string } | null | undefined) => e?.code === '42703'
export const AVISO_ATUALIZACAO = 'Esse recurso ainda não foi liberado nesta conta. Fala com o suporte do RÉGUA.'
