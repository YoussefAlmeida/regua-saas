import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarTokenConvite } from '@/lib/convite'

export async function POST(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const token = await criarTokenConvite(sessao.barbearia_id)

  const base = req.nextUrl.origin
  return NextResponse.json({ link: `${base}/convite/${token}` })
}
