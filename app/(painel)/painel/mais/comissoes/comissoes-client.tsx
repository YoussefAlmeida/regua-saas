'use client'

import Cabe from '@/components/cabe'
import { useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'
import { lerValorBRL } from '@/lib/dinheiro'

/* Comissões do mês: quanto cada profissional gerou, o percentual combinado
   e quanto isso dá. O dono ajusta o percentual e a meta de cada um aqui. */

export interface LinhaComissao {
  id: string; nome: string; naAgenda: boolean
  atendimentos: number; gerado: number
  comissao_pct: number | null; meta_mensal: number | null
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ComissoesClient({ linhasIniciais, liberado }: { linhasIniciais: LinhaComissao[]; liberado: boolean }) {
  const [linhas, setLinhas] = useState(linhasIniciais)
  const [editando, setEditando] = useState<string | null>(null)
  const [pct, setPct] = useState('')
  const [meta, setMeta] = useState('')
  const [salvando, setSalvando] = useState(false)

  const total = linhas.reduce((t, l) => t + l.gerado * (l.comissao_pct ?? 0) / 100, 0)
  const gerado = linhas.reduce((t, l) => t + l.gerado, 0)

  function abrir(l: LinhaComissao) {
    setEditando(l.id)
    setPct(l.comissao_pct === null ? '' : String(l.comissao_pct).replace('.', ','))
    setMeta(l.meta_mensal === null ? '' : String(l.meta_mensal).replace('.', ','))
  }

  async function salvar(l: LinhaComissao) {
    const p = pct.trim() === '' ? null : Number(pct.replace(',', '.'))
    const m = meta.trim() === '' ? null : lerValorBRL(meta)
    if (p !== null && (!Number.isFinite(p) || p < 0 || p > 100)) { avisar('A comissão vai de 0 a 100%.', 'erro'); return }
    if (m !== null && !Number.isFinite(m)) { avisar('Confere o valor da meta.', 'erro'); return }
    setSalvando(true)
    const res = await fetch(`/api/painel/profissionais/${l.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comissao_pct: p, meta_mensal: m }) }).catch(() => null)
    setSalvando(false)
    if (!res) { avisar('Sem conexão. Confere a internet e tenta de novo.', 'erro'); return }
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    setLinhas(prev => prev.map(x => x.id === l.id ? { ...x, comissao_pct: p, meta_mensal: m } : x))
    setEditando(null)
    avisar(`Comissão e meta de ${l.nome} salvas.`, 'sucesso')
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="ds-card p-4"><p className="ds-eyebrow">Gerado em serviços</p><p className="font-display text-xl font-semibold text-fg mt-2 tabular-nums"><Cabe>{brl(gerado)}</Cabe></p></div>
        <div className="ds-card p-4"><p className="ds-eyebrow">Comissões a pagar</p><p className="font-display text-xl font-semibold text-amber mt-2 tabular-nums"><Cabe>{brl(total)}</Cabe></p></div>
      </div>

      {!liberado && <p className="ds-card p-4 font-body text-sm text-fg">As comissões ainda não foram liberadas nesta conta. Fala com o suporte do RÉGUA.</p>}

      {linhas.length === 0 ? (
        <p className="ds-card p-8 text-center font-body text-sm text-fg-muted ds-grade">Ninguém na equipe ainda. Convide um barbeiro em Equipe.</p>
      ) : (
        <ul className="space-y-2">
          {linhas.map(l => {
            const valor = l.gerado * (l.comissao_pct ?? 0) / 100
            const daMeta = l.meta_mensal ? Math.round((l.gerado / l.meta_mensal) * 100) : null
            return (
              <li key={l.id} className="ds-card p-4">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-surface-alt border border-line flex items-center justify-center font-display font-semibold text-amber shrink-0" aria-hidden>{l.nome.charAt(0).toUpperCase()}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-[15px] font-semibold text-fg truncate">{l.nome}{!l.naAgenda && <span className="font-body text-xs font-normal text-fg-muted"> · fora da agenda</span>}</p>
                    <p className="font-body text-xs text-fg-muted">{l.atendimentos} atendimento{l.atendimentos === 1 ? '' : 's'} · gerou <span className="tabular-nums">{brl(l.gerado)}</span></p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-base font-semibold text-amber tabular-nums">{l.comissao_pct === null ? '—' : brl(valor)}</p>
                    <p className="font-body text-xs text-fg-muted">{l.comissao_pct === null ? 'sem comissão definida' : `${String(l.comissao_pct).replace('.', ',')}% de comissão`}</p>
                  </div>
                </div>

                {daMeta !== null && (
                  <div className="mt-3">
                    <div className="flex justify-between font-body text-xs text-fg-muted"><span>Meta de {brl(l.meta_mensal!)}</span><span className="tabular-nums">{daMeta}%</span></div>
                    <div className="h-1.5 rounded-full bg-surface-alt mt-1.5 overflow-hidden"><div className={`h-full rounded-full ${daMeta >= 100 ? 'bg-entrada' : 'bg-amber'}`} style={{ width: `${Math.min(daMeta, 100)}%` }} /></div>
                  </div>
                )}

                {liberado && (editando === l.id ? (
                  <div className="mt-3 pt-3 border-t border-line grid grid-cols-2 gap-3">
                    <div><label className="ds-label" htmlFor={`pct-${l.id}`}>Comissão (%)</label><input id={`pct-${l.id}`} inputMode="decimal" value={pct} onChange={e => setPct(e.target.value)} placeholder="40" className="ds-input" /></div>
                    <div><label className="ds-label" htmlFor={`meta-${l.id}`}>Meta do mês (R$)</label><input id={`meta-${l.id}`} inputMode="decimal" value={meta} onChange={e => setMeta(e.target.value)} placeholder="4.000" className="ds-input" /></div>
                    <button onClick={() => salvar(l)} disabled={salvando} className="ds-btn-primary !min-h-[40px]"><Check size={15} aria-hidden /> {salvando ? 'Salvando…' : 'Salvar'}</button>
                    <button onClick={() => setEditando(null)} className="ds-btn-secondary !min-h-[40px]">Voltar</button>
                  </div>
                ) : (
                  <button onClick={() => abrir(l)} className="mt-3 inline-flex items-center gap-1.5 font-body text-xs text-fg-muted hover:text-amber transition-colors"><Pencil size={12} aria-hidden /> Definir comissão e meta</button>
                ))}
              </li>
            )
          })}
        </ul>
      )}
      <p className="font-body text-xs text-fg-muted">A comissão é calculada sobre os atendimentos concluídos no mês. Vendas e outras entradas do caixa não entram.</p>
    </>
  )
}
