import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { getSessao } from '@/lib/auth'

const getSecret = () => new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!)

export async function POST(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const token = await new SignJWT({ barbearia_id: sessao.barbearia_id, tipo: 'convite' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())

  const base = req.nextUrl.origin
  return NextResponse.json({ link: `${base}/convite/${token}` })
}
