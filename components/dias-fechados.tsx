'use client'

import { useState } from 'react'
import { CalendarOff, X } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'

/* Feriados e dias fechados: nesses dias ninguém agenda pela página, mesmo
   que o barbeiro tenha horário. Cada mudança já é salva. */
export default function DiasFechados({ iniciais }: { iniciais: string[] }) {
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
  const [fechados, setFechados] = useState(() => iniciais.filter(d => d >= hoje).sort())
  const [novo, setNovo] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function gravar(lista: string[], aviso: string) {
    setSalvando(true)
    const res = await fetch('/api/painel/barbearia', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dias_fechados: lista }) }).catch(() => null)
    setSalvando(false)
    if (!res) { avisar('Sem conexão. Confere a internet e tenta de novo.', 'erro'); return }
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    setFechados(lista); setNovo('')
    avisar(aviso, 'sucesso')
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold font-ui text-sm text-fg-muted">Feriados e dias fechados</h2>
        <p className="font-body text-xs text-fg-muted mt-1">Nesses dias ninguém agenda pela página, mesmo que o barbeiro tenha horário.</p>
      </div>
      <div className="flex gap-2">
        <input type="date" min={hoje} value={novo} onChange={e => setNovo(e.target.value)} className="ds-input flex-1 min-w-0" aria-label="Data fechada" />
        <button type="button" disabled={salvando || !novo || fechados.includes(novo)} onClick={() => gravar([...fechados, novo].sort(), 'Dia fechado marcado.')}
          className="font-semibold px-4 bg-surface-alt border border-line hover:border-amber/40 text-fg font-ui text-xs rounded-button transition-colors disabled:opacity-40">
          {salvando ? 'Salvando…' : 'Fechar o dia'}
        </button>
      </div>
      {fechados.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {fechados.map(d => (
            <li key={d} className="flex items-center gap-1.5 bg-surface border border-line rounded-full pl-3 pr-1.5 py-1">
              <CalendarOff size={12} className="text-fg-muted" aria-hidden />
              <span className="font-body text-xs text-fg inline-block first-letter:uppercase">{new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
              <button type="button" disabled={salvando} onClick={() => gravar(fechados.filter(x => x !== d), 'Dia reaberto.')} className="p-1 text-fg-muted hover:text-saida" aria-label="Reabrir esse dia"><X size={12} aria-hidden /></button>
            </li>
          ))}
        </ul>
      ) : <p className="font-body text-xs text-fg-muted">Nenhum dia fechado marcado.</p>}
    </section>
  )
}
