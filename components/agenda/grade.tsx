'use client'

import { Lock } from 'lucide-react'

/* Grade da agenda: horas na vertical, colunas na horizontal.
   No dia, cada coluna é um barbeiro; na semana, cada coluna é um dia.
   Tocar num espaço vazio abre "novo agendamento" naquele horário. */

export interface ColunaGrade { id: string; titulo: string; sub?: string; destaque?: boolean; apagada?: boolean }
export interface EventoGrade {
  id: string; coluna: string; ini: number; fim: number   // minutos do dia
  titulo: string; detalhe: string; cor: string
  estado: 'aberto' | 'concluido' | 'faltou'
}
export interface BloqueioGrade { id: string; coluna: string; ini: number; fim: number; rotulo: string }

const PX = 1.4          // altura de 1 minuto → 30 min = 42px
const EIXO = 52         // largura da coluna das horas
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export default function GradeAgenda({
  colunas, eventos, bloqueios, inicio, fim, agora, onVazio, onEvento, larguraMin = 150,
}: {
  colunas: ColunaGrade[]
  eventos: EventoGrade[]
  bloqueios: BloqueioGrade[]
  /** Faixa mostrada, em minutos do dia (ex.: 420 = 07:00) */
  inicio: number
  fim: number
  /** Linha do "agora": em qual coluna ('*' = todas) e em que minuto */
  agora?: { coluna: string; min: number } | null
  onVazio: (coluna: string, minuto: number) => void
  onEvento: (id: string) => void
  larguraMin?: number
}) {
  const altura = (fim - inicio) * PX
  const horas = Array.from({ length: Math.floor((fim - inicio) / 60) + 1 }, (_, i) => inicio + i * 60)
  const y = (m: number) => (Math.min(Math.max(m, inicio), fim) - inicio) * PX

  return (
    <div className="h-full overflow-auto">
      <div style={{ minWidth: EIXO + colunas.length * larguraMin }}>
        {/* Cabeçalho das colunas */}
        <div className="sticky top-0 z-20 flex bg-surface border-b border-line">
          <div style={{ width: EIXO }} className="shrink-0" />
          {colunas.map(c => (
            <div key={c.id} className={`flex-1 min-w-0 px-2 py-2.5 text-center border-l border-line ${c.apagada ? 'opacity-50' : ''}`}>
              <p className={`font-ui text-sm font-semibold truncate ${c.destaque ? 'text-amber' : 'text-fg'}`}>{c.titulo}</p>
              {c.sub && <p className="font-body text-xs text-fg-muted truncate">{c.sub}</p>}
            </div>
          ))}
        </div>

        <div className="flex relative" style={{ height: altura + 12 }}>
          {/* Eixo das horas */}
          <div style={{ width: EIXO }} className="shrink-0 relative" aria-hidden>
            {horas.map(h => (
              <span key={h} className="absolute right-2 -translate-y-1/2 font-mono text-[11px] text-fg-muted" style={{ top: y(h) + 6 }}>{hhmm(h)}</span>
            ))}
          </div>

          {colunas.map(c => (
            <div
              key={c.id}
              className="flex-1 min-w-0 relative border-l border-line cursor-pointer"
              style={{ marginTop: 6, height: altura }}
              onClick={e => {
                if (e.target !== e.currentTarget) return   // clicou num horário marcado
                const r = e.currentTarget.getBoundingClientRect()
                const min = inicio + Math.floor((e.clientY - r.top) / PX / 30) * 30
                onVazio(c.id, Math.min(Math.max(min, inicio), fim - 30))
              }}
              role="group"
              aria-label={`${c.titulo}${c.sub ? `, ${c.sub}` : ''}`}
            >
              {/* Linhas de hora e meia hora */}
              {horas.map(h => (
                <div key={h} className="pointer-events-none absolute inset-x-0" style={{ top: y(h) }}>
                  <div className="border-t border-line" />
                  {h + 30 < fim && <div className="border-t border-line/40" style={{ marginTop: 30 * PX - 1 }} />}
                </div>
              ))}

              {bloqueios.filter(b => b.coluna === c.id && b.fim > inicio && b.ini < fim).map(b => (
                <div
                  key={b.id}
                  className="pointer-events-none absolute inset-x-1 rounded-button border border-dashed border-line overflow-hidden flex items-start gap-1.5 px-2 py-1"
                  style={{
                    top: y(b.ini), height: Math.max(y(b.fim) - y(b.ini), 20),
                    backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--surface-2-rgb)) 0 6px, transparent 6px 12px)',
                  }}
                >
                  <Lock size={11} className="text-fg-muted shrink-0 mt-0.5" aria-hidden />
                  <span className="font-body text-[11px] text-fg-muted truncate">{b.rotulo}</span>
                </div>
              ))}

              {eventos.filter(ev => ev.coluna === c.id && ev.fim > inicio && ev.ini < fim).map(ev => {
                const h = Math.max(y(ev.fim) - y(ev.ini) - 2, 22)
                return (
                  <button
                    key={ev.id}
                    onClick={() => onEvento(ev.id)}
                    title={`${hhmm(ev.ini)}–${hhmm(ev.fim)} · ${ev.titulo} · ${ev.detalhe}`}
                    className={`absolute inset-x-1 rounded-button border text-left overflow-hidden pl-2.5 pr-1.5 py-1 transition-colors hover:brightness-110 ${
                      ev.estado === 'concluido' ? 'bg-verde/25 border-verde/50'
                        : ev.estado === 'faltou' ? 'bg-surface-alt border-line opacity-60'
                        : 'bg-amber/15 border-amber/40'
                    }`}
                    style={{ top: y(ev.ini) + 1, height: h }}
                  >
                    <span className="absolute left-0 inset-y-0 w-1" style={{ backgroundColor: ev.cor }} aria-hidden />
                    <span className="block font-ui text-xs font-semibold text-fg truncate leading-tight">{ev.titulo}</span>
                    {h >= 36 && <span className="block font-body text-[11px] text-fg-muted truncate leading-tight">{ev.detalhe}</span>}
                    {h >= 52 && <span className="block font-mono text-[11px] text-fg-muted leading-tight">{hhmm(ev.ini)} – {hhmm(ev.fim)}</span>}
                  </button>
                )
              })}

              {agora && (agora.coluna === '*' || agora.coluna === c.id) && agora.min >= inicio && agora.min <= fim && (
                <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: y(agora.min) - 4 }} aria-hidden>
                  <span className="w-2 h-2 rounded-full bg-saida -ml-1" />
                  <span className="flex-1 border-t border-saida" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
