import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/* Rotas protegidas — exigem sessão válida */
const ROTAS_PAINEL = ["/painel"]
const ROTAS_ADMIN  = ["/admin"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // TODO (Dia 2): verificar token de sessão do cookie e redirecionar pra /entrar
  // se o usuário não estiver autenticado nas rotas protegidas.

  // Por ora, libera tudo — o isolamento real está no RLS do banco.
  return NextResponse.next()
}

export const config = {
  // Executa em todas as rotas exceto assets estáticos e favicon
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
