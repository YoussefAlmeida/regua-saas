import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { exigirSenha } from '@/lib/reautenticar'
import { normalizarWhatsapp } from '@/lib/utils'

/* O cliente atualiza os próprios dados: nome e telefone.
   O telefone é o login, então trocar pede a senha e o número não pode
   estar em uso. Só muda o que veio diferente. */
const Schema = z.object({
  nome: z.string().trim().min(2).max(100).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  senha: z.string().max(200).optional(),
})

export async function PATCH(req: NextRequest) {
  const s = await getSessao()
  if (!s || s.papel !== 'cliente') return NextResponse.json({ erro: 'Entre na sua conta' }, { status: 401 })
  const parse = Schema.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Confere o nome (mínimo 2 letras)' }, { status: 400 })
  const d = parse.data
  const db = criarClienteServico()
  const { data: atual } = await db.from('usuarios').select('nome, whatsapp').eq('id', s.usuario_id).eq('barbearia_id', s.barbearia_id).maybeSingle()
  if (!atual) return NextResponse.json({ erro: 'Conta não encontrada' }, { status: 404 })

  const base: Record<string, unknown> = {}
  if (d.nome !== undefined && d.nome !== atual.nome) base.nome = d.nome

  if (d.whatsapp !== undefined) {
    const novo = normalizarWhatsapp(d.whatsapp)
    if (novo !== atual.whatsapp) {
      if (!/^\d{10,11}$/.test(novo)) return NextResponse.json({ erro: 'Confere o telefone: DDD + número' }, { status: 400 })
      // É o login: confirma que é a própria pessoa
      const negado = await exigirSenha(s, d.senha, req)
      if (negado) return negado
      const { data: emUso } = await db.from('usuarios').select('id').eq('whatsapp', novo).neq('id', s.usuario_id).limit(1)
      if (emUso?.length) return NextResponse.json({ erro: 'Esse telefone já está em outra conta' }, { status: 409 })
      base.whatsapp = novo
    }
  }

  if (Object.keys(base).length) {
    const { error } = await db.from('usuarios').update({ ...base, atualizado_em: new Date().toISOString() }).eq('id', s.usuario_id).eq('barbearia_id', s.barbearia_id)
    if (error?.code === '23505') return NextResponse.json({ erro: 'Esse telefone já está em outra conta' }, { status: 409 })
    if (error) return NextResponse.json({ erro: 'Não deu pra salvar' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, nome: (base.nome as string) ?? atual.nome, whatsapp: (base.whatsapp as string) ?? atual.whatsapp })
}
