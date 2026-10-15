/* ================================================================
   Chave do cookie de sessão — DIFERENTE da chave do Supabase.
   Antes a sessão era assinada com o mesmo segredo do Supabase, então
   o próprio cookie servia de passe direto pro banco. Agora ele só vale
   aqui no app; o acesso ao banco usa um token curto feito no servidor
   (lib/supabase/server.ts). Sem dependências de Node: roda no middleware.
   ================================================================ */

/** Segredo base. Sem a variável, para tudo em vez de assinar com "undefined" (forjável). */
export function segredoBase(): string {
  const s = process.env.SUPABASE_JWT_SECRET
  if (!s) throw new Error('SUPABASE_JWT_SECRET não configurada')
  return s
}

/** Chave própria pra cada uso (sessão, admin, nova senha...), derivada do segredo base */
export const chaveDerivada = (uso: string) => new TextEncoder().encode(`${segredoBase()}:${uso}`)

export const chaveSessao = () => chaveDerivada('sessao')

export const OPCOES_SESSAO = { algorithms: ['HS256'], issuer: 'regua', audience: 'sessao' }
