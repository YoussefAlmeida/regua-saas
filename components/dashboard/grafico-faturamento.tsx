'use client'

import { useEffect, useRef, useState } from 'react'

/* Faturamento por dia (uma série só): linha de 2px com área suave,
   grade discreta e leitura por ponto ao passar o mouse ou tocar. */

export interface PontoDia { data: string; valor: number }

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const brlCurto = (v: number) => v >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v)}`
const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

/** Teto "redondo" do eixo (1, 2 ou 5 × potência de 10) */
function teto(max: number): number {
  if (max <= 0) return 100
  const p = Math.pow(10, Math.floor(Math.log10(max)))
  for (const m of [1, 2, 5, 10]) if (m * p >= max) return m * p
  return 10 * p
}

export default function GraficoFaturamento({ pontos }: { pontos: PontoDia[] }) {
  const caixa = useRef<HTMLDivElement>(null)
  const [largura, setLargura] = useState(0)
  const [ativo, setAtivo] = useState<number | null>(null)

  useEffect(() => {
    if (!caixa.current) return
    const ro = new ResizeObserver(([e]) => setLargura(Math.floor(e.contentRect.width)))
    ro.observe(caixa.current)
    return () => ro.disconnect()
  }, [])

  const A = 200, esq = 58, dir = 12, topo = 10, base = 24
  const w = Math.max(0, largura - esq - dir), h = A - topo - base
  const max = teto(Math.max(...pontos.map(p => p.valor), 0))
  const x = (i: number) => esq + (pontos.length > 1 ? (i / (pontos.length - 1)) * w : w / 2)
  const y = (v: number) => topo + h - (v / max) * h
  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ')
  const area = pontos.length ? `${linha} L${x(pontos.length - 1).toFixed(1)},${topo + h} L${x(0).toFixed(1)},${topo + h} Z` : ''
  const passo = Math.max(1, Math.ceil(pontos.length / (largura < 480 ? 4 : 7)))

  function mover(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - r.left - esq) / (w || 1)
    setAtivo(Math.min(pontos.length - 1, Math.max(0, Math.round(rel * (pontos.length - 1)))))
  }

  const p = ativo !== null ? pontos[ativo] : null

  return (
    <div ref={caixa} className="relative w-full" style={{ height: A }}>
      {largura > 0 && (
        <svg
          width={largura} height={A} role="img"
          aria-label={`Faturamento por dia, de ${diaMes(pontos[0]?.data ?? '')} a ${diaMes(pontos[pontos.length - 1]?.data ?? '')}`}
          onPointerMove={mover} onPointerDown={mover} onPointerLeave={() => setAtivo(null)}
          className="touch-pan-y select-none"
        >
          {[0, 0.5, 1].map(f => (
            <g key={f}>
              <line x1={esq} x2={esq + w} y1={y(max * f)} y2={y(max * f)} stroke="rgb(var(--line-rgb))" strokeWidth={1} />
              <text x={esq - 8} y={y(max * f) + 4} textAnchor="end" fontSize={11} fill="rgb(var(--fg-muted-rgb))">{brlCurto(max * f)}</text>
            </g>
          ))}
          {pontos.map((pt, i) => (i % passo === 0 || i === pontos.length - 1) && (
            // Último rótulo só se não encostar no anterior
            (i !== pontos.length - 1 || (pontos.length - 1) % passo === 0 || (pontos.length - 1) % passo > passo / 2) && (
              <text key={pt.data} x={x(i)} y={A - 6} textAnchor={i === pontos.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'} fontSize={11} fill="rgb(var(--fg-muted-rgb))">
                {diaMes(pt.data)}
              </text>
            )
          ))}
          <path d={area} fill="rgb(var(--accent-rgb) / 0.14)" />
          <path d={linha} fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {p && ativo !== null && (
            <g>
              <line x1={x(ativo)} x2={x(ativo)} y1={topo} y2={topo + h} stroke="rgb(var(--fg-muted-rgb))" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={x(ativo)} cy={y(p.valor)} r={5} fill="rgb(var(--accent-rgb))" stroke="rgb(var(--surface-rgb))" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      {p && ativo !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-button bg-surface-alt border border-line px-2.5 py-1.5 shadow-lg shadow-black/40 whitespace-nowrap"
          style={{ left: Math.min(Math.max(x(ativo), 70), Math.max(70, largura - 70)) }}
        >
          <p className="font-body text-[11px] text-fg-muted">{diaMes(p.data)}</p>
          <p className="font-mono text-sm font-semibold text-fg">{brl(p.valor)}</p>
        </div>
      )}
    </div>
  )
}
