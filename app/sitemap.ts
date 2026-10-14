import type { MetadataRoute } from 'next'
import { criarClienteServico } from '@/lib/supabase/server'
import { urlDoSiteFixa } from '@/lib/site-url'

export const revalidate = 3600

/* Landing, páginas legais e o link de agendamento de cada barbearia ativa */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = urlDoSiteFixa()
  // Sem banco configurado (build local) sai só com as páginas fixas
  const { data } = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? await criarClienteServico()
      .from('barbearias').select('slug, atualizado_em').in('status', ['trial', 'ativo']).limit(5000)
    : { data: [] as { slug: string; atualizado_em: string | null }[] }

  return [
    { url: site, changeFrequency: 'weekly', priority: 1 },
    { url: `${site}/cadastro-barbearia`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${site}/termos`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${site}/privacidade`, changeFrequency: 'yearly', priority: 0.2 },
    ...(data ?? []).map(b => ({
      url: `${site}/${b.slug}`,
      lastModified: b.atualizado_em ? new Date(b.atualizado_em) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ]
}
