import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { timingSafeEqual, createHash } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'

/* ================================================================
   Painel admin do RÉGUA (só o dono do SaaS)
   - Senha = variável ADMIN_TOKEN
   - Cookie guarda um token assinado (não a senha), vale 8h
   ================================================================ */

export const COOKIE_ADMIN = 'regua-admin'
const DURACAO_S = 60 * 60 * 8

const segredo = () => new TextEncoder().encode(`${process.env.SUPABASE_JWT_SECRET}:admin`)

/** Compara a senha sem vazar tempo de resposta */
export function senhaAdminConfere(senha: string): boolean {
  const esperado = process.env.ADMIN_TOKEN
  if (!esperado) return false
  const a = createHash('sha256').update(senha).digest()
  const b = createHash('sha256').update(esperado).digest()
  return timingSafeEqual(a, b)
}

export async function criarTokenAdmin(): Promise<string> {
  return new SignJWT({ tipo: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_S}s`)
    .sign(segredo())
}

export const opcoesCookieAdmin = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: DURACAO_S,
  path: '/',
}

export async function adminLogado(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_ADMIN)?.value
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, segredo())
    return payload.tipo === 'admin'
  } catch {
    return false
  }
}

export { PLANOS_ADMIN, type PlanoPago } from '@/lib/admin-planos'

export const STATUS_ADMIN: Record<string, { rotulo: string; cor: string }> = {
  trial:     { rotulo: 'Teste grátis', cor: 'text-amber border-amber/40 bg-amber/10' },
  ativo:     { rotulo: 'Pagando',      cor: 'text-entrada border-entrada/40 bg-entrada/10' },
  leitura:   { rotulo: 'Só leitura',   cor: 'text-info border-info/40 bg-info/10' },
  cancelado: { rotulo: 'Cancelada',    cor: 'text-saida border-saida/40 bg-saida/10' },
}

export async function registrarAcaoAdmin(
  req: NextRequest,
  acao: string,
  barbearia: { id: string; nome: string } | null,
  detalhe?: unknown,
): Promise<void> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const { error } = await criarClienteServico().from('admin_log').insert({
    barbearia_id: barbearia?.id ?? null,
    barbearia_nome: barbearia?.nome ?? null,
    acao,
    detalhe: detalhe ?? null,
    ip,
  })
  if (error) console.error('[admin_log]', error.message)
}
