import { NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { falhaInterna } from '@/lib/erros'

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
    .eq('ativo', true)
    .order('criado_em', { ascending: false })

  if (error) return falhaInterna('painel/clientes', error, 'Erro ao buscar clientes')
  return NextResponse.json(data)
}
