import { headers } from 'next/headers'

const limpa = (u: string) => u.replace(/\/+$/, '')

/**
 * Endereço público do site (sem barra no fim).
 * 1. NEXT_PUBLIC_SITE_URL, se configurada
 * 2. domínio de produção que a Vercel informa sozinha
 * 3. o endereço que o navegador usou nesta requisição
 */
export async function urlDoSiteAtual(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return limpa(process.env.NEXT_PUBLIC_SITE_URL)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${limpa(process.env.VERCEL_PROJECT_PRODUCTION_URL)}`
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
