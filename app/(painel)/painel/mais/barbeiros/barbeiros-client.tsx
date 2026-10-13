'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Check, UserMinus, UserCheck, Clock, MessageCircle, BarChart3, RotateCcw, X } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'
import ContatoCliente from '@/components/contato-cliente'

interface Cancelado {
  id: string
  inicio: string
  cliente: { nome: string; whatsapp: string | null } | { nome: string; whatsapp: string | null }[] | null
  servico: { nome: string } | { nome: string }[] | null
}
const um = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

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
  const [cancelados, setCancelados] = useState<{ nome: string; lista: Cancelado[] } | null>(null)

  const pendentes = barbeiros.filter(b => b.status === 'pendente')
  const ativos = barbeiros.filter(b => b.status === 'aprovado' && b.ativo)
  const inativos = barbeiros.filter(b => b.status === 'aprovado' && !b.ativo)

  async function gerarLink() {
    setGerandoLink(true)
    const res = await fetch('/api/painel/equipe', { method: 'POST' }).catch(() => null)
    setGerandoLink(false)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    const json = await res.json()
    setLinkConvite(json.link)
  }

  const textoConvite = `Fala! Te adicionei na equipe da barbearia no RÉGUA. Cria sua conta por esse link (vale 7 dias): ${linkConvite}`

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
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    setBarbeiros(prev => prev.map(b => b.id === id ? { ...b, status: 'aprovado', ativo: true } : b))
    avisar('Aprovado. Ele já pode entrar e montar o horário dele.', 'sucesso')
  }

  async function reativar(id: string) {
    const res = await fetch(`/api/painel/equipe/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'aprovado', ativo: true }),
    })
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    setBarbeiros(prev => prev.map(b => b.id === id ? { ...b, status: 'aprovado', ativo: true } : b))
    avisar('Barbeiro de volta na equipe.', 'sucesso')
  }

  async function rejeitar(id: string) {
    if (!confirm('Rejeitar este barbeiro?')) return
    const res = await fetch(`/api/painel/equipe/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: false }),
    })
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    setBarbeiros(prev => prev.filter(b => b.id !== id))
  }

  async function remover(id: string, nome: string) {
    if (!confirm(`Remover ${nome} da equipe?\n\nEle perde o acesso na hora e os horários futuros dele são cancelados. O histórico fica guardado.`)) return
    const res = await fetch(`/api/painel/equipe/${id}`, { method: 'DELETE' })
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    const json = await res.json()
    setBarbeiros(prev => prev.map(b => b.id === id ? { ...b, ativo: false } : b))
    if (json.cancelados?.length) setCancelados({ nome, lista: json.cancelados })
    else avisar(`${nome} saiu da equipe.`, 'sucesso')
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
          <a
            href={`https://wa.me/?text=${encodeURIComponent(textoConvite)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-entrada/10 border border-entrada/30 text-entrada font-ui text-xs uppercase tracking-wider py-2.5 rounded-button hover:bg-entrada/20 transition-colors"
          >
            <MessageCircle size={14} /> Enviar por WhatsApp
          </a>
          <p className="font-body text-xs text-fg-muted">Ele cria a conta pelo link e aparece aqui pra você aprovar.</p>
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
                {(() => {
                  const pid = (b as Barbeiro & { profissionais?: { id: string }[] }).profissionais?.[0]?.id
                  return pid ? (
                    <Link href={`/painel/mais/desempenho?p=${pid}`} className="w-8 h-8 rounded-button flex items-center justify-center text-fg-muted hover:text-amber transition-colors shrink-0" title="Desempenho" aria-label={`Desempenho de ${b.nome}`}>
                      <BarChart3 size={14} />
                    </Link>
                  ) : null
                })()}
                <button
                  onClick={() => remover(b.id, b.nome)}
                  className="w-8 h-8 rounded-button flex items-center justify-center text-fg-muted hover:text-saida hover:bg-saida/10 transition-colors shrink-0"
                  title="Remover"
                  aria-label={`Remover ${b.nome}`}
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
          <div className="space-y-2">
            {inativos.map(b => (
              <div key={b.id} className="bg-surface border border-line rounded-card px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-alt flex items-center justify-center font-ui text-xs text-fg-muted uppercase shrink-0 opacity-50">
                  {b.nome.charAt(0)}
                </div>
                <p className="flex-1 font-ui text-sm uppercase tracking-wider text-fg-muted truncate opacity-60">{b.nome}</p>
                <button onClick={() => reativar(b.id)} className="flex items-center gap-1 font-ui text-[11px] uppercase tracking-wider text-fg-muted hover:text-amber">
                  <RotateCcw size={12} /> Reativar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Clientes que tinham horário com o barbeiro removido */}
      {cancelados && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCancelados(null)} />
          <div className="relative w-full max-w-md bg-surface rounded-t-card border border-line p-6 z-10 max-h-[85dvh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-ui text-lg uppercase tracking-wider text-fg">Avise os clientes</h2>
              <button onClick={() => setCancelados(null)} className="text-fg-muted hover:text-fg" aria-label="Fechar"><X size={18} /></button>
            </div>
            <p className="font-body text-sm text-fg-muted">
              {cancelados.nome} tinha {cancelados.lista.length} horário{cancelados.lista.length > 1 ? 's' : ''} pela frente. Foram cancelados — manda uma mensagem pra remarcar com outro barbeiro.
            </p>
            <ul className="divide-y divide-line">
              {cancelados.lista.map(c => {
                const cli = um(c.cliente), srv = um(c.servico)
                const q = new Date(c.inicio).toLocaleString('pt-BR', { timeZone: 'America/Bahia', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                return (
                  <li key={c.id} className="py-3 space-y-2">
                    <p className="font-body text-sm text-fg">{cli?.nome ?? 'Cliente'} <span className="text-fg-muted">· {srv?.nome} · {q}</span></p>
                    <ContatoCliente
                      whatsapp={cli?.whatsapp}
                      mensagem={`Oi, ${cli?.nome?.split(' ')[0] ?? ''}! O ${cancelados.nome} não está mais com a gente. Seu horário de ${q} foi cancelado — quer remarcar com outro barbeiro?`}
                    />
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
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
