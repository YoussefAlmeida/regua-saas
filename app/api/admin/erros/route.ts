import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { criarClienteServico } from '@/lib/supabase/server'
import { adminLogado } from '@/lib/admin'

/* Marca erros como resolvidos (um, vários ou todos de uma barbearia) */
const Schema = z.object({
  ids: z.array(z.string().uuid()).max(200).optional(),
  barbearia_id: z.string().uuid().optional(),
  todos: z.boolean().optional(),
  resolvido: z.boolean().default(true),
}).refine(d => d.ids?.length || d.barbearia_id || d.todos, 'Diga quais erros')

export async function PATCH(req: NextRequest) {
  if (!(await adminLogado())) return NextResponse.json({ erro: 'Entre de novo no admin' }, { status: 401 })
  const parse = Schema.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
  const d = parse.data

  let q = criarClienteServico().from('erros_sistema').update({ resolvido: d.resolvido })
  if (d.ids?.length) q = q.in('id', d.ids)
  else if (d.barbearia_id) q = q.eq('barbearia_id', d.barbearia_id).eq('resolvido', !d.resolvido)
  else q = q.eq('resolvido', !d.resolvido)

  const { error } = await q
  if (error) return NextResponse.json({ erro: 'Não deu pra salvar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
