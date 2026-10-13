import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { criarClienteServico } from '@/lib/supabase/server'
import { normalizarWhatsapp } from '@/lib/utils'
import { verificarSenha, criarToken, COOKIE_SESSION } from '@/lib/auth'
import { ipDa, segundosBloqueado, registrarFalha, limparFalhas, textoEspera } from '@/lib/limite-login'

// Hash de referência pra conta inexistente gastar o mesmo tempo que uma real
const HASH_FALSO = '$argon2id$v=19$m=19456,t=3,p=2$/A9DO6ZK8ZpE8QukNIT+fw$9fnwJCkNxs9o77q/ftYVgSfZA6tXM3sUozj0uBTscww'
const ERRO_GENERICO = 'E-mail/WhatsApp ou senha incorretos'

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
  const identificador = d.tipo === 'dono' ? d.email.trim().toLowerCase() : normalizarWhatsapp(d.whatsapp)
  const ip = ipDa(req)

  const espera = await segundosBloqueado([`id:${identificador}`, `ip:${ip}`])
  if (espera > 0) {
    return NextResponse.json(
      { erro: `Muitas tentativas. Espera ${textoEspera(espera)} e tenta de novo.`, espera },
      { status: 429, headers: { 'Retry-After': String(espera) } },
    )
  }

  let query = db
    .from('usuarios')
    .select('id, senha_hash, papel, barbearia_id, status, ativo')

  if (d.tipo === 'dono') {
    query = query.eq('email', identificador).eq('papel', 'dono')
  } else {
    // WhatsApp: normaliza removendo caracteres não numéricos
    query = query.eq('whatsapp', identificador).in('papel', ['barbeiro', 'cliente'])
  }

  const { data: usuario } = await query.maybeSingle()

  // Senha confere antes de qualquer outra mensagem — nunca revela se a conta existe
  const senhaOk = await verificarSenha(d.senha, usuario?.senha_hash ?? HASH_FALSO).catch(() => false)
  if (!usuario || !senhaOk) {
    await registrarFalha(identificador, ip)
    return NextResponse.json({ erro: ERRO_GENERICO }, { status: 401 })
  }
  await limparFalhas(identificador)

  if (!usuario.ativo) {
    return NextResponse.json({ erro: 'Essa conta foi desativada pelo dono da barbearia' }, { status: 403 })
  }
  if (usuario.status === 'pendente') {
    return NextResponse.json({ erro: 'Sua conta está esperando o dono aprovar. Avisa ele!' }, { status: 403 })
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
