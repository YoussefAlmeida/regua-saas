'use client'

import { useState } from 'react'

/* Barras por dia (uma série): barras finas, topo arredondado, grade discreta.
   Passar o mouse, tocar ou focar numa barra mostra o dia e o valor. */

export interface Barra { rotulo: string; valor: number }

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const brlCurto = (v: number) => v >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v)}`

function teto(max: number): number {
  if (max <= 0) return 100
  const p = Math.pow(10, Math.floor(Math.log10(max)))
  for (const m of [1, 2, 5, 10]) if (m * p >= max) return m * p
  return 10 * p
}

export default function GraficoBarras({ barras, descricao, altura = 180 }: { barras: Barra[]; descricao: string; altura?: number }) {
  const [ativo, setAtivo] = useState<number | null>(null)
  const max = teto(Math.max(...barras.map(b => b.valor), 0))
  const passo = Math.max(1, Math.ceil(barras.length / 8))
  const b = ativo !== null ? barras[ativo] : null

  return (
    <div role="img" aria-label={descricao}>
      <div className="flex gap-2">
        {/* Eixo */}
        <div className="flex flex-col justify-between text-right shrink-0 w-14" style={{ height: altura }} aria-hidden>
          {[1, 0.5, 0].map(f => <span key={f} className="font-mono text-[11px] text-fg-muted leading-none">{brlCurto(max * f)}</span>)}
        </div>
        <div className="relative flex-1 min-w-0" style={{ height: altura }} onPointerLeave={() => setAtivo(null)}>
          {[0, 0.5, 1].map(f => <div key={f} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${f * 100}%` }} aria-hidden />)}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {barras.map((x, i) => (
              <button
                key={x.rotulo}
                type="button"
                tabIndex={-1}
                onPointerEnter={() => setAtivo(i)}
                onPointerDown={() => setAtivo(i)}
                onFocus={() => setAtivo(i)}
                aria-label={`${x.rotulo}: ${brl(x.valor)}`}
                className="group flex-1 h-full flex items-end min-w-0 cursor-default"
              >
                <span
                  className={`block w-full max-w-[18px] mx-auto rounded-t-[4px] transition-colors ${ativo === i ? 'bg-entrada' : 'bg-entrada/70'}`}
                  style={{ height: x.valor > 0 ? `max(2px, ${(x.valor / max) * 100}%)` : 0 }}
                />
              </button>
            ))}
          </div>
          {b && ativo !== null && (
            <div
              className="pointer-events-none absolute -top-1 -translate-x-1/2 -translate-y-full rounded-button bg-surface-alt border border-line px-2.5 py-1.5 shadow-lg shadow-black/40 whitespace-nowrap z-10"
              style={{ left: `clamp(48px, ${((ativo + 0.5) / barras.length) * 100}%, calc(100% - 48px))` }}
            >
              <p className="font-body text-[11px] text-fg-muted">{b.rotulo}</p>
              <p className="font-mono text-sm font-semibold text-fg">{brl(b.valor)}</p>
            </div>
          )}
        </div>
      </div>
      {/* Rótulos dos dias */}
      <div className="flex gap-[2px] ml-16 mt-1.5" aria-hidden>
        {barras.map((x, i) => (
          <span key={x.rotulo} className="flex-1 min-w-0 text-center font-mono text-[11px] text-fg-muted overflow-visible whitespace-nowrap">
            {i % passo === 0 ? x.rotulo.slice(0, 2) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
