import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { criarClienteServico } from '@/lib/supabase/server'
import { normalizarWhatsapp } from '@/lib/utils'
import { verificarSenha, criarToken, gravarCookieSessao } from '@/lib/auth'
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
  /** Página de uma barbearia: entra na conta de cliente DESSA barbearia */
  slug: z.string().max(80).optional(),
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

  type Conta = {
    id: string; senha_hash: string; papel: string; barbearia_id: string
    status: string; ativo: boolean; senha_definida: boolean | null
    ultimo_acesso: string | null; barbearia: { slug: string } | { slug: string }[] | null
  }
  const CAMPOS = 'id, senha_hash, papel, barbearia_id, status, ativo, senha_definida, ultimo_acesso, barbearia:barbearias!barbearia_id(slug)'

  let candidatas: Conta[] = []
  if (d.tipo === 'dono') {
    const { data } = await db.from('usuarios').select(CAMPOS).eq('email', identificador).eq('papel', 'dono').limit(1)
    candidatas = (data ?? []) as unknown as Conta[]
  } else {
    // Tela "Entrar" = só barbeiro. Cliente entra só pelo link da barbearia (com slug).
    const papel = d.tipo === 'cliente' ? 'cliente' : 'barbeiro'
    const { data } = await db.from('usuarios').select(CAMPOS).eq('whatsapp', identificador).eq('papel', papel)
    candidatas = ((data ?? []) as unknown as Conta[]).filter(c => c.senha_definida !== false)
    if (papel === 'cliente') {
      const slugDe = (c: Conta) => (Array.isArray(c.barbearia) ? c.barbearia[0] : c.barbearia)?.slug
      candidatas = d.slug ? candidatas.filter(c => slugDe(c) === d.slug) : []
    }
    candidatas.sort((a, b) => (b.ultimo_acesso ?? '').localeCompare(a.ultimo_acesso ?? ''))
    candidatas = candidatas.slice(0, 5)
  }

  // Cada barbearia pode ter senha diferente: entra na primeira em que a senha bater
  let usuario: Conta | null = null
  for (const c of candidatas) {
    if (await verificarSenha(d.senha, c.senha_hash).catch(() => false)) { usuario = c; break }
  }
  if (candidatas.length === 0) await verificarSenha(d.senha, HASH_FALSO).catch(() => false)

  // Senha confere antes de qualquer outra mensagem — nunca revela se a conta existe
  if (!usuario) {
    // Cliente tentando pela tela de barbeiro: só avisa se a senha bater com a conta de cliente
    if (d.tipo === 'barbeiro') {
      const { data: clientes } = await db.from('usuarios').select(CAMPOS)
        .eq('whatsapp', identificador).eq('papel', 'cliente').eq('senha_definida', true).limit(5)
      for (const c of (clientes ?? []) as unknown as Conta[]) {
        if (await verificarSenha(d.senha, c.senha_hash).catch(() => false)) {
          const b = Array.isArray(c.barbearia) ? c.barbearia[0] : c.barbearia
          return NextResponse.json({
            erro: 'Essa é uma conta de cliente. Cliente entra pelo link da barbearia, em "Meus horários".',
            linkCliente: b ? `/${b.slug}/meus-agendamentos` : null,
          }, { status: 403 })
        }
      }
    }
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

  // Quem atende tem agenda própria: barbeiro, e também o dono que corta ("Sou eu que corto")
  let profissional_id: string | undefined
  if (usuario.papel === 'barbeiro' || usuario.papel === 'dono') {
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

  // Cliente não tem painel: vai pra "Meus agendamentos" da barbearia dele
  let destino = '/painel/hoje'
  if (usuario.papel === 'cliente') {
    const b = Array.isArray(usuario.barbearia) ? usuario.barbearia[0] : usuario.barbearia
    destino = b ? `/${b.slug}/meus-agendamentos` : '/'
  }

  const res = NextResponse.json({ ok: true, papel: usuario.papel, destino }, { status: 200 })
  gravarCookieSessao(res, token)
  return res
}
