import { headers, cookies } from 'next/headers'
import { criarClienteAutenticado } from '@/lib/supabase/server'
import { COOKIE_SESSION } from '@/lib/auth'
import FinanceiroClient, { type Movimentacao } from './financeiro-client'

export default async function FinanceiroPage() {
  const h = await headers()
  const barbearia_id = h.get('x-barbearia-id')!
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_SESSION)!.value
  const db = criarClienteAutenticado(token)

  const mesAtual = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' }).slice(0, 7) // 'YYYY-MM'
  const [y, m] = mesAtual.split('-').map(Number)

  const [{ data: movimentacoes }, { data: despesasFixas }] = await Promise.all([
    db
      .from('movimentacoes')
      .select('id, tipo, descricao, valor, data, origem, criado_em, categoria:categorias_fin(nome, cor)')
      .eq('barbearia_id', barbearia_id)
      .gte('data', `${mesAtual}-01`)
      .lt('data', `${y}-${String(m + 1).padStart(2, '0')}-01`)
      .order('data', { ascending: false })
      .order('criado_em', { ascending: false }),
    db
      .from('despesas_fixas')
      .select('id, descricao, valor, dia_vencimento, ativa')
      .eq('barbearia_id', barbearia_id)
      .order('dia_vencimento'),
  ])

  return (
    <FinanceiroClient
      movimentacoesIniciais={(movimentacoes as unknown) as Movimentacao[] ?? []}
      despesasFixasIniciais={despesasFixas ?? []}
      mesInicial={mesAtual}
    />
  )
}
