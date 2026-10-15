import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { SignJWT } from 'jose'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { falhaInterna } from '@/lib/erros'
import { segredoBase } from '@/lib/sessao-chave'

const getSecret = () => new TextEncoder().encode(segredoBase())

export async function GET() {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const db = criarClienteServico()
  const { data, error } = await db
    .from('usuarios')
    .select('id, nome, whatsapp, status, ativo, criado_em, profissionais(id, foto_url, especialidade, ativo)')
    .eq('barbearia_id', sessao.barbearia_id)
    .eq('papel', 'barbeiro')
    .order('criado_em', { ascending: false })

  if (error) return falhaInterna('painel/equipe', error, 'Erro ao buscar equipe')
  return NextResponse.json(data)
}

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
