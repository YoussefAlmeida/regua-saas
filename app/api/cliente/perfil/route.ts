import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'

/* O cliente corrige o próprio nome (o WhatsApp é o login: não muda por aqui) */
export async function PATCH(req: NextRequest) {
  const s = await getSessao()
  if (!s || s.papel !== 'cliente') return NextResponse.json({ erro: 'Entre na sua conta' }, { status: 401 })
  const parse = z.object({ nome: z.string().trim().min(2).max(100) }).safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Confere o nome (mínimo 2 letras)' }, { status: 400 })
  const { error } = await criarClienteServico().from('usuarios')
    .update({ nome: parse.data.nome, atualizado_em: new Date().toISOString() })
    .eq('id', s.usuario_id).eq('barbearia_id', s.barbearia_id)
  if (error) return NextResponse.json({ erro: 'Não deu pra salvar' }, { status: 500 })
  return NextResponse.json({ ok: true, nome: parse.data.nome })
}
