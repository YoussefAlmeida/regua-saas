import { createClient } from '@supabase/supabase-js'

/** Service role — bypassa RLS; NUNCA expor no cliente */
export function criarClienteServico() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// Cliente com as regras de acesso do usuário: lib/supabase/usuario.ts
