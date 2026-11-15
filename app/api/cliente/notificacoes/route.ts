import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { semColuna, AVISO_ATUALIZACAO } from '@/lib/extras'
import { CHAVES_AVISO, type Aviso } from '@/lib/cliente-extras'

/* O cliente escolhe quais avisos quer receber. Os envios consultam isto. */
const Schema = z.object(Object.fromEntries(CHAVES_AVISO.map(k => [k, z.boolean()])) as Record<Aviso, z.ZodBoolean>)

export async function PUT(req: NextRequest) {
  const s = await getSessao()
  if (!s || s.papel !== 'cliente') return NextResponse.json({ erro: 'Entre na sua conta' }, { status: 401 })
  const parse = Schema.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
  const { error } = await criarClienteServico().from('usuarios').update({ notificacoes: parse.data }).eq('id', s.usuario_id).eq('barbearia_id', s.barbearia_id)
  if (semColuna(error)) return NextResponse.json({ erro: AVISO_ATUALIZACAO }, { status: 409 })
  if (error) return NextResponse.json({ erro: 'Não deu pra salvar' }, { status: 500 })
  return NextResponse.json({ ok: true, avisos: parse.data })
}
