import { NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { falhaInterna } from '@/lib/erros'

export async function GET() {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const db = criarClienteServico()
  const { data, error } = await db
    .from('profissionais')
    .select('id, nome, foto_url, especialidade, ativo, usuario_id, horarios_trabalho(*)')
    .eq('barbearia_id', sessao.barbearia_id)
    .eq('ativo', true)
    .order('nome')

  if (error) return falhaInterna('painel/profissionais', error, 'Erro ao buscar profissionais')
  return NextResponse.json(data)
}
