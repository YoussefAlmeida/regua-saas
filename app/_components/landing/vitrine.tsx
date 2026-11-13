import { CalendarCheck, CircleDollarSign, Users2, Check, Clock, LayoutDashboard, CalendarDays, Wallet, BarChart3 } from 'lucide-react'

/* Vitrine da página de vendas: o painel e o link de agendamento como eles são,
   desenhados em HTML (sem imagem pra carregar). Dados de exemplo. */

const PONTOS = [22, 30, 18, 40, 46, 34, 26, 44, 52, 60, 42, 36, 56, 64, 72, 58, 50, 66, 74, 86]

function Grafico() {
  const w = 320, h = 96, max = 90
  const x = (i: number) => (i / (PONTOS.length - 1)) * w
  const y = (v: number) => h - (v / max) * h
  const linha = PONTOS.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="lp-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.35" />
          <stop offset="1" stopColor="rgb(var(--accent-rgb))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${linha} L${w},${h} L0,${h} Z`} fill="url(#lp-area)" />
      <path d={linha} fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Painel do dono, numa moldura de navegador */
export function PainelVitrine() {
  const menu = [[LayoutDashboard, 'Dashboard', true], [CalendarDays, 'Agenda', false], [Users2, 'Clientes', false], [Wallet, 'Financeiro', false], [BarChart3, 'Relatórios', false]] as const
  return (
    <div className="rounded-2xl border border-line bg-surface shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)] overflow-hidden" aria-hidden>
      <div className="flex items-center gap-1.5 px-4 h-9 border-b border-line bg-surface-alt/60">
        <span className="w-2.5 h-2.5 rounded-full bg-line" /><span className="w-2.5 h-2.5 rounded-full bg-line" /><span className="w-2.5 h-2.5 rounded-full bg-line" />
        <span className="ml-3 text-[11px] text-fg-muted">regua.app/painel</span>
      </div>
      <div className="flex">
        <div className="hidden sm:block w-36 shrink-0 border-r border-line p-3 space-y-1">
          {menu.map(([Icone, nome, ativo]) => (
            <div key={nome} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] ${ativo ? 'bg-amber/15 text-amber font-semibold' : 'text-fg-muted'}`}>
              <Icone size={13} /> {nome}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            {([[CalendarCheck, '267', 'Agendamentos', '+12%'], [CircleDollarSign, 'R$ 12.480', 'Faturamento', '+18%'], [Users2, '156', 'Clientes ativos', '+9%']] as const).map(([Icone, v, r, d]) => (
              <div key={r} className="rounded-xl border border-line bg-bg/60 p-3">
                <Icone size={14} className="text-amber" />
                <p className="mt-2 text-[15px] font-semibold text-fg tabular-nums whitespace-nowrap">{v}</p>
                <p className="text-[10px] text-fg-muted">{r} <span className="text-entrada font-semibold">{d}</span></p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-line bg-bg/60 p-3">
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] text-fg-muted">Faturamento · últimos 30 dias</p>
              <p className="text-[13px] font-semibold text-fg tabular-nums">R$ 12.480,00</p>
            </div>
            <Grafico />
          </div>
          <div className="rounded-xl border border-line bg-bg/60 divide-y divide-line">
            {[['10:00', 'João Silva', 'Corte masculino', 'Carlos'], ['10:30', 'Pedro Mendes', 'Barba', 'Rafael'], ['11:00', 'Lucas Costa', 'Corte + barba', 'Carlos']].map(([h, c, s, b]) => (
              <div key={h} className="flex items-center gap-2.5 px-3 py-2 text-[11px]">
                <span className="rounded-md bg-amber/15 text-amber font-semibold px-1.5 py-0.5 tabular-nums">{h}</span>
                <span className="text-fg font-medium truncate flex-1">{c}</span>
                <span className="text-fg-muted truncate hidden sm:block">{s}</span>
                <span className="text-fg-muted">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Link de agendamento no celular do cliente */
export function CelularVitrine({ className = '' }: { className?: string }) {
  return (
    <div className={`w-[230px] rounded-[2.2rem] border border-line bg-surface-alt p-2 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)] ${className}`} aria-hidden>
      <div className="rounded-[1.8rem] bg-bg overflow-hidden">
        <div className="h-6 flex items-center justify-center"><span className="w-16 h-1.5 rounded-full bg-line" /></div>
        <div className="px-4 pb-5">
          <p className="text-[15px] font-semibold text-fg">Barbearia Alpha</p>
          <p className="text-[10px] text-fg-muted">Escolha o dia e o horário</p>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {[['Hoje', '12'], ['Sex', '13'], ['Sáb', '14'], ['Seg', '16']].map(([d, n], i) => (
              <div key={n} className={`rounded-lg py-1.5 text-center ${i === 1 ? 'bg-amber text-accent-fg' : 'border border-line text-fg'}`}>
                <p className="text-[8px] uppercase opacity-80">{d}</p><p className="text-[13px] font-semibold tabular-nums">{n}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {['09:00', '09:30', '10:00', '10:30', '11:00', '14:30'].map((h, i) => (
              <div key={h} className={`rounded-lg py-1.5 text-center text-[11px] tabular-nums ${i === 3 ? 'bg-amber text-accent-fg font-semibold' : 'border border-line text-fg'}`}>{h}</div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-line bg-surface p-2.5">
            <p className="text-[11px] font-semibold text-fg">Corte + barba</p>
            <p className="text-[10px] text-fg-muted flex items-center gap-1"><Clock size={9} /> 50 min · com Carlos</p>
          </div>
          <div className="mt-3 rounded-lg bg-verde text-verde-fg text-center text-[11px] font-semibold py-2 flex items-center justify-center gap-1">
            <Check size={12} /> Confirmar sexta, 10:30
          </div>
        </div>
      </div>
    </div>
  )
}
