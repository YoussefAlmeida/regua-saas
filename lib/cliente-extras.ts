import type { SupabaseClient } from '@supabase/supabase-js'
import { criarClienteServico } from '@/lib/supabase/server'

/* ================================================================
   Colunas do perfil do cliente (migração 20261116000000), lidas à
   parte: sem a atualização do banco, a tela segue no ar e o recurso
   só fica desligado. Sem preferência gravada, o aviso está ligado.
   ================================================================ */

import { CHAVES_AVISO, type Aviso, type Avisos } from '@/lib/avisos-cliente'
export { AVISOS, CHAVES_AVISO, type Aviso, type Avisos } from '@/lib/avisos-cliente'

const lerAvisos = (bruto: unknown): Avisos => {
  const g = (bruto && typeof bruto === 'object' ? bruto : {}) as Record<string, unknown>
  return Object.fromEntries(CHAVES_AVISO.map(k => [k, g[k] !== false])) as Avisos
}

export interface ExtrasCliente { foto_url: string | null; email: string | null; avisos: Avisos; liberado: boolean }

export async function extrasDoCliente(db: SupabaseClient, usuario_id: string): Promise<ExtrasCliente> {
  const { data, error } = await db.from('usuarios').select('foto_url, email_contato, notificacoes').eq('id', usuario_id)
    .maybeSingle<{ foto_url: string | null; email_contato: string | null; notificacoes: unknown }>()
  return { foto_url: data?.foto_url ?? null, email: data?.email_contato ?? null, avisos: lerAvisos(data?.notificacoes), liberado: !error }
}

/** O cliente quer receber esse tipo de aviso? (sem a coluna no banco: sim, como sempre foi) */
export async function clienteQuer(usuario_id: string, aviso: Aviso): Promise<boolean> {
  const { data } = await criarClienteServico().from('usuarios').select('notificacoes').eq('id', usuario_id).maybeSingle<{ notificacoes: unknown }>()
  return lerAvisos(data?.notificacoes)[aviso]
}
