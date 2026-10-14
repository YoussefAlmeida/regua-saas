import { SignJWT, jwtVerify } from 'jose'
import { createHash } from 'node:crypto'
import { criarClienteServico } from '@/lib/supabase/server'

/* ================================================================
   Link de nova senha — seção 6.1 Módulo 1 (recuperação de senha)
   - Token assinado com o id do usuário e uma "digital" da senha
     atual: depois que a senha muda, o link para de valer (uso único)
   - Validade: 1h quando pedido pelo próprio usuário, 24h quando o
     dono/admin gera pra mandar no WhatsApp
   ================================================================ */

const segredo = () => new TextEncoder().encode(`${process.env.SUPABASE_JWT_SECRET}:nova-senha`)
const digital = (senhaHash: string) => createHash('sha256').update(senhaHash).digest('hex').slice(0, 24)

export async function gerarTokenNovaSenha(usuario_id: string, validadeHoras: number): Promise<string | null> {
  const { data } = await criarClienteServico().from('usuarios').select('senha_hash').eq('id', usuario_id).maybeSingle()
  if (!data) return null
  return new SignJWT({ tipo: 'nova-senha', fp: digital(data.senha_hash) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(usuario_id)
    .setIssuedAt()
    .setExpirationTime(`${validadeHoras}h`)
    .sign(segredo())
}

export interface UsuarioRecuperacao {
  id: string
  nome: string
  papel: 'dono' | 'barbeiro' | 'cliente'
  barbearia_id: string
  ativo: boolean
  status: string
  slug: string | null
}

/** Confere o token; devolve o usuário ou o motivo de não valer */
export async function validarTokenNovaSenha(token: string): Promise<{ usuario: UsuarioRecuperacao } | { erro: string }> {
  let sub: string, fp: unknown
  try {
    const { payload } = await jwtVerify(token, segredo())
    if (payload.tipo !== 'nova-senha' || !payload.sub) throw new Error()
    sub = payload.sub
    fp = payload.fp
  } catch {
    return { erro: 'Esse link expirou ou não é válido. Peça um novo.' }
  }

  const { data } = await criarClienteServico()
    .from('usuarios')
    .select('id, nome, papel, barbearia_id, ativo, status, senha_hash, barbearia:barbearias!barbearia_id(slug)')
    .eq('id', sub)
    .maybeSingle()
  if (!data) return { erro: 'Esse link não é mais válido. Peça um novo.' }
  if (fp !== digital(data.senha_hash)) return { erro: 'Esse link já foi usado. Se precisar, peça um novo.' }
  if (!data.ativo) return { erro: 'Essa conta está desativada.' }

  const b = Array.isArray(data.barbearia) ? data.barbearia[0] : data.barbearia
  return {
    usuario: {
      id: data.id,
      nome: data.nome,
      papel: data.papel,
      barbearia_id: data.barbearia_id,
      ativo: data.ativo,
      status: data.status,
      slug: (b as { slug?: string } | null)?.slug ?? null,
    },
  }
}

export function textoLinkNovaSenha(nome: string, link: string, horas: number): string {
  return `Oi, ${nome.split(' ')[0]}! Pra criar uma senha nova no RÉGUA, toca aqui (vale ${horas}h):\n${link}`
}
