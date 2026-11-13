import { redirect } from 'next/navigation'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { todasAsLinhas } from '@/lib/paginar'
import { limitesDoDia, somarDias, minutosDeExpediente, dataHoraLocal } from '@/lib/disponibilidade'
import VisaoGeral, { type DadosDashboard } from '@/components/dashboard/visao-geral'
import { comInicio } from '@/lib/extras'

export const metadata = { title: 'Dashboard' }

/* Dashboard do proprietário: últimos 30 dias (com hoje) comparados aos 30
   anteriores. Tudo filtrado pela barbearia da sessão. */

const DIAS = 30
const variacao = (atual: number, antes: number) => antes > 0 ? Math.round(((atual - antes) / antes) * 100) : null

export default async function DashboardPage() {
  const sessao = await getSessao()
  if (!sessao) redirect('/entrar')
  if (sessao.papel !== 'dono') redirect('/painel/hoje')

  const db = criarClienteServico()
  const b = sessao.barbearia_id
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
  const inicioAtual = somarDias(hoje, -(DIAS - 1))
  const inicioAntes = somarDias(inicioAtual, -DIAS)
  const corte = new Date(limitesDoDia(inicioAtual).gte).getTime()   // início do período atual
  const { gte: hojeIni, lt: hojeFim } = limitesDoDia(hoje)

  const [{ data: ags }, { data: movs }, { data: profs }, { data: barbearia }, { data: proximos }] = await Promise.all([
    todasAsLinhas((de, ate) => db.from('agendamentos')
      .select('id, inicio, fim, status, cliente_id, profissional_id, servico:servicos!servico_id(nome)')
      .eq('barbearia_id', b).gte('inicio', limitesDoDia(inicioAntes).gte).lt('inicio', hojeFim)
      .order('id').range(de, ate)),
    todasAsLinhas((de, ate) => db.from('movimentacoes')
      .select('id, valor, data')
      .eq('barbearia_id', b).eq('tipo', 'entrada').gte('data', inicioAntes).lte('data', hoje)
      .order('id').range(de, ate)),
    db.from('profissionais')
      .select('id, nome, horarios_trabalho(dia_semana, inicio, fim, intervalo_inicio, intervalo_fim)')
      .eq('barbearia_id', b).eq('ativo', true).order('nome'),
    db.from('barbearias').select('id, horario_funcionamento, dias_fechados').eq('id', b).single(),
    db.from('agendamentos')
      .select('id, inicio, cliente:usuarios!cliente_id(nome), servico:servicos!servico_id(nome), profissional:profissionais!profissional_id(nome)')
      .eq('barbearia_id', b).in('status', ['agendado', 'confirmado'])
      .gte('fim', new Date().toISOString()).lt('inicio', hojeFim)
      .order('inicio').limit(6),
  ])

  const proximosComInicio = await comInicio(db, proximos ?? [])
  const um = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)
  const todos = ags ?? []
  const noAtual = todos.filter(a => new Date(a.inicio).getTime() >= corte)
  const noAntes = todos.filter(a => new Date(a.inicio).getTime() < corte)
  const validos = (l: typeof todos) => l.filter(a => a.status !== 'cancelado')
  const clientes = (l: typeof todos) => new Set(validos(l).map(a => a.cliente_id)).size

  // Faturamento = entradas no caixa (serviços concluídos + vendas e outras entradas)
  const porData = new Map<string, number>()
  let fatAtual = 0, fatAntes = 0
  for (const m of movs ?? []) {
    const v = Number(m.valor)
    if (m.data >= inicioAtual) { fatAtual += v; porData.set(m.data, (porData.get(m.data) ?? 0) + v) }
    else fatAntes += v
  }
  const porDia = Array.from({ length: DIAS }, (_, i) => {
    const data = somarDias(inicioAtual, i)
    return { data, valor: Math.round((porData.get(data) ?? 0) * 100) / 100 }
  })

  // Serviços mais procurados: 4 primeiros + "Outros"
  const contagem = new Map<string, number>()
  for (const a of validos(noAtual)) {
    const nome = um(a.servico as { nome: string } | { nome: string }[] | null)?.nome ?? 'Serviço'
    contagem.set(nome, (contagem.get(nome) ?? 0) + 1)
  }
  const ordenados = [...contagem.entries()].sort((x, y) => y[1] - x[1])
  const totalServ = ordenados.reduce((t, [, n]) => t + n, 0)
  const topo = ordenados.slice(0, 4)
  const outros = ordenados.slice(4).reduce((t, [, n]) => t + n, 0)
  const servicos = [...topo, ...(outros ? [['Outros', outros] as [string, number]] : [])]
    .map(([nome, qtd]) => ({ nome, qtd, pct: Math.round((qtd / totalServ) * 100) }))

  // Ocupação de hoje: minutos marcados sobre minutos de expediente de cada um
  const hojeMs = { a: new Date(hojeIni).getTime(), b: new Date(hojeFim).getTime() }
  const ocupacao = (profs ?? []).map(p => {
    const expediente = barbearia ? minutosDeExpediente(barbearia, p.horarios_trabalho ?? [], hoje) : 0
    const marcado = todos
      .filter(a => a.profissional_id === p.id && a.status !== 'cancelado' && a.status !== 'faltou')
      .reduce((t, a) => {
        const ini = Math.max(new Date(a.inicio).getTime(), hojeMs.a), fim = Math.min(new Date(a.fim).getTime(), hojeMs.b)
        return fim > ini ? t + (fim - ini) / 60_000 : t
      }, 0)
    return { nome: p.nome, pct: expediente > 0 ? Math.min(100, Math.round((marcado / expediente) * 100)) : null }
  })

  const fmt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
  const dados: DadosDashboard = {
    periodo: `Últimos 30 dias · ${fmt(inicioAtual)} a ${fmt(hoje)}`,
    agendamentos: { total: validos(noAtual).length, variacao: variacao(validos(noAtual).length, validos(noAntes).length) },
    faturamento: { total: fatAtual, variacao: variacao(fatAtual, fatAntes) },
    clientesAtivos: { total: clientes(noAtual), variacao: variacao(clientes(noAtual), clientes(noAntes)) },
    barbeiros: (profs ?? []).length,
    cancelados: noAtual.filter(a => a.status === 'cancelado').length,
    faltas: noAtual.filter(a => a.status === 'faltou').length,
    porDia,
    servicos,
    proximos: proximosComInicio.map(a => ({
      id: a.id,
      emAtendimento: !!a.iniciado_em,
      hora: dataHoraLocal(a.inicio).hora,
      cliente: um(a.cliente as { nome: string } | { nome: string }[] | null)?.nome ?? 'Cliente',
      servico: um(a.servico as { nome: string } | { nome: string }[] | null)?.nome ?? 'Serviço',
      barbeiro: um(a.profissional as { nome: string } | { nome: string }[] | null)?.nome ?? '',
    })),
    ocupacao,
  }

  return <VisaoGeral d={dados} />
}
