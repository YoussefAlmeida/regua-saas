import { NextResponse } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = criarClienteServico()

  const { data: barbearia } = await db
    .from('barbearias')
    .select('id, nome, slug, telefone, endereco, instagram, logo_url, horario_funcionamento, status')
    .eq('slug', slug)
    .maybeSingle()

  if (!barbearia) return NextResponse.json({ erro: 'Barbearia não encontrada' }, { status: 404 })
  if (barbearia.status === 'cancelado') {
    return NextResponse.json({ erro: 'Barbearia inativa' }, { status: 410 })
  }

  const [{ data: profissionais }, { data: servicos }] = await Promise.all([
    db
      .from('profissionais')
      .select('id, nome, foto_url, especialidade, horarios_trabalho(*)')
      .eq('barbearia_id', barbearia.id)
      .eq('ativo', true)
      .order('nome'),
    db
      .from('servicos')
      .select('id, nome, preco, duracao_min, cor')
      .eq('barbearia_id', barbearia.id)
      .eq('ativo', true)
      .order('nome'),
  ])

  return NextResponse.json({ barbearia, profissionais: profissionais ?? [], servicos: servicos ?? [] })
}
