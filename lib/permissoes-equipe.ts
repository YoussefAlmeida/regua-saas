import { cache } from 'react'
import { NextResponse } from 'next/server'
import type { SessaoUsuario } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'

/* ================================================================
   Permissões da equipe — o que o BARBEIRO pode fazer, definido pelo dono.
   Valem pra barbearia toda. O dono sempre pode tudo. Sem nada gravado
   (ou sem a coluna no banco), tudo fica liberado, como sempre foi.
   A checagem é no servidor; a tela só acompanha.
   ================================================================ */

import { PERMISSOES, CHAVES, type Permissao, type PermissoesEquipe } from '@/lib/permissoes-equipe-def'
export { PERMISSOES, CHAVES, type Permissao, type PermissoesEquipe }

export const permissoesDaEquipe = cache(async (barbearia_id: string): Promise<PermissoesEquipe> => {
  const { data } = await criarClienteServico().from('barbearias').select('permissoes').eq('id', barbearia_id).maybeSingle<{ permissoes: Record<string, unknown> | null }>()
  const gravadas = data?.permissoes ?? {}
  return Object.fromEntries(CHAVES.map(k => [k, gravadas[k] !== false])) as PermissoesEquipe
})

export async function pode(sessao: SessaoUsuario, permissao: Permissao): Promise<boolean> {
  if (sessao.papel === 'dono') return true
  if (sessao.papel !== 'barbeiro') return false
  return (await permissoesDaEquipe(sessao.barbearia_id))[permissao]
}

/** 403 com explicação se o barbeiro não tem a permissão; null se pode */
export async function exigir(sessao: SessaoUsuario, permissao: Permissao): Promise<NextResponse | null> {
  if (await pode(sessao, permissao)) return null
  return NextResponse.json({ erro: `O dono da barbearia não liberou "${PERMISSOES[permissao].rotulo.toLowerCase()}" pra equipe. Fala com ele.`, semPermissao: true }, { status: 403 })
}
