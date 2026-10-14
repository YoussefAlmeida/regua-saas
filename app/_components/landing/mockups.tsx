import { Check, MapPin } from 'lucide-react'

/* ================================================================
   Peças da landing feitas em código (nítidas, leves, sem foto genérica)
   Mostram o produto de verdade: o que o cliente vê e o que o dono vê.
   ================================================================ */

const DIAS = [['Seg', '13'], ['Ter', '14'], ['Qua', '15'], ['Qui', '16'], ['Sex', '17']]
const HORAS: [string, 'livre' | 'ocupado' | 'escolhido'][] = [
  ['09:00', 'ocupado'], ['09:30', 'livre'], ['10:00', 'livre'],
  ['10:30', 'ocupado'], ['11:00', 'livre'], ['14:00', 'livre'],
  ['14:30', 'ocupado'], ['15:00', 'livre'], ['15:30', 'escolhido'],
]

/** O link de agendamento no celular do cliente */
export function CelularAgendamento() {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[300px]">
      <div className="rounded-[2.6rem] bg-fg p-2.5 shadow-[0_30px_60px_-20px_rgb(27_25_22/0.45)]">
        <div className="rounded-[2.1rem] bg-bg overflow-hidden">
          <div className="h-7 flex items-center justify-center">
            <span className="w-20 h-1.5 rounded-full bg-fg/15" />
          </div>
          <div className="px-5 pb-6">
            <p className="font-display text-[22px] font-semibold leading-tight text-fg">Barbearia do Zé</p>
            <p className="flex items-center gap-1 text-[11px] text-fg-muted mt-1">
              <MapPin size={11} /> Rua Marechal Deodoro, 214 · Centro
            </p>

            <div className="mt-4 rounded-xl bg-surface border border-line px-3 py-2.5 flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold text-fg">Corte + barba</p>
                <p className="text-[11px] text-fg-muted">50 min · com Zé</p>
              </div>
              <p className="text-[13px] font-semibold text-fg tabular-nums">R$ 55</p>
            </div>

            <p className="mt-4 text-[11px] font-semibold text-fg-muted">Escolha o dia</p>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {DIAS.map(([d, n], i) => (
                <div key={d} className={`rounded-lg py-1.5 text-center ${i === 1 ? 'bg-fg text-bg' : 'bg-surface border border-line text-fg'}`}>
                  <p className="text-[9px] opacity-70">{d}</p>
                  <p className="text-[13px] font-semibold tabular-nums">{n}</p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-[11px] font-semibold text-fg-muted">Horários livres</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {HORAS.map(([h, e]) => (
                <div key={h} className={`rounded-lg py-2 text-center text-[12px] font-semibold tabular-nums ${
                  e === 'escolhido' ? 'bg-amber text-amber-fg'
                  : e === 'ocupado' ? 'bg-surface-alt text-fg-muted/50 line-through'
                  : 'bg-surface border border-line text-fg'}`}>
                  {h}
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl bg-amber text-amber-fg text-center py-3 text-[13px] font-semibold">
              Confirmar terça, 15:30
            </div>
          </div>
        </div>
      </div>

      {/* Lembrete chegando no WhatsApp */}
      <div className="absolute -left-4 sm:-left-16 -bottom-20 sm:bottom-24 w-[220px] sm:w-[230px] rounded-2xl bg-surface border border-line shadow-[0_18px_40px_-18px_rgb(27_25_22/0.35)] p-3.5">
        <p className="text-[10px] font-semibold text-entrada">WhatsApp · agora</p>
        <p className="mt-1 text-[12px] leading-snug text-fg">
          Oi, Lucas. Passando pra lembrar do seu horário hoje às <strong>15:30</strong> com o Zé. Até já.
        </p>
      </div>
    </div>
  )
}

const MOVIMENTOS: [string, string, 'e' | 's'][] = [
  ['Corte + barba · Lucas', 'R$ 55,00', 'e'],
  ['Degradê · Rafael', 'R$ 40,00', 'e'],
  ['Lâminas e talco', 'R$ 38,00', 's'],
  ['Pezinho · Caio', 'R$ 15,00', 'e'],
]

/** O caixa do dia, como o dono vê no celular */
export function CartaoCaixa() {
  return (
    <div className="w-full max-w-sm rounded-2xl bg-surface text-fg border border-line shadow-[0_30px_60px_-25px_rgb(0_0_0/0.6)] overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-line">
        <p className="text-[12px] text-fg-muted">Caixa de hoje · terça, 14</p>
        <p className="font-display text-[34px] font-semibold leading-none mt-2 tabular-nums">R$ 1.284,00</p>
        <div className="mt-3 flex gap-4 text-[12px] tabular-nums">
          <span className="text-entrada font-semibold">+ R$ 1.420,00 entradas</span>
          <span className="text-saida font-semibold">− R$ 136,00 saídas</span>
        </div>
      </div>
      <ul className="divide-y divide-line">
        {MOVIMENTOS.map(([t, v, tipo]) => (
          <li key={t} className="flex items-center justify-between px-5 py-2.5 text-[13px]">
            <span className="text-fg">{t}</span>
            <span className={`font-semibold tabular-nums ${tipo === 'e' ? 'text-entrada' : 'text-saida'}`}>{tipo === 'e' ? '+' : '−'} {v}</span>
          </li>
        ))}
      </ul>
      <div className="px-5 py-4 bg-surface-alt">
        <p className="text-[11px] font-semibold text-fg-muted">Atendimentos no mês</p>
        {[['Zé', 86, 100], ['Léo', 64, 74], ['Bruno', 41, 48]].map(([n, q, pct]) => (
          <div key={n as string} className="mt-2">
            <div className="flex justify-between text-[12px]"><span>{n}</span><span className="tabular-nums text-fg-muted">{q}</span></div>
            <div className="mt-1 h-1.5 rounded-full bg-line"><div className="h-1.5 rounded-full bg-amber" style={{ width: `${pct}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Os quatro toques do cliente */
export function PassosCliente() {
  const passos = [
    ['Serviço', 'Corte, barba, sobrancelha. Com preço e duração na tela.'],
    ['Barbeiro', 'Escolhe com quem quer cortar, pela foto.'],
    ['Horário', 'Só aparece o que está livre de verdade.'],
    ['Pronto', 'Confirmação no WhatsApp e lembrete 2 horas antes.'],
  ]
  return (
    <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-line rounded-2xl overflow-hidden border border-line">
      {passos.map(([t, d], i) => (
        <li key={t} className="bg-surface p-6">
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold ${i === 3 ? 'bg-entrada text-white' : 'bg-fg text-bg'}`}>
              {i === 3 ? <Check size={14} /> : i + 1}
            </span>
            <p className="font-semibold text-fg">{t}</p>
          </div>
          <p className="mt-3 text-sm text-fg-muted leading-relaxed">{d}</p>
        </li>
      ))}
    </ol>
  )
}
