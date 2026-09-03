import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { criarClienteServico } from '@/lib/supabase/server'
import { verificarSenha, criarToken, COOKIE_SESSION } from '@/lib/auth'

const SchemaDono = z.object({
  tipo: z.literal('dono'),
  email: z.string().email(),
  senha: z.string().min(1),
})

const SchemaBarbeiro = z.object({
  tipo: z.union([z.literal('barbeiro'), z.literal('cliente')]),
  whatsapp: z.string().min(10),
  senha: z.string().min(1),
})

const Schema = z.union([SchemaDono, SchemaBarbeiro])

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parse = Schema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
  }

  const db = criarClienteServico()
  const d = parse.data

  let query = db
    .from('usuarios')
    .select('id, senha_hash, papel, barbearia_id, status, ativo')

  if (d.tipo === 'dono') {
    query = query.eq('email', d.email).eq('papel', 'dono')
  } else {
    // WhatsApp: normaliza removendo caracteres não numéricos
    const waNorm = d.whatsapp.replace(/\D/g, '')
    query = query.eq('whatsapp', waNorm).in('papel', ['barbeiro', 'cliente'])
  }

  const { data: usuario } = await query.maybeSingle()

  if (!usuario) {
    return NextResponse.json({ erro: 'Credenciais inválidas' }, { status: 401 })
  }
  if (!usuario.ativo) {
    return NextResponse.json({ erro: 'Conta desativada' }, { status: 403 })
  }
  if (usuario.status === 'pendente') {
    return NextResponse.json({ erro: 'Conta aguardando aprovação do dono' }, { status: 403 })
  }

  const senhaOk = await verificarSenha(
    d.tipo === 'dono' ? d.senha : d.senha,
    usuario.senha_hash,
  )
  if (!senhaOk) {
    return NextResponse.json({ erro: 'Credenciais inválidas' }, { status: 401 })
  }

  // Busca profissional_id se for barbeiro
  let profissional_id: string | undefined
  if (usuario.papel === 'barbeiro') {
    const { data: prof } = await db
      .from('profissionais')
      .select('id')
      .eq('usuario_id', usuario.id)
      .eq('ativo', true)
      .maybeSingle()
    profissional_id = prof?.id
  }

  // Atualiza ultimo_acesso
  await db.from('usuarios').update({ ultimo_acesso: new Date().toISOString() }).eq('id', usuario.id)

  const token = await criarToken({
    usuario_id: usuario.id,
    papel: usuario.papel as 'dono' | 'barbeiro' | 'cliente',
    barbearia_id: usuario.barbearia_id,
    profissional_id,
  })

  const res = NextResponse.json({ ok: true, papel: usuario.papel }, { status: 200 })
  res.cookies.set(COOKIE_SESSION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
