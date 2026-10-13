'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, MessageCircle, LogOut, CalendarX } from 'lucide-react'
import { clientePodeCancelar } from '@/lib/cancelamento'

type Status = 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'faltou'

export interface MeuAgendamento {
  id: string
  inicio: string
  fim: string
  status: Status
  valor_servico: number
  cancelado_por: string | null
  profissional: { nome: string } | null
  servico: { nome: string; duracao_min: number } | null
}

const ROTULO: Record<Status, { t: string; cls: string }> = {
  agendado:   { t: 'Marcado',    cls: 'text-amber' },
  confirmado: { t: 'Confirmado', cls: 'text-entrada' },
  concluido:  { t: 'Feito',      cls: 'text-fg-muted' },
  cancelado:  { t: 'Cancelado',  cls: 'text-saida' },
  faltou:     { t: 'Faltou',     cls: 'text-fg-muted' },
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const quando = (iso: string) => {
  const d = new Date(iso)
  return {
    dia: d.toLocaleDateString('pt-BR', { timeZone: 'America/Bahia', weekday: 'long', day: '2-digit', month: 'long' }),
    hora: d.toLocaleTimeString('pt-BR', { timeZone: 'America/Bahia', hour: '2-digit', minute: '2-digit' }),
    curto: d.toLocaleDateString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: 'short', year: '2-digit' }),
  }
}
const waLink = (tel: string, txt: string) => {
  const d = tel.replace(/\D/g, '')
  return `https://wa.me/${d.startsWith('55') ? d : `55${d}`}?text=${encodeURIComponent(txt)}`
}

export default function MeusAgendamentos({
  barbearia,
  nome,
  agendamentosIniciais,
}: {
  barbearia: { nome: string; slug: string; telefone: string | null }
  nome: string | null
  agendamentosIniciais: MeuAgendamento[]
}) {
  const router = useRouter()
  const [ags, setAgs] = useState(agendamentosIniciais)
  const [cancelando, setCancelando] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null)

  // login
  const [whatsapp, setWhatsapp] = useState('')
  const [senha, setSenha] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [erroLogin, setErroLogin] = useState('')

  const agora = Date.now()
  const proximos = ags
    .filter(a => (a.status === 'agendado' || a.status === 'confirmado') && new Date(a.fim).getTime() > agora)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
  const historico = ags.filter(a => !proximos.includes(a))

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErroLogin('')
    setEntrando(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'cliente', whatsapp, senha, slug: barbearia.slug }),
    }).catch(() => null)
    setEntrando(false)
    if (!res) { setErroLogin('Sem conexão. Tenta de novo.'); return }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setErroLogin(json.erro ?? 'Não deu pra entrar'); return }
    if (json.papel !== 'cliente') { router.push(json.destino ?? '/painel/hoje'); return }
    if (json.destino && json.destino !== `/${barbearia.slug}/meus-agendamentos`) { router.push(json.destino); return }
    router.refresh()
  }

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    router.refresh()
  }

  async function cancelar(a: MeuAgendamento) {
    if (!confirm(`Cancelar ${a.servico?.nome ?? 'o horário'} de ${quando(a.inicio).dia} às ${quando(a.inicio).hora}?`)) return
    setCancelando(a.id)
    setMsg(null)
    const res = await fetch(`/api/cliente/agendamentos/${a.id}/cancelar`, { method: 'POST' }).catch(() => null)
    setCancelando(null)
    if (!res) { setMsg({ t: 'Sem conexão. Tenta de novo.', erro: true }); return }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg({ t: json.erro ?? 'Não deu pra cancelar', erro: true }); return }
    setAgs(prev => prev.map(x => x.id === a.id ? { ...x, status: 'cancelado', cancelado_por: 'cliente' } : x))
    setMsg({ t: 'Cancelado. A barbearia já foi avisada.' })
  }

  const inputCls = 'w-full bg-surface-alt border border-line rounded-button px-4 py-3 font-body text-base text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber'
  const labelCls = 'font-ui text-xs uppercase tracking-wider text-fg-muted block mb-1'

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-surface border-b border-line px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href={`/${barbearia.slug}`} className="-ml-1 p-1 text-fg-muted hover:text-fg" aria-label="Voltar">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-display text-xl text-amber tracking-wide uppercase leading-tight line-clamp-2 break-words">{barbearia.nome}</p>
            <p className="font-ui text-[11px] uppercase tracking-wider text-fg-muted">Meus horários</p>
          </div>
          {nome && (
            <button onClick={sair} className="flex items-center gap-1 font-ui text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg">
              <LogOut size={13} /> Sair
            </button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-16 space-y-8">
        {!nome ? (
          <section>
            <h1 className="font-ui text-lg uppercase tracking-wider text-fg mb-1">Entrar</h1>
            <p className="font-body text-sm text-fg-muted mb-5">Use o WhatsApp e a senha que você criou ao agendar.</p>
            <form onSubmit={entrar} className="bg-surface border border-line rounded-card p-5 space-y-4">
              <div>
                <label className={labelCls} htmlFor="wa">WhatsApp com DDD</label>
                <input id="wa" type="tel" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(75) 99999-0000" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="senha">Senha</label>
                <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} required className={inputCls} />
              </div>
              {erroLogin && <p className="font-body text-sm text-saida" role="alert">{erroLogin}</p>}
              <button type="submit" disabled={entrando} className="w-full bg-amber hover:bg-accent-press text-accent-fg font-ui uppercase tracking-wider text-sm py-3 rounded-button transition-colors disabled:opacity-50">
                {entrando ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
            <p className="font-body text-sm text-fg-muted text-center mt-6">
              Nunca agendou pelo link?{' '}
              <Link href={`/${barbearia.slug}`} className="text-amber hover:underline">Marcar meu primeiro horário</Link>
            </p>
            {barbearia.telefone && (
              <p className="font-body text-xs text-fg-muted text-center mt-3">
                Esqueceu a senha?{' '}
                <a href={waLink(barbearia.telefone, 'Oi! Esqueci minha senha do agendamento.')} className="text-amber hover:underline">Fala com a barbearia</a>
              </p>
            )}
          </section>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h1 className="font-ui text-lg uppercase tracking-wider text-fg">Oi, {nome.split(' ')[0]}</h1>
              <Link href={`/${barbearia.slug}`} className="flex items-center gap-1.5 bg-amber hover:bg-accent-press text-accent-fg font-ui text-xs uppercase tracking-wider px-4 py-2 rounded-button transition-colors">
                <Plus size={13} /> Marcar
              </Link>
            </div>

            {msg && (
              <p role="status" className={`font-body text-sm rounded-button px-4 py-3 border ${msg.erro ? 'text-saida border-saida/30 bg-saida/5' : 'text-entrada border-entrada/30 bg-entrada/5'}`}>
                {msg.t}
              </p>
            )}

            <section className="space-y-3">
              <h2 className="font-ui text-sm uppercase tracking-wider text-fg-muted">Próximos</h2>
              {proximos.length === 0 ? (
                <div className="text-center py-10 bg-surface border border-line rounded-card">
                  <CalendarX size={28} strokeWidth={1.5} className="mx-auto text-fg-muted opacity-50 mb-2" />
                  <p className="font-body text-sm text-fg-muted">Nenhum horário marcado.</p>
                </div>
              ) : proximos.map(a => {
                const q = quando(a.inicio)
                const podeCancelar = clientePodeCancelar(a.inicio, a.status)
                return (
                  <article key={a.id} className="bg-surface border border-amber/30 rounded-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-body text-sm text-fg first-letter:uppercase">{q.dia}</p>
                        <p className="font-mono text-3xl text-amber leading-tight">{q.hora}</p>
                        <p className="font-body text-sm text-fg-muted mt-1">{a.servico?.nome} · {a.profissional?.nome}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-ui text-[10px] uppercase tracking-wider ${ROTULO[a.status].cls}`}>{ROTULO[a.status].t}</span>
                        <p className="font-mono text-sm text-fg mt-1">{brl(a.valor_servico)}</p>
                      </div>
                    </div>
                    {podeCancelar ? (
                      <button
                        onClick={() => cancelar(a)}
                        disabled={cancelando === a.id}
                        className="w-full border border-saida/30 text-saida hover:bg-saida/5 font-ui text-xs uppercase tracking-wider py-2.5 rounded-button transition-colors disabled:opacity-50"
                      >
                        {cancelando === a.id ? 'Cancelando…' : 'Cancelar horário'}
                      </button>
                    ) : (
                      <p className="font-body text-xs text-fg-muted">
                        Falta menos de 1 hora — pra desmarcar agora,{' '}
                        {barbearia.telefone
                          ? <a className="text-amber hover:underline" href={waLink(barbearia.telefone, `Oi! Não vou conseguir ir no horário das ${q.hora}.`)}>avisa a barbearia</a>
                          : 'avisa a barbearia'}.
                      </p>
                    )}
                  </article>
                )
              })}
            </section>

            {historico.length > 0 && (
              <section className="space-y-2">
                <h2 className="font-ui text-sm uppercase tracking-wider text-fg-muted">Histórico</h2>
                <ul className="bg-surface border border-line rounded-card divide-y divide-line">
                  {historico.map(a => {
                    const q = quando(a.inicio)
                    return (
                      <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm text-fg truncate">{a.servico?.nome} · {a.profissional?.nome}</p>
                          <p className="font-body text-xs text-fg-muted">{q.curto} · {q.hora}</p>
                        </div>
                        <span className={`font-ui text-[10px] uppercase tracking-wider ${ROTULO[a.status].cls}`}>{ROTULO[a.status].t}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {barbearia.telefone && (
              <a href={waLink(barbearia.telefone, 'Oi!')} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 font-body text-xs text-fg-muted hover:text-fg">
                <MessageCircle size={13} /> Falar com a barbearia
              </a>
            )}
          </>
        )}
      </main>
    </div>
  )
}
