import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'
import { redirect } from 'next/navigation'
import { getSessao } from '@/lib/auth'
import { segredoBase } from '@/lib/sessao-chave'

/* ================================================================
   Cliente do Supabase com as regras de acesso (RLS) do usuário logado.
   O token do banco é feito aqui no servidor, vale 5 minutos e nunca
   vai pro navegador — o cookie de sessão não abre o banco direto.
   Só pra LEITURA: toda escrita passa pelas rotas da API (service role).
   ================================================================ */
export async function criarClienteAutenticado() {
  const sessao = await getSessao()
  if (!sessao) redirect('/entrar')

  const token = await new SignJWT({ role: 'authenticated', papel: sessao.papel, barbearia_id: sessao.barbearia_id })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(sessao.usuario_id)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(segredoBase()))

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
}
