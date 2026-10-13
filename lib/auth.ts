import { hash, verify } from '@node-rs/argon2'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { criarClienteServico } from '@/lib/supabase/server'
import type { NextResponse } from 'next/server'

const getSecret = () => new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!)
export const COOKIE_SESSION = 'regua-session'

export interface SessaoUsuario {
  usuario_id: string
  papel: 'dono' | 'barbeiro' | 'cliente'
  barbearia_id: string
  profissional_id?: string
}

export async function hashSenha(senha: string): Promise<string> {
  return hash(senha + process.env.PASSWORD_PEPPER!, {
    algorithm: 2, // argon2id
    memoryCost: 19456,
    timeCost: 3,
    parallelism: 2,
  })
}

export async function verificarSenha(senha: string, hashArmazenado: string): Promise<boolean> {
  return verify(hashArmazenado, senha + process.env.PASSWORD_PEPPER!)
}

export async function criarToken(sessao: SessaoUsuario): Promise<string> {
  return new SignJWT({
    papel: sessao.papel,
    barbearia_id: sessao.barbearia_id,
    ...(sessao.profissional_id ? { profissional_id: sessao.profissional_id } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sessao.usuario_id)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())
}

/** Grava o cookie de sessão na resposta (30 dias, httpOnly) */
export function gravarCookieSessao(res: NextResponse, token: string): void {
  res.cookies.set(COOKIE_SESSION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function verificarToken(token: string): Promise<SessaoUsuario | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return {
      usuario_id: payload.sub!,
      papel: payload.papel as SessaoUsuario['papel'],
      barbearia_id: payload.barbearia_id as string,
      profissional_id: payload.profissional_id as string | undefined,
    }
  } catch {
    return null
  }
}

/**
 * Sessão do usuário logado. Além do token, confere no banco se a conta
 * continua ativa — barbeiro removido perde o acesso na hora, não em 30 dias.
 * (cache: uma consulta por requisição, mesmo chamando várias vezes)
 */
export const getSessao = cache(async (): Promise<SessaoUsuario | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_SESSION)?.value
  if (!token) return null
  const sessao = await verificarToken(token)
  if (!sessao) return null

  const { data } = await criarClienteServico()
    .from('usuarios')
    .select('ativo, status, barbearia_id')
    .eq('id', sessao.usuario_id)
    .maybeSingle()
  if (!data || !data.ativo || data.status !== 'aprovado' || data.barbearia_id !== sessao.barbearia_id) return null

  return sessao
})

/** Endereços do próprio sistema — nenhuma barbearia pode usar como link */
export const SLUGS_RESERVADOS = new Set([
  'admin', 'api', 'painel', 'entrar', 'sair', 'cadastro', 'cadastro-barbearia', 'convite',
  'recuperar-senha', 'planos', 'precos', 'termos', 'privacidade', 'ajuda', 'suporte', 'blog',
  'regua', 'app', 'www', 'login', 'conta', 'minha-conta', '_next', 'favicon', 'static',
])

export function slugify(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}
