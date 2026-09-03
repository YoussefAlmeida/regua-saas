import { NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'

export async function GET() {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const db = criarClienteServico()
  const { data, error } = await db
    .from('usuarios')
    .select(`
      id, nome, whatsapp, criado_em,
      agendamentos:agendamentos!cliente_id(id, inicio, status)
    `)
    .eq('barbearia_id', sessao.barbearia_id)
    .eq('papel', 'cliente')
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ erro: 'Erro ao buscar clientes' }, { status: 500 })
  return NextResponse.json(data)
}
