'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, Check, UserMinus, UserCheck, Clock, MessageCircle, BarChart3, RotateCcw } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'
import { pedirSenha } from '@/components/confirmar-senha'
import LinkNovaSenha from '@/components/link-nova-senha'
import AvisarCancelados, { type Cancelado } from '@/components/avisar-cancelados'
import ListaAgenda from '@/components/lista-agenda'

interface Barbeiro {
  id: string
  nome: string
  whatsapp: string | null
  status: 'pendente' | 'aprovado'
  ativo: boolean
  criado_em: string
  profissionais?: { id: string; ativo: boolean }[] | null
}

export default function BarbeirosClient({ barbeirosIniciais, dono, max }: {
  barbeirosIniciais: Barbeiro[]
  dono: { nome: string; naAgenda: boolean }
  max: number | null
}) {
  const router = useRouter()
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
    const json = await res.json()
    setBarbeiros(prev => prev.map(b => b.id === id ? { ...b, status: 'aprovado', ativo: true } : b))
    avisar(json.foraDaAgenda
      ? 'Aprovado, mas seu plano já está cheio: ele entrou na equipe fora da agenda. Troque alguém em "Na agenda" ou mude de plano.'
      : 'Aprovado. Ele já pode entrar e montar o horário dele.', json.foraDaAgenda ? 'info' : 'sucesso')
    router.refresh()
  }

  async function reativar(id: string) {
    const res = await fetch(`/api/painel/equipe/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'aprovado', ativo: true }),
    })
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    const json = await res.json()
    setBarbeiros(prev => prev.map(b => b.id === id ? { ...b, status: 'aprovado', ativo: true } : b))
    avisar(json.foraDaAgenda ? 'De volta na equipe, fora da agenda: seu plano já está cheio.' : 'Barbeiro de volta na equipe.', 'sucesso')
    router.refresh()
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
    const senha = await pedirSenha(`Remover ${nome} da equipe`, 'Ele perde o acesso na hora e os horários futuros dele são cancelados. O histórico fica guardado.')
    if (!senha) return
    const res = await fetch(`/api/painel/equipe/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    })
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    const json = await res.json()
    setBarbeiros(prev => prev.map(b => b.id === id ? { ...b, ativo: false } : b))
    if (json.cancelados?.length) setCancelados({ nome, lista: json.cancelados })
    else avisar(`${nome} saiu da equipe.`, 'sucesso')
    router.refresh()
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

      {/* Quem aparece na agenda (liga/desliga) */}
      <section>
        <ListaAgenda
          key={ativos.map(b => b.id).join()}
          max={max}
          pessoas={[
            { alvo: 'eu', nome: dono.nome, naAgenda: dono.naAgenda, souEu: true },
            ...ativos.map(b => ({ alvo: b.id, nome: b.nome, naAgenda: !!b.profissionais?.[0]?.ativo, souEu: false })),
          ]}
        />
        <p className="font-body text-xs text-fg-muted mt-2">
          Desligado não aparece pros clientes, mas continua na equipe e com o histórico. Liga de novo quando quiser.
          {max !== null && ` Seu plano vai até ${max} na agenda.`}
        </p>
      </section>

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
            Na equipe ({ativos.length})
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
                  const pid = b.profissionais?.[0]?.id
                  return pid ? (
                    <Link href={`/painel/mais/desempenho?p=${pid}`} className="w-8 h-8 rounded-button flex items-center justify-center text-fg-muted hover:text-amber transition-colors shrink-0" title="Desempenho" aria-label={`Desempenho de ${b.nome}`}>
                      <BarChart3 size={14} />
                    </Link>
                  ) : null
                })()}
                <LinkNovaSenha endpoint="/api/painel/recuperacao" corpo={{ usuario_id: b.id }} nome={b.nome} compacto />
                <button
                  onClick={() => remover(b.id, b.nome)}
                  className="w-8 h-8 rounded-button flex items-center justify-center text-fg-muted hover:text-saida hover:bg-saida/10 transition-colors shrink-0"
                  title="Remover da equipe"
                  aria-label={`Remover ${b.nome} da equipe`}
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
        <AvisarCancelados
          lista={cancelados.lista}
          texto={`${cancelados.nome} tinha ${cancelados.lista.length} horário${cancelados.lista.length > 1 ? 's' : ''} pela frente. Foram cancelados — manda uma mensagem pra remarcar com outro barbeiro.`}
          onFechar={() => setCancelados(null)}
        />
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
