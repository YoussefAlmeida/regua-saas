import { redirect } from 'next/navigation'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { limitesDoMes, mesVizinho } from '@/lib/periodo'
import { CAMPOS_MOV } from '@/lib/financeiro'
import FinanceiroClient, { type Movimentacao } from './financeiro-client'


export default async function FinanceiroPage() {
  const sessao = await getSessao()
  if (!sessao) redirect('/entrar')
  if (sessao.papel !== 'dono') redirect('/painel/hoje')

  const db = criarClienteServico()
  const mesAtual = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' }).slice(0, 7)
  const atual = limitesDoMes(mesAtual)
  const anterior = limitesDoMes(mesVizinho(mesAtual, -1))

  const [{ data: movs }, { data: movsAnt }, { data: fixas }, { data: categorias }, { data: profissionais }] = await Promise.all([
    db.from('movimentacoes').select(CAMPOS_MOV)
      .eq('barbearia_id', sessao.barbearia_id).gte('data', atual.de).lt('data', atual.ate)
      .order('data', { ascending: false }).order('criado_em', { ascending: false }),
    db.from('movimentacoes').select('tipo, valor')
      .eq('barbearia_id', sessao.barbearia_id).gte('data', anterior.de).lt('data', anterior.ate),
    db.from('despesas_fixas').select('id, descricao, valor, dia_vencimento, ativa')
      .eq('barbearia_id', sessao.barbearia_id).order('dia_vencimento'),
    db.from('categorias_fin').select('id, nome, tipo, cor, padrao')
      .eq('barbearia_id', sessao.barbearia_id).order('padrao', { ascending: false }).order('nome'),
    db.from('profissionais').select('id, nome')
      .eq('barbearia_id', sessao.barbearia_id).order('nome'),
  ])

  return (
    <FinanceiroClient
      movimentacoesIniciais={(movs ?? []) as unknown as Movimentacao[]}
      anteriorInicial={movsAnt ?? []}
      despesasFixasIniciais={fixas ?? []}
      categoriasIniciais={categorias ?? []}
      profissionais={profissionais ?? []}
      mesInicial={mesAtual}
    />
  )
}
