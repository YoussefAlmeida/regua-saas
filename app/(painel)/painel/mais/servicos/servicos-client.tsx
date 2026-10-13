'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Clock, Check, X } from 'lucide-react'
import { formatBRL } from '@/lib/utils'

interface Servico {
  id: string
  nome: string
  preco: number
  duracao_min: number
  cor: string
  ativo: boolean
}

interface FormData { nome: string; preco: string; duracao_min: string; cor: string }

const CORES = ['#E8B04B', '#4FB477', '#E2564D', '#6BA3D6', '#A1A1A8', '#C27BDB']
const FORM_VAZIO: FormData = { nome: '', preco: '', duracao_min: '30', cor: '#E8B04B' }

export default function ServicosClient({
  servicosIniciais,
}: {
  servicosIniciais: Servico[]
  barbearia_id: string
}) {
  const [servicos, setServicos] = useState(servicosIniciais)
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null)
  const [editando, setEditando] = useState<Servico | null>(null)
  const [form, setForm] = useState<FormData>(FORM_VAZIO)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  function abrirNovo() {
    setForm(FORM_VAZIO)
    setEditando(null)
    setErro('')
    setModal('novo')
  }

  function abrirEditar(s: Servico) {
    setForm({ nome: s.nome, preco: String(s.preco), duracao_min: String(s.duracao_min), cor: s.cor })
    setEditando(s)
    setErro('')
    setModal('editar')
  }

  function fechar() { setModal(null); setErro('') }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    const preco = parseFloat(form.preco)
    const duracao_min = parseInt(form.duracao_min)
    if (isNaN(preco) || preco < 0) { setErro('Preço inválido'); setSalvando(false); return }
    if (isNaN(duracao_min) || duracao_min < 5) { setErro('Duração mínima: 5 min'); setSalvando(false); return }

    const payload = { nome: form.nome.trim(), preco, duracao_min, cor: form.cor }

    let res: Response
    if (editando) {
      res = await fetch(`/api/painel/servicos/${editando.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      res = await fetch('/api/painel/servicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    const json = await res.json()
    setSalvando(false)

    if (!res.ok) { setErro(json.erro || 'Erro ao salvar'); return }

    if (editando) {
      setServicos(s => s.map(x => x.id === editando.id ? json : x))
    } else {
      setServicos(s => [...s, json].sort((a, b) => a.nome.localeCompare(b.nome)))
    }
    fechar()
  }

  async function toggleAtivo(s: Servico) {
    const res = await fetch(`/api/painel/servicos/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !s.ativo }),
    })
    if (res.ok) {
      const json = await res.json()
      setServicos(prev => prev.map(x => x.id === s.id ? json : x))
    }
  }

  async function deletar(s: Servico) {
    if (!confirm(`Deletar "${s.nome}"? Esta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/painel/servicos/${s.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) { alert(json.erro); return }
    setServicos(prev => prev.filter(x => x.id !== s.id))
  }

  const inputCls = 'w-full bg-bg border border-line rounded-button px-4 py-2.5 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber'
  const labelCls = 'font-ui text-xs uppercase tracking-wider text-fg-muted block mb-1'

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-ui text-xl uppercase tracking-widest text-fg">Serviços</h1>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 bg-amber hover:bg-accent-press text-accent-fg font-ui text-xs uppercase tracking-wider px-4 py-2 rounded-button transition-colors"
        >
          <Plus size={14} />
          Adicionar
        </button>
      </div>

      {servicos.length === 0 ? (
        <div className="text-center py-16 text-fg-muted">
          <Scissors size={40} className="mx-auto mb-3 opacity-30" strokeWidth={1} />
          <p className="font-ui text-sm uppercase tracking-wider">Nenhum serviço cadastrado</p>
          <button onClick={abrirNovo} className="mt-4 text-amber font-body text-sm hover:underline">
            Adicionar primeiro serviço
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {servicos.map(s => (
            <div
              key={s.id}
              className={`bg-surface rounded-card border px-4 py-4 flex items-center gap-3 transition-opacity ${
                s.ativo ? 'border-line' : 'border-line opacity-50'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: s.cor }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-ui text-sm uppercase tracking-wider text-fg truncate">{s.nome}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="font-mono text-sm text-amber">{formatBRL(s.preco)}</span>
                  <span className="flex items-center gap-1 font-body text-xs text-fg-muted">
                    <Clock size={11} />
                    {s.duracao_min} min
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleAtivo(s)}
                  title={s.ativo ? 'Desativar' : 'Ativar'}
                  className={`w-8 h-8 rounded-button flex items-center justify-center transition-colors ${
                    s.ativo ? 'text-entrada hover:bg-entrada/10' : 'text-fg-muted hover:bg-surface-alt'
                  }`}
                >
                  {s.ativo ? <Check size={14} /> : <X size={14} />}
                </button>
                <button
                  onClick={() => abrirEditar(s)}
                  className="w-8 h-8 rounded-button flex items-center justify-center text-fg-muted hover:text-fg hover:bg-surface-alt transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => deletar(s)}
                  className="w-8 h-8 rounded-button flex items-center justify-center text-fg-muted hover:text-saida hover:bg-saida/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={fechar} />
          <div className="relative w-full sm:max-w-md bg-surface rounded-t-card sm:rounded-card border border-line p-6 z-10">
            <h2 className="font-ui text-lg uppercase tracking-wider text-fg mb-5">
              {modal === 'novo' ? 'Novo serviço' : 'Editar serviço'}
            </h2>

            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className={labelCls}>Nome</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Corte simples"
                  required
                  className={inputCls}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelCls}>Preço (R$)</label>
                  <input
                    type="number"
                    value={form.preco}
                    onChange={e => setForm(f => ({ ...f, preco: e.target.value }))}
                    placeholder="35.00"
                    min="0"
                    step="0.50"
                    required
                    className={inputCls}
                  />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Duração (min)</label>
                  <input
                    type="number"
                    value={form.duracao_min}
                    onChange={e => setForm(f => ({ ...f, duracao_min: e.target.value }))}
                    placeholder="30"
                    min="5"
                    step="5"
                    required
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Cor na agenda</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {CORES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, cor: c }))}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        form.cor === c ? 'border-fg scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {erro && <p className="font-body text-sm text-saida">{erro}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={fechar}
                  className="flex-1 border border-line text-fg-muted font-ui text-sm uppercase tracking-wider py-2.5 rounded-button hover:border-fg/30 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm uppercase tracking-wider py-2.5 rounded-button transition-colors disabled:opacity-50"
                >
                  {salvando ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Scissors({ size, className, strokeWidth }: { size: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  )
}
