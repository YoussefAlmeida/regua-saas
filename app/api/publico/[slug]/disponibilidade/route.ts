import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'
import { horariosLivres, horariosLivresPeriodo } from '@/lib/disponibilidade'

const DATA = /^\d{4}-\d{2}-\d{2}$/

/*
 * GET ?profissional_id&servico_id&data=YYYY-MM-DD        → { slots }
 * GET ?profissional_id&servico_id&de=YYYY-MM-DD&dias=21  → { dias: { 'YYYY-MM-DD': [...] } }
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sp = req.nextUrl.searchParams
  const profissional_id = sp.get('profissional_id')
  const servico_id      = sp.get('servico_id')
  const data            = sp.get('data')
  const de              = sp.get('de')
  const dias            = Math.min(31, Math.max(1, Number(sp.get('dias') ?? 21) || 21))

  if (!profissional_id || !servico_id || !(data && DATA.test(data)) && !(de && DATA.test(de))) {
    return NextResponse.json({ erro: 'Parâmetros obrigatórios: profissional_id, servico_id e data (ou de)' }, { status: 400 })
  }

  const db = criarClienteServico()

  // Uma ida ao banco: serviço + barbeiro, já conferindo que são dessa barbearia
  const [{ data: servico }, { data: profissional }] = await Promise.all([
    db.from('servicos')
      .select('duracao_min, barbearia:barbearias!inner(id, slug, horario_funcionamento, dias_fechados)')
      .eq('id', servico_id)
      .eq('ativo', true)
      .eq('barbearia.slug', slug)
      .maybeSingle(),
    db.from('profissionais')
      .select('id, barbearia:barbearias!inner(slug)')
      .eq('id', profissional_id)
      .eq('ativo', true)
      .eq('barbearia.slug', slug)
      .maybeSingle(),
  ])

  if (!servico) return NextResponse.json({ erro: 'Serviço não encontrado' }, { status: 404 })
  if (!profissional) return NextResponse.json({ erro: 'Barbeiro não encontrado' }, { status: 404 })

  const barbearia = (Array.isArray(servico.barbearia) ? servico.barbearia[0] : servico.barbearia) as {
    id: string; horario_funcionamento: Record<string, never> | null; dias_fechados: string[] | null
  }

  if (de) {
    const porDia = await horariosLivresPeriodo(db, barbearia, profissional_id, de, dias, servico.duracao_min)
    return NextResponse.json({ dias: porDia }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const slots = await horariosLivres(db, barbearia, profissional_id, data!, servico.duracao_min)
  return NextResponse.json({ slots }, { headers: { 'Cache-Control': 'no-store' } })
}
