'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'

/* Funcionamento da barbearia: dias, horário e almoço. Vale pra todos;
   cada barbeiro monta o horário dele dentro deste. */

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export type HorarioDia = { ativo: boolean; inicio?: string; fim?: string; intervalo_inicio?: string; intervalo_fim?: string }
export type Horarios = Record<string, HorarioDia>

export default function FuncionamentoBarbearia({ inicial, onSalvo }: { inicial: Horarios; onSalvo?: (h: Horarios) => void }) {
  const [horarios, setHorarios] = useState<Horarios>(inicial)
  const [salvando, setSalvando] = useState(false)
  const [mudou, setMudou] = useState(false)

  function updateHorario(dia: string, campo: keyof HorarioDia, valor: boolean | string) {
    setMudou(true)
    setHorarios(h => ({ ...h, [dia]: { ...h[dia], [campo]: valor } }))
  }

  async function salvar() {
    for (const [k, h] of Object.entries(horarios)) {
      if (!h.ativo) continue
      const ini = h.inicio ?? '08:00', fim = h.fim ?? '19:00'
      if (ini >= fim) { avisar(`${DIAS[Number(k)]}: a barbearia precisa fechar depois de abrir.`, 'erro'); return }
      if (h.intervalo_inicio && h.intervalo_fim && !(ini <= h.intervalo_inicio && h.intervalo_inicio < h.intervalo_fim && h.intervalo_fim <= fim)) {
        avisar(`${DIAS[Number(k)]}: o almoço precisa ficar dentro do horário de funcionamento.`, 'erro'); return
      }
    }
    setSalvando(true)
    const res = await fetch('/api/painel/barbearia', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ horario_funcionamento: horarios }) }).catch(() => null)
    setSalvando(false)
    if (!res) { avisar('Sem conexão. Confere a internet e tenta de novo.', 'erro'); return }
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    setMudou(false)
    onSalvo?.(horarios)
    avisar('Funcionamento salvo. Já vale na página de agendamento.', 'sucesso')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold font-ui text-sm text-fg-muted">Funcionamento da barbearia</h2>
        <button onClick={salvar} disabled={salvando || !mudou} className="font-semibold flex items-center gap-1.5 bg-amber hover:bg-accent-press text-accent-fg font-ui text-xs px-4 py-2 rounded-button transition-colors disabled:opacity-50">
          <Check size={13} aria-hidden /> {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
        <div className="bg-surface rounded-card border border-line overflow-hidden">
          {DIAS.map((dia, idx) => {
            const key = String(idx)
            const h = horarios[key] ?? { ativo: false }
            return (
              <div
                key={key}
                className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 ${idx < 6 ? 'border-b border-line' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => updateHorario(key, 'ativo', !h.ativo)}
                  className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${h.ativo ? 'bg-amber' : 'bg-line'}`}
                >
                  <span
                    className={`absolute left-0 top-0.5 w-4 h-4 rounded-full bg-fg transition-transform ${h.ativo ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
                  />
                </button>
                <span className={`font-ui text-xs uppercase tracking-wider w-8 shrink-0 ${h.ativo ? 'text-fg' : 'text-fg-muted'}`}>
                  {dia}
                </span>

                {h.ativo ? (
                  <div className="flex items-center gap-1.5 min-[400px]:gap-2 flex-1 min-w-0">
                    <input
                      type="time"
                      value={h.inicio ?? '08:00'}
                      onChange={e => updateHorario(key, 'inicio', e.target.value)}
                      className="flex-1 min-w-0 max-w-[7.5rem] [&::-webkit-calendar-picker-indicator]:hidden min-[400px]:[&::-webkit-calendar-picker-indicator]:block bg-surface border border-line rounded-button px-1.5 min-[400px]:px-2 py-1 font-body text-xs text-fg focus:outline-none focus:ring-1 focus:ring-amber"
                    />
                    <span className="text-fg-muted text-xs">–</span>
                    <input
                      type="time"
                      value={h.fim ?? '19:00'}
                      onChange={e => updateHorario(key, 'fim', e.target.value)}
                      className="flex-1 min-w-0 max-w-[7.5rem] [&::-webkit-calendar-picker-indicator]:hidden min-[400px]:[&::-webkit-calendar-picker-indicator]:block bg-surface border border-line rounded-button px-1.5 min-[400px]:px-2 py-1 font-body text-xs text-fg focus:outline-none focus:ring-1 focus:ring-amber"
                    />
                  </div>
                ) : (
                  <span className="font-body text-xs text-fg-muted">Fechado</span>
                )}
                {h.ativo && (() => {
                  const temAlmoco = !!(h.intervalo_inicio && h.intervalo_fim)
                  const campo = 'flex-1 min-w-0 max-w-[7.5rem] [&::-webkit-calendar-picker-indicator]:hidden min-[400px]:[&::-webkit-calendar-picker-indicator]:block bg-surface border border-line rounded-button px-1.5 min-[400px]:px-2 py-1 font-body text-xs text-fg focus:outline-none focus:ring-1 focus:ring-amber'
                  return (
                    <div className="basis-full flex items-center gap-3 pl-12">
                      <label className="flex items-center gap-1.5 font-body text-xs text-fg-muted cursor-pointer shrink-0">
                        <input type="checkbox" checked={temAlmoco} className="accent-[rgb(var(--accent-rgb))]"
                          onChange={e => { setMudou(true); setHorarios(hs => {
                            const { intervalo_inicio: _i, intervalo_fim: _f, ...resto } = hs[key] ?? { ativo: true }
                            void _i; void _f
                            return { ...hs, [key]: e.target.checked ? { ...resto, intervalo_inicio: '12:00', intervalo_fim: '13:00' } : resto }
                          }) }} />
                        Almoço
                      </label>
                      {temAlmoco && (
                        <div className="flex items-center gap-1.5 min-[400px]:gap-2 flex-1 min-w-0">
                          <input type="time" aria-label={`Início do almoço, ${dia}`} value={h.intervalo_inicio} onChange={e => updateHorario(key, 'intervalo_inicio', e.target.value)} className={campo} />
                          <span className="text-fg-muted text-xs">–</span>
                          <input type="time" aria-label={`Fim do almoço, ${dia}`} value={h.intervalo_fim} onChange={e => updateHorario(key, 'intervalo_fim', e.target.value)} className={campo} />
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
    </div>
  )
}
