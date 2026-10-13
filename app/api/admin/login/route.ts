import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_ADMIN, criarTokenAdmin, opcoesCookieAdmin, senhaAdminConfere, registrarAcaoAdmin } from '@/lib/admin'
import { ipDa, segundosBloqueado, registrarFalha, limparFalhas, textoEspera } from '@/lib/limite-login'

export async function POST(req: NextRequest) {
  const ip = ipDa(req)
  const espera = await segundosBloqueado(['id:__admin__', `ip:${ip}`])
  if (espera > 0) {
    return NextResponse.json({ erro: `Muitas tentativas. Espera ${textoEspera(espera)}.` }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const senha = typeof body?.senha === 'string' ? body.senha : ''

  if (!senhaAdminConfere(senha)) {
    await registrarFalha('__admin__', ip)
    return NextResponse.json({ erro: 'Senha incorreta' }, { status: 401 })
  }
  await limparFalhas('__admin__')
  await registrarAcaoAdmin(req, 'login', null)

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_ADMIN, await criarTokenAdmin(), opcoesCookieAdmin)
  return res
}
