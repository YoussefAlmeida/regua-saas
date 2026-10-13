import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

const getSecret = () => new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!)
const COOKIE_SESSION = 'regua-session'

const PUBLICAS = ['/entrar', '/cadastro-barbearia', '/convite', '/_next', '/favicon']
const API_PUBLICAS = ['/api/auth', '/api/webhooks', '/api/cron']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLICAS.some(r => pathname.startsWith(r))) return NextResponse.next()
  if (API_PUBLICAS.some(r => pathname.startsWith(r))) return NextResponse.next()

  // Landing page de venda
  if (pathname === '/') return NextResponse.next()

  // Rotas públicas por slug da barbearia
  const slugMatch = pathname.match(/^\/[a-z0-9-]+$/)
  if (slugMatch) return NextResponse.next()

  const token = req.cookies.get(COOKIE_SESSION)?.value
  if (!token) return NextResponse.redirect(new URL('/entrar', req.url))

  try {
    const { payload } = await jwtVerify(token, getSecret())
    const headers = new Headers(req.headers)
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
