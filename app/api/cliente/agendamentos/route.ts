import { NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'

/** "Meus agendamentos" — só os do próprio cliente */
export async function GET() {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'cliente') return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { data, error } = await criarClienteServico()
    .from('agendamentos')
    .select(`
      id, inicio, fim, status, valor_servico, cancelado_por,
      profissional:profissionais!profissional_id(nome),
      servico:servicos!servico_id(nome, duracao_min)
    `)
    .eq('cliente_id', sessao.usuario_id)
    .eq('barbearia_id', sessao.barbearia_id)
    .order('inicio', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ erro: 'Erro ao buscar agendamentos' }, { status: 500 })
  return NextResponse.json(data)
}
