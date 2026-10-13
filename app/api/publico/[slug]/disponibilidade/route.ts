import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'
import { horariosLivres } from '@/lib/disponibilidade'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sp = req.nextUrl.searchParams
  const profissional_id = sp.get('profissional_id')
  const servico_id      = sp.get('servico_id')
  const data            = sp.get('data')

  if (!profissional_id || !servico_id || !data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ erro: 'Parâmetros obrigatórios: profissional_id, servico_id, data' }, { status: 400 })
  }

  const db = criarClienteServico()

  const { data: barbearia } = await db
    .from('barbearias')
    .select('id, horario_funcionamento, dias_fechados')
    .eq('slug', slug)
    .single()

  if (!barbearia) return NextResponse.json({ erro: 'Barbearia não encontrada' }, { status: 404 })

  const [{ data: servico }, { data: profissional }] = await Promise.all([
    db.from('servicos').select('duracao_min').eq('id', servico_id).eq('barbearia_id', barbearia.id).eq('ativo', true).maybeSingle(),
    db.from('profissionais').select('id').eq('id', profissional_id).eq('barbearia_id', barbearia.id).eq('ativo', true).maybeSingle(),
  ])

  if (!servico) return NextResponse.json({ erro: 'Serviço não encontrado' }, { status: 404 })
  if (!profissional) return NextResponse.json({ erro: 'Barbeiro não encontrado' }, { status: 404 })

  const slots = await horariosLivres(db, barbearia, profissional_id, data, servico.duracao_min)
  return NextResponse.json({ slots })
}
