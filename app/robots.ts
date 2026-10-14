import type { MetadataRoute } from 'next'
import { urlDoSiteFixa } from '@/lib/site-url'

/* Google vê a landing, as páginas legais e os links de agendamento;
   painel, admin e API ficam de fora */
export default function robots(): MetadataRoute.Robots {
  const site = urlDoSiteFixa()
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/painel', '/admin', '/api', '/entrar', '/convite', '/nova-senha', '/recuperar-senha', '/*/meus-agendamentos'],
    }],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  }
}
