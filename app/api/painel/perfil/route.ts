import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'

/* Perfil do próprio barbeiro: nome e especialidade (seção 6.1.1 —
   "editar o próprio nome/foto: liberar pro barbeiro") */

const SchemaPatch = z.object({
  nome: z.string().trim().min(2).max(80),
  especialidade: z.string().trim().max(80).nullable(),
})

export async function PATCH(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'barbeiro' || !sessao.profissional_id) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const parse = SchemaPatch.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Confere o nome (mínimo 2 letras)' }, { status: 400 })

  const db = criarClienteServico()
  const { nome, especialidade } = parse.data
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    db.from('profissionais').update({ nome, especialidade: especialidade || null }).eq('id', sessao.profissional_id),
    db.from('usuarios').update({ nome, atualizado_em: new Date().toISOString() }).eq('id', sessao.usuario_id),
  ])
  if (e1 || e2) return NextResponse.json({ erro: 'Erro ao salvar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
