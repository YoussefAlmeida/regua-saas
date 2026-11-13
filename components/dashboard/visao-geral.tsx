import Link from 'next/link'
import { CalendarCheck, CircleDollarSign, Users2, Scissors, ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react'
import GraficoFaturamento, { type PontoDia } from './grafico-faturamento'

/* Dashboard do proprietário — só apresentação: recebe os números prontos
   (app/(painel)/painel/dashboard/page.tsx calcula). */

export interface DadosDashboard {
  periodo: string
  agendamentos: { total: number; variacao: number | null }
  faturamento: { total: number; variacao: number | null }
  clientesAtivos: { total: number; variacao: number | null }
  barbeiros: number
  cancelados: number
  faltas: number
  porDia: PontoDia[]
  servicos: { nome: string; qtd: number; pct: number }[]
  proximos: { id: string; hora: string; cliente: string; servico: string; barbeiro: string; emAtendimento?: boolean }[]
  ocupacao: { nome: string; pct: number | null }[]
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function Variacao({ v }: { v: number | null }) {
  if (v === null) return <span className="font-body text-xs text-fg-muted">sem período anterior</span>
  const sobe = v >= 0
  const Icone = sobe ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-0.5 font-body text-xs font-semibold ${sobe ? 'text-entrada' : 'text-saida'}`}>
      <Icone size={13} aria-hidden /> {sobe ? '+' : ''}{v}% <span className="font-normal text-fg-muted">vs. 30 dias antes</span>
    </span>
  )
}

const card = 'ds-card'
const rotulo = 'font-body text-xs text-fg-muted'

export default function VisaoGeral({ d }: { d: DadosDashboard }) {
  const indicadores = [
    { icone: CalendarCheck, rotulo: 'Agendamentos', valor: String(d.agendamentos.total), variacao: d.agendamentos.variacao as number | null | undefined },
    { icone: CircleDollarSign, rotulo: 'Faturamento', valor: brl(d.faturamento.total), variacao: d.faturamento.variacao },
    { icone: Users2, rotulo: 'Clientes ativos', valor: String(d.clientesAtivos.total), variacao: d.clientesAtivos.variacao },
    { icone: Scissors, rotulo: 'Barbeiros na agenda', valor: String(d.barbeiros), variacao: undefined },
  ]
  const semMovimento = d.porDia.every(p => p.valor === 0)

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="ds-titulo">Dashboard</h1>
          <p className="font-body text-sm text-fg-muted">Visão geral da sua barbearia</p>
        </div>
        <span className="font-body text-xs text-fg-muted border border-line rounded-button px-3 py-1.5">{d.periodo}</span>
      </div>

      {/* Indicadores */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Indicadores dos últimos 30 dias">
        {indicadores.map(({ icone: Icone, rotulo: r, valor, variacao }) => (
          <div key={r} className={`${card} p-4`}>
            <Icone size={20} className="text-amber" aria-hidden />
            <p className="font-mono text-lg md:text-xl font-semibold text-fg mt-3 truncate">{valor}</p>
            <p className={rotulo}>{r}</p>
            {variacao !== undefined && <p className="mt-1.5"><Variacao v={variacao} /></p>}
          </div>
        ))}
      </section>

      <div className="grid lg:grid-cols-3 gap-3">
        {/* Faturamento */}
        <section className={`${card} p-4 lg:col-span-2`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="font-ui text-sm font-semibold text-fg">Faturamento</h2>
              <p className={rotulo}>Entradas no caixa por dia</p>
            </div>
            <p className="font-mono text-lg md:text-xl font-semibold text-fg whitespace-nowrap">{brl(d.faturamento.total)}</p>
          </div>
          {semMovimento ? (
            <div className="empty-state h-[200px] !py-0">
              <p className="font-body text-sm">Nenhuma entrada no caixa nos últimos 30 dias.</p>
              <p className="font-body text-xs">Concluiu um atendimento? A entrada aparece aqui na hora.</p>
            </div>
          ) : <GraficoFaturamento pontos={d.porDia} />}
        </section>

        {/* Serviços mais procurados */}
        <section className={`${card} p-4`}>
          <h2 className="font-ui text-sm font-semibold text-fg">Serviços mais procurados</h2>
          <p className={`${rotulo} mb-4`}>Parte dos agendamentos do período</p>
          {d.servicos.length === 0 ? (
            <p className="font-body text-sm text-fg-muted py-8 text-center">Ainda sem agendamentos no período.</p>
          ) : (
            <ul className="space-y-3.5">
              {d.servicos.map(s => (
                <li key={s.nome} title={`${s.nome}: ${s.qtd} agendamento${s.qtd === 1 ? '' : 's'}`}>
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="font-body text-sm text-fg truncate">{s.nome}</span>
                    <span className="font-mono text-sm text-fg-muted shrink-0">{s.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
                    <div className="h-full rounded-full bg-amber" style={{ width: `${Math.max(s.pct, 2)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        {/* Próximos de hoje */}
        <section className={`${card} lg:col-span-2 overflow-hidden`}>
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
            <h2 className="font-ui text-sm font-semibold text-fg">Próximos agendamentos de hoje</h2>
            <Link href="/painel/agenda" className="inline-flex items-center gap-0.5 font-body text-xs text-amber hover:underline whitespace-nowrap shrink-0">
              Ver agenda <ChevronRight size={13} aria-hidden />
            </Link>
          </div>
          {d.proximos.length === 0 ? (
            <p className="font-body text-sm text-fg-muted px-4 pb-6">Nenhum horário marcado pro resto do dia.</p>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {d.proximos.map(a => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="font-mono text-sm font-semibold text-amber bg-amber/10 rounded-button px-2 py-1 shrink-0">{a.hora}</span>
                  <span className="font-body text-sm text-fg truncate flex-1 min-w-0">{a.cliente}</span>
                  <span className="font-body text-xs text-fg-muted truncate hidden sm:block w-36">{a.servico}</span>
                  <span className="font-body text-xs text-fg-muted truncate w-20 text-right">{a.barbeiro}</span>
                  {a.emAtendimento && <span className="ds-tag bg-amber/15 text-amber shrink-0">Em atendimento</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Ocupação */}
        <section className={`${card} p-4`}>
          <h2 className="font-ui text-sm font-semibold text-fg">Ocupação da equipe hoje</h2>
          <p className={`${rotulo} mb-4`}>Tempo marcado sobre o expediente</p>
          {d.ocupacao.length === 0 ? (
            <p className="font-body text-sm text-fg-muted py-6 text-center">Ninguém na agenda ainda.</p>
          ) : (
            <ul className="space-y-3.5">
              {d.ocupacao.map(o => (
                <li key={o.nome}>
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="font-body text-sm text-fg truncate">{o.nome}</span>
                    <span className="font-mono text-sm text-fg-muted shrink-0">{o.pct === null ? 'folga' : `${o.pct}%`}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
                    <div className="h-full rounded-full bg-fg" style={{ width: `${o.pct ?? 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="font-body text-xs text-fg-muted mt-5 pt-4 border-t border-line">
            Nos últimos 30 dias: <strong className="text-fg font-semibold">{d.cancelados}</strong> cancelamento{d.cancelados === 1 ? '' : 's'} e{' '}
            <strong className="text-fg font-semibold">{d.faltas}</strong> falta{d.faltas === 1 ? '' : 's'}.
          </p>
        </section>
      </div>
    </div>
  )
}
