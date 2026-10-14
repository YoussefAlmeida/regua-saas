import { NextResponse } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'
import { getSessao } from '@/lib/auth'

/* ================================================================
   Registro de erros — cada erro inesperado vai pra tabela
   erros_sistema e aparece na pasta da barbearia no admin.
   Nunca derruba a resposta: se o registro falhar, só loga.
   ================================================================ */

interface ErroLike { code?: string; message?: string; status?: number }

export interface ContextoErro {
  barbearia_id?: string | null
  usuario_id?: string | null
  detalhe?: unknown
}

export async function registrarErro(onde: string, erro: unknown, ctx: ContextoErro = {}): Promise<void> {
  const e = (erro ?? {}) as ErroLike
  const mensagem = erro instanceof Error ? erro.message : e.message ?? (typeof erro === 'string' ? erro : null)
  const codigo = e.code ?? (e.status ? String(e.status) : null)
  console.error(`[erro] ${onde}:`, codigo, mensagem)

  try {
    // Sem barbearia informada, tenta descobrir pela sessão de quem estava usando
    let { barbearia_id, usuario_id } = ctx
    if (barbearia_id === undefined || usuario_id === undefined) {
      const s = await getSessao().catch(() => null)
      barbearia_id ??= s?.barbearia_id ?? null
      usuario_id ??= s?.usuario_id ?? null
    }
    await criarClienteServico().from('erros_sistema').insert({
      barbearia_id: barbearia_id ?? null,
      usuario_id: usuario_id ?? null,
      onde,
      codigo,
      mensagem: mensagem?.slice(0, 500) ?? null,
      detalhe: ctx.detalhe ?? null,
    })
  } catch (falha) {
    console.error('[erro] não deu pra registrar:', falha)
  }
}

/** Registra o erro e devolve a resposta 500 com a mensagem pro usuário */
export async function falhaInterna(onde: string, erro: unknown, mensagem: string, ctx: ContextoErro = {}): Promise<NextResponse> {
  await registrarErro(onde, erro, ctx)
  return NextResponse.json({ erro: mensagem }, { status: 500 })
}
