import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarTokenConvite } from '@/lib/convite'
import { bloquearNoSolo } from '@/lib/plano-servidor'

export async function POST(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }
  const solo = await bloquearNoSolo(sessao.barbearia_id)
  if (solo) return solo

  const token = await criarTokenConvite(sessao.barbearia_id)

  const base = req.nextUrl.origin
  return NextResponse.json({ link: `${base}/convite/${token}` })
}
