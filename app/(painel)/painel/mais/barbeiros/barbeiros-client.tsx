'use client'

import { useState } from 'react'
import { Copy, Check, UserMinus, UserCheck, Clock } from 'lucide-react'

interface Barbeiro {
  id: string
  nome: string
  whatsapp: string | null
  status: 'pendente' | 'aprovado'
  ativo: boolean
  criado_em: string
}

export default function BarbeirosClient({ barbeirosIniciais }: { barbeirosIniciais: Barbeiro[] }) {
  const [barbeiros, setBarbeiros] = useState(barbeirosIniciais)
  const [linkConvite, setLinkConvite] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [gerandoLink, setGerandoLink] = useState(false)

  const pendentes = barbeiros.filter(b => b.status === 'pendente')
  const ativos = barbeiros.filter(b => b.status === 'aprovado' && b.ativo)
  const inativos = barbeiros.filter(b => b.status === 'aprovado' && !b.ativo)

  async function gerarLink() {
    setGerandoLink(true)
    const res = await fetch('/api/painel/equipe', { method: 'POST' })
    const json = await res.json()
    setGerandoLink(false)
    if (res.ok) setLinkConvite(json.link)
  }

  async function copiar() {
    await navigator.clipboard.writeText(linkConvite)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function aprovar(id: string) {
    const res = await fetch(`/api/painel/equipe/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'aprovado' }),
    })
    if (res.ok) {
      setBarbeiros(prev => prev.map(b => b.id === id ? { ...b, status: 'aprovado' } : b))
    }
  }

  async function rejeitar(id: string) {
    if (!confirm('Rejeitar este barbeiro?')) return
    const res = await fetch(`/api/painel/equipe/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: false }),
    })
    if (res.ok) {
      setBarbeiros(prev => prev.filter(b => b.id !== id))
    }
  }

  async function remover(id: string, nome: string) {
    if (!confirm(`Remover ${nome} da equipe?`)) return
    const res = await fetch(`/api/painel/equipe/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setBarbeiros(prev => prev.filter(b => b.id !== id))
    }
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-ui text-xl uppercase tracking-widest text-fg">Equipe</h1>
        <button
          onClick={gerarLink}
          disabled={gerandoLink}
          className="flex items-center gap-2 bg-amber hover:bg-accent-press text-accent-fg font-ui text-xs uppercase tracking-wider px-4 py-2 rounded-button transition-colors disabled:opacity-50"
        >
          {gerandoLink ? 'Gerando…' : 'Convidar barbeiro'}
        </button>
      </div>

      {/* Link de convite */}
      {linkConvite && (
        <div className="bg-surface border border-amber/30 rounded-card p-4 space-y-2">
          <p className="font-ui text-xs uppercase tracking-wider text-amber">Link de convite (7 dias)</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={linkConvite}
              className="flex-1 bg-bg border border-line rounded-button px-3 py-2 font-mono text-xs text-fg-muted truncate"
            />
            <button
              onClick={copiar}
              className="px-3 py-2 bg-amber hover:bg-accent-press text-accent-fg rounded-button transition-colors"
            >
              {copiado ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <p className="font-body text-xs text-fg-muted">Envie este link pelo WhatsApp para o barbeiro se cadastrar.</p>
        </div>
      )}

      {/* Pendentes */}
      {pendentes.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-amber" />
            <h2 className="font-ui text-sm uppercase tracking-wider text-fg-muted">
              Aguardando aprovação ({pendentes.length})
            </h2>
          </div>
          <div className="space-y-2">
            {pendentes.map(b => (
              <div key={b.id} className="bg-surface border border-amber/20 rounded-card px-4 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-alt flex items-center justify-center font-ui text-sm text-fg-muted uppercase shrink-0">
                  {b.nome.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-ui text-sm uppercase tracking-wider text-fg truncate">{b.nome}</p>
                  {b.whatsapp && (
                    <p className="font-body text-xs text-fg-muted">{b.whatsapp}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => rejeitar(b.id)}
                    className="w-8 h-8 rounded-button flex items-center justify-center text-saida hover:bg-saida/10 transition-colors"
                    title="Rejeitar"
                  >
                    <UserMinus size={14} />
                  </button>
                  <button
                    onClick={() => aprovar(b.id)}
                    className="w-8 h-8 rounded-button flex items-center justify-center text-entrada hover:bg-entrada/10 transition-colors"
                    title="Aprovar"
                  >
                    <UserCheck size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ativos */}
      {ativos.length > 0 && (
        <section>
          <h2 className="font-ui text-sm uppercase tracking-wider text-fg-muted mb-3">
            Equipe ativa ({ativos.length})
          </h2>
          <div className="space-y-2">
            {ativos.map(b => (
              <div key={b.id} className="bg-surface border border-line rounded-card px-4 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-alt flex items-center justify-center font-ui text-sm text-fg-muted uppercase shrink-0">
                  {b.nome.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-ui text-sm uppercase tracking-wider text-fg truncate">{b.nome}</p>
                  {b.whatsapp && <p className="font-body text-xs text-fg-muted">{b.whatsapp}</p>}
                </div>
                <button
                  onClick={() => remover(b.id, b.nome)}
                  className="w-8 h-8 rounded-button flex items-center justify-center text-fg-muted hover:text-saida hover:bg-saida/10 transition-colors shrink-0"
                  title="Remover"
                >
                  <UserMinus size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Inativos */}
      {inativos.length > 0 && (
        <section>
          <h2 className="font-ui text-sm uppercase tracking-wider text-fg-muted mb-3 opacity-50">
            Inativos ({inativos.length})
          </h2>
          <div className="space-y-2 opacity-50">
            {inativos.map(b => (
              <div key={b.id} className="bg-surface border border-line rounded-card px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-alt flex items-center justify-center font-ui text-xs text-fg-muted uppercase shrink-0">
                  {b.nome.charAt(0)}
                </div>
                <p className="font-ui text-sm uppercase tracking-wider text-fg-muted truncate">{b.nome}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {barbeiros.length === 0 && !linkConvite && (
        <div className="text-center py-16 text-fg-muted">
          <p className="font-ui text-sm uppercase tracking-wider mb-4">Nenhum barbeiro na equipe</p>
          <button onClick={gerarLink} className="text-amber font-body text-sm hover:underline">
            Gerar link de convite
          </button>
        </div>
      )}
    </div>
  )
}
