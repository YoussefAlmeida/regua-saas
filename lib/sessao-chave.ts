/* ================================================================
   Chave do cookie de sessão — DIFERENTE da chave do Supabase.
   Antes a sessão era assinada com o mesmo segredo do Supabase, então
   o próprio cookie servia de passe direto pro banco. Agora ele só vale
   aqui no app; o acesso ao banco usa um token curto feito no servidor
   (lib/supabase/server.ts). Sem dependências de Node: roda no middleware.
   ================================================================ */
export const chaveSessao = () => new TextEncoder().encode(`${process.env.SUPABASE_JWT_SECRET}:sessao`)

export const OPCOES_SESSAO = { algorithms: ['HS256'], issuer: 'regua', audience: 'sessao' }
