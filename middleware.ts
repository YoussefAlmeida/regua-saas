import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

import { chaveSessao, OPCOES_SESSAO } from '@/lib/sessao-chave'

const COOKIE_SESSION = 'regua-session'

// /admin e /api/admin têm login próprio (lib/admin.ts)
const PUBLICAS = ['/entrar', '/cadastro-barbearia', '/convite', '/_next', '/favicon', '/admin', '/recuperar-senha', '/nova-senha',
  // SEO e compartilhamento (Google, WhatsApp, Instagram não têm login)
  '/sitemap.xml', '/robots.txt', '/opengraph-image', '/icon', '/apple-icon']
// /api/publico: página de agendamento (cliente pode não ter conta ainda)
const API_PUBLICAS = ['/api/auth', '/api/webhooks', '/api/cron', '/api/admin', '/api/publico']
// Cabeçalhos que só o middleware pode definir (nunca confiar no que vem do navegador)
const CABECALHOS_SESSAO = ['x-usuario-id', 'x-papel', 'x-barbearia-id', 'x-profissional-id']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const limpos = new Headers(req.headers)
  for (const h of CABECALHOS_SESSAO) limpos.delete(h)
  const seguir = () => NextResponse.next({ request: { headers: limpos } })

  if (PUBLICAS.some(r => pathname.startsWith(r))) return seguir()
  if (API_PUBLICAS.some(r => pathname.startsWith(r))) return seguir()

  // Landing page de venda
  if (pathname === '/') return seguir()

  // /barbeiro sozinho não é barbearia: é a área do barbeiro
  if (pathname === '/barbeiro') return NextResponse.redirect(new URL('/barbeiro/hoje', req.url))

  // Rotas públicas por slug da barbearia
  // e o Perfil do cliente com as telas internas (cada página checa a sessão sozinha)
  if (!pathname.startsWith('/barbeiro/') && /^\/[a-z0-9-]+(\/meus-agendamentos|\/perfil(\/(dados|agendamentos))?|\/opengraph-image[\w-]*)?$/.test(pathname)) return seguir()

  const token = req.cookies.get(COOKIE_SESSION)?.value
  if (!token) return NextResponse.redirect(new URL('/entrar', req.url))

  try {
    const { payload } = await jwtVerify(token, chaveSessao(), OPCOES_SESSAO)
    // Painel é só da equipe: cliente não lê nem mexe em nada daqui
    // (antes um cliente logado pelo link conseguia listar e alterar agendamentos)
    if (payload.papel === 'cliente' && (pathname.startsWith('/painel') || pathname.startsWith('/barbeiro/') || pathname.startsWith('/api/painel'))) {
      if (pathname.startsWith('/api/')) return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
      return NextResponse.redirect(new URL('/', req.url))
    }
    // Cada um na própria área: /painel é do dono, /barbeiro é do barbeiro
    if (payload.papel === 'barbeiro' && pathname.startsWith('/painel')) {
      const destino = pathname.startsWith('/painel/agenda') ? '/barbeiro/agenda'
        : pathname.startsWith('/painel/mais/horarios') ? '/barbeiro/perfil/horario'
        : pathname.startsWith('/painel/mais/desempenho') ? '/barbeiro/perfil/desempenho'
        : pathname.startsWith('/painel/mais') ? '/barbeiro/perfil'
        : '/barbeiro/hoje'
      return NextResponse.redirect(new URL(destino, req.url))
    }
    if (payload.papel === 'dono' && pathname.startsWith('/barbeiro/')) {
      return NextResponse.redirect(new URL('/painel/inicio', req.url))
    }
    const headers = limpos
    headers.set('x-usuario-id', payload.sub!)
    headers.set('x-papel', payload.papel as string)
    headers.set('x-barbearia-id', payload.barbearia_id as string)
    if (payload.profissional_id) {
      headers.set('x-profissional-id', payload.profissional_id as string)
    }
    return NextResponse.next({ request: { headers } })
  } catch {
    const res = NextResponse.redirect(new URL('/entrar', req.url))
    res.cookies.delete(COOKIE_SESSION)
    return res
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|webp|ico)).*)'],
}
