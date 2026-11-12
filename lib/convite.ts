import { SignJWT, jwtVerify } from 'jose'
import { chaveDerivada, segredoBase } from '@/lib/sessao-chave'

/* Link de convite do barbeiro (vale 7 dias). Assinado com chave PRÓPRIA:
   antes usava o segredo do Supabase direto, o mesmo que assina o token do banco. */
const chave = () => chaveDerivada('convite')

export async function criarTokenConvite(barbearia_id: string): Promise<string> {
  return new SignJWT({ barbearia_id, tipo: 'convite' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(chave())
}

/** Devolve a barbearia do convite, ou null se o link não vale */
export async function lerTokenConvite(token: string): Promise<string | null> {
  // Segunda tentativa: convites emitidos antes desta mudança (expiram sozinhos em 7 dias).
  // TODO remover a chave antiga depois de 2026-11-20.
  for (const k of [chave(), new TextEncoder().encode(segredoBase())]) {
    try {
      const { payload } = await jwtVerify(token, k, { algorithms: ['HS256'] })
      if (payload.tipo === 'convite' && typeof payload.barbearia_id === 'string') return payload.barbearia_id
    } catch { /* tenta a próxima */ }
  }
  return null
}
