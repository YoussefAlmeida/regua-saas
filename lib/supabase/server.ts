import { type CookieOptions, createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/** Supabase client para Server Components e Route Handlers */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Server Component — cookies só podem ser definidos em
            // Server Actions ou Route Handlers; o erro é esperado aqui.
          }
        },
      },
    },
  )
}

/** Supabase client com service_role — NUNCA usar no cliente */
export async function createServiceClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* service role não gerencia cookies de auth */ },
      },
    },
  )
}
