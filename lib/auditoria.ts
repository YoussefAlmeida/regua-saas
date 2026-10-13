import type { NextRequest } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'

/* ================================================================
   Log de auditoria — "quem lançou, quem apagou, quem mudou valor"
   Nunca derruba a ação principal: se falhar, só loga no servidor.
   ================================================================ */

export interface EventoAuditoria {
  barbearia_id: string
  usuario_id: string
  acao: string                 // ex.: 'criar', 'apagar', 'status:concluido'
  tabela: string
  registro_id?: string | null
  antes?: unknown
  depois?: unknown
  req?: NextRequest
}

export async function registrarAuditoria(e: EventoAuditoria): Promise<void> {
  try {
    const ip = e.req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const { error } = await criarClienteServico().from('auditoria').insert({
      barbearia_id: e.barbearia_id,
      usuario_id: e.usuario_id,
      acao: e.acao,
      tabela: e.tabela,
      registro_id: e.registro_id ?? null,
      valor_antes: e.antes ?? null,
      valor_depois: e.depois ?? null,
      ip,
    })
    if (error) console.error('[auditoria]', error.message)
  } catch (err) {
    console.error('[auditoria]', err)
  }
}
