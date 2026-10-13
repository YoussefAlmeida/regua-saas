'use client'

import { useState } from 'react'
import { Plus, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'

export interface Movimentacao {
  id: string
  tipo: 'entrada' | 'saida'
  descricao: string
  valor: number
  data: string
  origem: string
  categoria: { nome: string; cor: string } | null
}

interface DespesaFixa {
  id: string
  descricao: string
  valor: number
  dia_vencimento: number
  ativa: boolean
}

type Tab = 'resumo' | 'extrato' | 'fixas'

function mesLabel(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  return new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function mesAnterior(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 2)
  return d.toLocaleDateString('sv-SE', {}).slice(0, 7)
}

function mesSeguinte(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m)
  return d.toLocaleDateString('sv-SE', {}).slice(0, 7)
}

export default function FinanceiroClient({
  movimentacoesIniciais,
  despesasFixasIniciais,
  mesInicial,
}: {
  movimentacoesIniciais: Movimentacao[]
  despesasFixasIniciais: DespesaFixa[]
  mesInicial: string
}) {
  const [tab, setTab] = useState<Tab>('resumo')
  const [mes, setMes] = useState(mesInicial)
  const [movs, setMovs] = useState<Movimentacao[]>(movimentacoesIniciais)
  const [despesas, setDespesas] = useState<DespesaFixa[]>(despesasFixasIniciais)
  const [carregando, setCarregando] = useState(false)

  // Modal nova movimentação
  const [modalMov, setModalMov] = useState(false)
  const [novoTipo, setNovoTipo] = useState<'entrada' | 'saida'>('entrada')
  const [novoForm, setNovoForm] = useState({ descricao: '', valor: '', data: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' }) })
  const [novoErro, setNovoErro] = useState('')
  const [novoSalvando, setNovoSalvando] = useState(false)

  // Modal nova despesa fixa
  const [modalFixa, setModalFixa] = useState(false)
  const [fixaForm, setFixaForm] = useState({ descricao: '', valor: '', dia_vencimento: '5' })
  const [fixaErro, setFixaErro] = useState('')
  const [fixaSalvando, setFixaSalvando] = useState(false)

  const totalEntradas = movs.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.valor, 0)
  const totalSaidas   = movs.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0)
  const saldo = totalEntradas - totalSaidas

  async function mudarMes(novoMes: string) {
    setMes(novoMes)
    setCarregando(true)
    const res = await fetch(`/api/painel/movimentacoes?mes=${novoMes}`)
    const json = await res.json()
    setCarregando(false)
    if (res.ok) setMovs(json)
  }

  async function salvarMov(e: React.FormEvent) {
    e.preventDefault()
    setNovoErro('')
    const valor = parseFloat(novoForm.valor)
    if (isNaN(valor) || valor <= 0) { setNovoErro('Valor inválido'); return }
    setNovoSalvando(true)

    const res = await fetch('/api/painel/movimentacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: novoTipo, descricao: novoForm.descricao, valor, data: novoForm.data }),
    })
    const json = await res.json()
    setNovoSalvando(false)
    if (!res.ok) { setNovoErro(json.erro || 'Erro'); return }

    if (json.data?.slice(0, 7) === mes) {
      setMovs(prev => [json, ...prev])
    }
    setModalMov(false)
    setNovoForm({ descricao: '', valor: '', data: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' }) })
  }

  async function deletarMov(id: string) {
    if (!confirm('Deletar esta movimentação?')) return
    const res = await fetch(`/api/painel/movimentacoes/${id}`, { method: 'DELETE' })
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    setMovs(prev => prev.filter(m => m.id !== id))
    avisar('Lançamento apagado.', 'sucesso')
  }

  async function salvarFixa(e: React.FormEvent) {
    e.preventDefault()
    setFixaErro('')
    const valor = parseFloat(fixaForm.valor)
    const dia = parseInt(fixaForm.dia_vencimento)
    if (isNaN(valor) || valor <= 0) { setFixaErro('Valor inválido'); return }
    if (isNaN(dia) || dia < 1 || dia > 28) { setFixaErro('Dia inválido (1–28)'); return }
    setFixaSalvando(true)

    const res = await fetch('/api/painel/despesas-fixas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descricao: fixaForm.descricao, valor, dia_vencimento: dia }),
    })
    const json = await res.json()
    setFixaSalvando(false)
    if (!res.ok) { setFixaErro(json.erro || 'Erro'); return }
    setDespesas(prev => [...prev, json].sort((a, b) => a.dia_vencimento - b.dia_vencimento))
    setModalFixa(false)
    setFixaForm({ descricao: '', valor: '', dia_vencimento: '5' })
  }

  async function toggleFixa(id: string, ativa: boolean) {
    const res = await fetch(`/api/painel/despesas-fixas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativa: !ativa }),
    })
    if (res.ok) {
      const json = await res.json()
      setDespesas(prev => prev.map(d => d.id === id ? { ...d, ...json } : d))
    }
  }

  async function deletarFixa(id: string) {
    if (!confirm('Deletar esta despesa fixa?')) return
    const res = await fetch(`/api/painel/despesas-fixas/${id}`, { method: 'DELETE' })
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    setDespesas(prev => prev.filter(d => d.id !== id))
    avisar('Despesa fixa removida. Os meses já lançados continuam no extrato.', 'sucesso')
  }

  const inputCls = 'w-full bg-bg border border-line rounded-button px-3 py-2.5 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber'
  const labelCls = 'font-ui text-xs uppercase tracking-wider text-fg-muted block mb-1'

  return (
    <div className="flex flex-col max-w-lg mx-auto">
      {/* Tabs */}
      <div className="flex border-b border-line bg-surface sticky top-16 z-10">
        {(['resumo', 'extrato', 'fixas'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 font-ui text-xs uppercase tracking-wider border-b-2 transition-colors ${
              tab === t ? 'border-amber text-fg' : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            {t === 'resumo' ? 'Resumo' : t === 'extrato' ? 'Extrato' : 'Fixas'}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">

        {/* Navegação de mês */}
        {(tab === 'resumo' || tab === 'extrato') && (
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => mudarMes(mesAnterior(mes))} className="p-1.5 text-fg-muted hover:text-fg">
              <ChevronLeft size={16} />
            </button>
            <p className="font-ui text-sm uppercase tracking-wider text-fg capitalize">{mesLabel(mes)}</p>
            <button onClick={() => mudarMes(mesSeguinte(mes))} className="p-1.5 text-fg-muted hover:text-fg">
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── TAB RESUMO ── */}
        {tab === 'resumo' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface border border-entrada/20 rounded-card p-3 text-center">
                <p className="font-ui text-[10px] uppercase tracking-wider text-fg-muted mb-1">Entradas</p>
                <p className="font-mono text-base text-entrada">R$ {totalEntradas.toFixed(2)}</p>
              </div>
              <div className="bg-surface border border-saida/20 rounded-card p-3 text-center">
                <p className="font-ui text-[10px] uppercase tracking-wider text-fg-muted mb-1">Saídas</p>
                <p className="font-mono text-base text-saida">R$ {totalSaidas.toFixed(2)}</p>
              </div>
              <div className={`bg-surface border rounded-card p-3 text-center ${saldo >= 0 ? 'border-entrada/20' : 'border-saida/20'}`}>
                <p className="font-ui text-[10px] uppercase tracking-wider text-fg-muted mb-1">Saldo</p>
                <p className={`font-mono text-base ${saldo >= 0 ? 'text-entrada' : 'text-saida'}`}>R$ {saldo.toFixed(2)}</p>
              </div>
            </div>

            <div>
              <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-2">Últimas movimentações</p>
              {movs.length === 0 ? (
                <p className="font-body text-sm text-fg-muted text-center py-6">Nenhuma movimentação no mês.</p>
              ) : (
                <div className="space-y-1.5">
                  {movs.slice(0, 8).map(m => (
                    <div key={m.id} className="flex items-center gap-3 bg-surface border border-line rounded-card px-3 py-2.5">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${m.tipo === 'entrada' ? 'bg-entrada' : 'bg-saida'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-fg truncate">{m.descricao}</p>
                        <p className="font-body text-xs text-fg-muted">
                          {new Date(m.data + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          {m.origem === 'automatica' && ' · auto'}
                        </p>
                      </div>
                      <span className={`font-mono text-sm shrink-0 ${m.tipo === 'entrada' ? 'text-entrada' : 'text-saida'}`}>
                        {m.tipo === 'entrada' ? '+' : '-'} R$ {m.valor.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {movs.length > 8 && (
                    <button onClick={() => setTab('extrato')} className="w-full text-center font-body text-xs text-amber py-2 hover:underline">
                      Ver todas ({movs.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB EXTRATO ── */}
        {tab === 'extrato' && (
          <div className="space-y-4">
            <button
              onClick={() => setModalMov(true)}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-line text-fg-muted font-ui text-xs uppercase tracking-wider py-3 rounded-card hover:border-amber hover:text-amber transition-colors"
            >
              <Plus size={14} /> Adicionar movimentação
            </button>

            {carregando ? (
              <p className="font-ui text-xs text-fg-muted uppercase tracking-wider text-center py-8 animate-pulse">Carregando…</p>
            ) : movs.length === 0 ? (
              <p className="font-body text-sm text-fg-muted text-center py-8">Nenhuma movimentação.</p>
            ) : (
              <div className="space-y-1.5">
                {movs.map(m => (
                  <div key={m.id} className="flex items-center gap-3 bg-surface border border-line rounded-card px-3 py-2.5">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${m.tipo === 'entrada' ? 'bg-entrada' : 'bg-saida'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-fg truncate">{m.descricao}</p>
                      <p className="font-body text-xs text-fg-muted">
                        {new Date(m.data + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        {m.origem === 'automatica' && ' · auto'}
                      </p>
                    </div>
                    <span className={`font-mono text-sm shrink-0 ${m.tipo === 'entrada' ? 'text-entrada' : 'text-saida'}`}>
                      {m.tipo === 'entrada' ? '+' : '-'} R$ {m.valor.toFixed(2)}
                    </span>
                    {m.origem === 'manual' && (
                      <button
                        onClick={() => deletarMov(m.id)}
                        className="w-7 h-7 flex items-center justify-center text-fg-muted hover:text-saida transition-colors shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB FIXAS ── */}
        {tab === 'fixas' && (
          <div className="space-y-4">
            <button
              onClick={() => setModalFixa(true)}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-line text-fg-muted font-ui text-xs uppercase tracking-wider py-3 rounded-card hover:border-amber hover:text-amber transition-colors"
            >
              <Plus size={14} /> Adicionar despesa fixa
            </button>

            {despesas.length === 0 ? (
              <p className="font-body text-sm text-fg-muted text-center py-8">Nenhuma despesa fixa cadastrada.</p>
            ) : (
              <div className="space-y-2">
                {despesas.map(d => (
                  <div key={d.id} className={`bg-surface border border-line rounded-card px-4 py-3 flex items-center gap-3 ${!d.ativa ? 'opacity-50' : ''}`}>
                    <button
                      onClick={() => toggleFixa(d.id, d.ativa)}
                      className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${d.ativa ? 'bg-amber' : 'bg-line'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-fg transition-transform ${d.ativa ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-fg truncate">{d.descricao}</p>
                      <p className="font-body text-xs text-fg-muted">Vence dia {d.dia_vencimento}</p>
                    </div>
                    <span className="font-mono text-sm text-saida shrink-0">R$ {d.valor.toFixed(2)}</span>
                    <button
                      onClick={() => deletarFixa(d.id)}
                      className="w-7 h-7 flex items-center justify-center text-fg-muted hover:text-saida transition-colors shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {despesas.filter(d => d.ativa).length > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-line">
                    <span className="font-ui text-xs uppercase tracking-wider text-fg-muted">Total mensal fixo</span>
                    <span className="font-mono text-sm text-saida">
                      R$ {despesas.filter(d => d.ativa).reduce((s, d) => s + d.valor, 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal nova movimentação */}
      {modalMov && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setModalMov(false); setNovoErro('') }} />
          <div className="relative w-full max-w-md bg-surface rounded-t-card border border-line p-6 z-10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-ui text-lg uppercase tracking-wider text-fg">Movimentação</h2>
              <button onClick={() => { setModalMov(false); setNovoErro('') }}><X size={18} className="text-fg-muted" /></button>
            </div>

            <div className="flex rounded-button border border-line overflow-hidden">
              <button
                type="button"
                onClick={() => setNovoTipo('entrada')}
                className={`flex-1 py-2.5 font-ui text-xs uppercase tracking-wider transition-colors ${novoTipo === 'entrada' ? 'bg-entrada text-white' : 'text-fg-muted hover:text-fg'}`}
              >
                + Entrada
              </button>
              <button
                type="button"
                onClick={() => setNovoTipo('saida')}
                className={`flex-1 py-2.5 font-ui text-xs uppercase tracking-wider transition-colors ${novoTipo === 'saida' ? 'bg-saida text-white' : 'text-fg-muted hover:text-fg'}`}
              >
                − Saída
              </button>
            </div>

            <form onSubmit={salvarMov} className="space-y-3">
              <div>
                <label className={labelCls}>Descrição</label>
                <input type="text" value={novoForm.descricao} onChange={e => setNovoForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Produto, Aluguel…" required className={inputCls} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelCls}>Valor (R$)</label>
                  <input type="number" value={novoForm.valor} onChange={e => setNovoForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" min="0.01" step="0.01" required className={inputCls} />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Data</label>
                  <input type="date" value={novoForm.data} onChange={e => setNovoForm(f => ({ ...f, data: e.target.value }))} required className={inputCls} />
                </div>
              </div>
              {novoErro && <p className="font-body text-sm text-saida">{novoErro}</p>}
              <button type="submit" disabled={novoSalvando} className="w-full bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm uppercase tracking-wider py-3 rounded-button transition-colors disabled:opacity-50">
                {novoSalvando ? 'Salvando…' : 'Salvar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal nova despesa fixa */}
      {modalFixa && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setModalFixa(false); setFixaErro('') }} />
          <div className="relative w-full max-w-md bg-surface rounded-t-card border border-line p-6 z-10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-ui text-lg uppercase tracking-wider text-fg">Despesa fixa</h2>
              <button onClick={() => { setModalFixa(false); setFixaErro('') }}><X size={18} className="text-fg-muted" /></button>
            </div>
            <form onSubmit={salvarFixa} className="space-y-3">
              <div>
                <label className={labelCls}>Descrição</label>
                <input type="text" value={fixaForm.descricao} onChange={e => setFixaForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Aluguel, Energia…" required className={inputCls} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelCls}>Valor (R$)</label>
                  <input type="number" value={fixaForm.valor} onChange={e => setFixaForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" min="0.01" step="0.01" required className={inputCls} />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Vence dia</label>
                  <input type="number" value={fixaForm.dia_vencimento} onChange={e => setFixaForm(f => ({ ...f, dia_vencimento: e.target.value }))} min="1" max="28" required className={inputCls} />
                </div>
              </div>
              {fixaErro && <p className="font-body text-sm text-saida">{fixaErro}</p>}
              <button type="submit" disabled={fixaSalvando} className="w-full bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm uppercase tracking-wider py-3 rounded-button transition-colors disabled:opacity-50">
                {fixaSalvando ? 'Salvando…' : 'Salvar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
