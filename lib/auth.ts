import { hash, verify } from '@node-rs/argon2'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

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

export async function getSessao(): Promise<SessaoUsuario | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_SESSION)?.value
  if (!token) return null
  return verificarToken(token)
}

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
