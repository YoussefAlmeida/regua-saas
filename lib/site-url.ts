import { headers } from 'next/headers'

const limpa = (u: string) => u.replace(/\/+$/, '')

/**
 * Endereço público do site (sem barra no fim).
 * 1. NEXT_PUBLIC_SITE_URL, se configurada
 * 2. domínio de produção que a Vercel informa sozinha
 * 3. só em desenvolvimento: o endereço que o navegador usou nesta requisição
 *    (em produção o Host vem de quem chama; usar ele em link de nova senha
 *    deixaria um atacante mandar o link pro site dele)
 */
export async function urlDoSiteAtual(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return limpa(process.env.NEXT_PUBLIC_SITE_URL)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${limpa(process.env.VERCEL_PROJECT_PRODUCTION_URL)}`
  if (process.env.NODE_ENV === 'production') throw new Error('NEXT_PUBLIC_SITE_URL não configurada')
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

/** Endereço do site sem depender da requisição (metadata, sitemap, imagens) */
export function urlDoSiteFixa(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return limpa(process.env.NEXT_PUBLIC_SITE_URL)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${limpa(process.env.VERCEL_PROJECT_PRODUCTION_URL)}`
  return 'http://localhost:3000'
}
