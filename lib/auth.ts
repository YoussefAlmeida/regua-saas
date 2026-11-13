import { hash, verify } from '@node-rs/argon2'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { criarClienteServico } from '@/lib/supabase/server'
import type { NextResponse } from 'next/server'
import { chaveSessao, OPCOES_SESSAO } from '@/lib/sessao-chave'
export const COOKIE_SESSION = 'regua-session'

export interface SessaoUsuario {
  usuario_id: string
  papel: 'dono' | 'barbeiro' | 'cliente'
  barbearia_id: string
  profissional_id?: string
  /** Versão da sessão: muda quando a senha muda e derruba os outros aparelhos */
  sv?: number
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
    sv: sessao.sv ?? 0,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sessao.usuario_id)
    .setIssuer(OPCOES_SESSAO.issuer)
    .setAudience(OPCOES_SESSAO.audience)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(chaveSessao())
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
    const { payload } = await jwtVerify(token, chaveSessao(), OPCOES_SESSAO)
    return {
      usuario_id: payload.sub!,
      papel: payload.papel as SessaoUsuario['papel'],
      barbearia_id: payload.barbearia_id as string,
      profissional_id: payload.profissional_id as string | undefined,
      sv: typeof payload.sv === 'number' ? payload.sv : 0,
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

  const db = criarClienteServico()
  let { data, error } = await db
    .from('usuarios')
    .select('ativo, status, barbearia_id, sessao_versao')
    .eq('id', sessao.usuario_id)
    .maybeSingle<{ ativo: boolean; status: string; barbearia_id: string; sessao_versao?: number | null }>()
  // 42703 = a coluna sessao_versao ainda não existe (migração 20261112000000 não rodou):
  // segue sem ela em vez de deslogar todo mundo
  if (error?.code === '42703') {
    ({ data, error } = await db.from('usuarios').select('ativo, status, barbearia_id')
      .eq('id', sessao.usuario_id).maybeSingle())
  }
  if (!data || !data.ativo || data.status !== 'aprovado' || data.barbearia_id !== sessao.barbearia_id) return null
  // Senha trocada depois que este cookie foi emitido: a sessão antiga não vale mais
  if (!sessaoVigente(sessao.sv, data.sessao_versao)) return null

  return sessao
})

/** O cookie só vale se foi emitido na versão atual da sessão do usuário */
export function sessaoVigente(svDoToken: number | undefined, svNoBanco: number | null | undefined): boolean {
  return (svDoToken ?? 0) === (svNoBanco ?? 0)
}

/** Versão atual da sessão (0 se a coluna ainda não existe) */
export async function versaoDaSessao(usuario_id: string): Promise<number> {
  const { data } = await criarClienteServico().from('usuarios')
    .select('sessao_versao').eq('id', usuario_id).maybeSingle<{ sessao_versao: number | null }>()
  return data?.sessao_versao ?? 0
}

/** Troca de senha: invalida todas as sessões abertas e devolve a versão nova */
export async function novaVersaoDaSessao(usuario_id: string): Promise<number> {
  const nova = (await versaoDaSessao(usuario_id)) + 1
  const { error } = await criarClienteServico().from('usuarios').update({ sessao_versao: nova }).eq('id', usuario_id)
  return error ? 0 : nova
}

/** Endereços do próprio sistema — nenhuma barbearia pode usar como link */
export const SLUGS_RESERVADOS = new Set([
  'admin', 'api', 'painel', 'entrar', 'sair', 'cadastro', 'cadastro-barbearia', 'convite',
  'recuperar-senha', 'nova-senha', 'planos', 'precos', 'termos', 'privacidade', 'ajuda', 'suporte', 'blog',
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

/** Regrava o cookie com a agenda própria atual (dono que passou a cortar ou parou) */
export async function renovarSessao(res: NextResponse, sessao: SessaoUsuario): Promise<NextResponse> {
  const { data: prof } = await criarClienteServico()
    .from('profissionais').select('id').eq('usuario_id', sessao.usuario_id).eq('ativo', true).maybeSingle()
  const { profissional_id: _antigo, ...resto } = sessao
  void _antigo
  gravarCookieSessao(res, await criarToken({ ...resto, ...(prof ? { profissional_id: prof.id } : {}) }))  // sv vem da sessão atual
  return res
}
