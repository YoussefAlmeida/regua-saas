'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarPlus, Navigation, RotateCcw, CalendarX2 } from 'lucide-react'
import { clientePodeCancelar } from '@/lib/cancelamento'
import NavCliente from '@/components/cliente/nav-cliente'

/* Meus horários: o próximo em destaque (cancelar, como chegar) e o
   histórico, com "Marcar de novo" pra repetir serviço e profissional. */

export interface MeuAgendamento {
  id: string
  inicio: string
  fim: string
  status: 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'faltou'
  valor_servico: number
  cancelado_por: string | null
  servico_id?: string
  profissional_id?: string
  profissional: { nome: string } | { nome: string }[] | null
  servico: { nome: string; duracao_min: number } | { nome: string; duracao_min: number }[] | null
}

const um = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)
const quando = (iso: string) => {
  const d = new Date(iso)
  return {
    semana: d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Bahia' }).replace('.', ''),
    dia: d.toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'America/Bahia' }),
    data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Bahia' }).replace('.', ''),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' }),
  }
}
const ROTULO: Record<string, { t: string; c: string }> = {
  concluido: { t: 'Feito', c: 'bg-entrada/10 text-entrada' },
  cancelado: { t: 'Cancelado', c: 'bg-surface-alt text-fg-muted' },
  faltou: { t: 'Não compareceu', c: 'bg-saida/10 text-saida' },
}

export default function MeusAgendamentos({ barbearia, nome, agendamentosIniciais }: {
  barbearia: { nome: string; slug: string; telefone: string | null; endereco?: string | null }
  nome: string | null
  agendamentosIniciais: MeuAgendamento[]
}) {
  const router = useRouter()
  const [ags, setAgs] = useState(agendamentosIniciais)
  const [whatsapp, setWhatsapp] = useState('')
  const [senha, setSenha] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmar, setConfirmar] = useState<MeuAgendamento | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null)

  const agora = Date.now()
  const proximos = ags.filter(a => (a.status === 'agendado' || a.status === 'confirmado') && new Date(a.fim).getTime() > agora)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
  const historico = ags.filter(a => !proximos.includes(a))
  const mapa = barbearia.endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${barbearia.nome} ${barbearia.endereco}`)}` : null
  const denovo = (a: MeuAgendamento) => `/${barbearia.slug}?${new URLSearchParams({ ...(a.servico_id ? { servico: a.servico_id } : {}), ...(a.profissional_id ? { profissional: a.profissional_id } : {}) })}`

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro(''); setEntrando(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'cliente', whatsapp, senha, slug: barbearia.slug }),
    }).catch(() => null)
    setEntrando(false)
    if (!res) { setErro('Sem conexão. Tenta de novo.'); return }
    if (!res.ok) { setErro((await res.json().catch(() => ({}))).erro ?? 'WhatsApp ou senha incorretos'); return }
    router.refresh()
  }

  async function cancelar() {
    if (!confirmar) return
    setCancelando(true); setMsg(null)
    const res = await fetch(`/api/cliente/agendamentos/${confirmar.id}/cancelar`, { method: 'POST' }).catch(() => null)
    setCancelando(false)
    const alvo = confirmar
    setConfirmar(null)
    if (!res) { setMsg({ t: 'Sem conexão. Tenta de novo.', erro: true }); return }
    if (!res.ok) { setMsg({ t: (await res.json().catch(() => ({}))).erro ?? 'Não deu pra cancelar', erro: true }); return }
    setAgs(prev => prev.map(x => x.id === alvo.id ? { ...x, status: 'cancelado', cancelado_por: 'cliente' } : x))
    setMsg({ t: 'Horário cancelado. Quer outro? Toca em Agendar.' })
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-28">
        <p className="ds-eyebrow">{barbearia.nome}</p>
        <h1 className="font-display text-2xl font-semibold text-fg mt-0.5">{nome ? `Olá, ${nome.split(' ')[0]}` : 'Meus horários'}</h1>

        {!nome ? (
          <form onSubmit={entrar} className="ds-card p-5 mt-6 space-y-4">
            <p className="font-body text-sm text-fg-muted">Entre com o WhatsApp e a senha que você criou ao marcar o primeiro horário.</p>
            <div>
              <label className="ds-label" htmlFor="wa">WhatsApp com DDD</label>
              <input id="wa" type="tel" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required placeholder="(75) 99999-0000" className="ds-input !text-base" />
            </div>
            <div>
              <label className="ds-label" htmlFor="senha">Senha</label>
              <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} required className="ds-input !text-base" />
            </div>
            {erro && <p className="font-body text-sm text-saida" role="alert">{erro}</p>}
            <button type="submit" disabled={entrando} className="ds-btn-primary w-full">{entrando ? 'Entrando…' : 'Entrar'}</button>
            <div className="flex justify-between font-body text-xs">
              <Link href={`/recuperar-senha?b=${barbearia.slug}`} className="text-fg-muted underline underline-offset-2 hover:text-fg">Esqueci minha senha</Link>
              <Link href={`/${barbearia.slug}`} className="text-amber">Primeira vez? Marcar horário</Link>
            </div>
          </form>
        ) : (
          <>
            {msg && <p className={`mt-4 ds-card px-4 py-3 font-body text-sm ${msg.erro ? 'text-saida border-saida/40' : 'text-fg'}`} role="status">{msg.t}</p>}

            <h2 className="ds-eyebrow mt-7 mb-2">{proximos.length > 1 ? 'Próximos' : 'Próximo'}</h2>
            {proximos.length === 0 ? (
              <div className="ds-card p-6 text-center ds-grade">
                <CalendarX2 size={28} className="mx-auto text-fg-muted" strokeWidth={1.5} aria-hidden />
                <p className="font-display font-semibold text-fg mt-3">Nenhum horário marcado</p>
                <p className="font-body text-sm text-fg-muted mt-1">Leva menos de um minuto.</p>
                <Link href={`/${barbearia.slug}`} className="ds-btn-primary mt-4"><CalendarPlus size={15} aria-hidden /> Marcar horário</Link>
              </div>
            ) : proximos.map((a, i) => {
              const q = quando(a.inicio), pode = clientePodeCancelar(a.inicio, a.status)
              return (
                <article key={a.id} className={`ds-card p-4 mb-2 ${i === 0 ? 'border-amber' : ''}`}>
                  <div className="flex gap-3.5">
                    <div className="w-12 text-center shrink-0">
                      <p className="font-body text-[10px] font-semibold uppercase tracking-wider text-amber">{q.semana}</p>
                      <p className="font-display text-2xl font-semibold text-fg leading-none tabular-nums mt-0.5">{q.dia}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-[15px] font-semibold text-fg truncate">{um(a.servico)?.nome ?? 'Atendimento'}</p>
                      <p className="font-body text-xs text-fg-muted">{q.hora} · com {um(a.profissional)?.nome ?? 'a equipe'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3.5">
                    {pode
                      ? <button onClick={() => setConfirmar(a)} className="ds-btn-secondary flex-1 !min-h-[38px] text-xs">Cancelar</button>
                      : <span className="flex-1 font-body text-xs text-fg-muted self-center">Falta menos de 1h: pra cancelar, fala com a barbearia.</span>}
                    {mapa && <a href={mapa} target="_blank" rel="noopener noreferrer" className="ds-btn-secondary flex-1 !min-h-[38px] text-xs"><Navigation size={13} aria-hidden /> Como chegar</a>}
                  </div>
                </article>
              )
            })}

            {historico.length > 0 && (
              <>
                <h2 className="ds-eyebrow mt-7 mb-2">Histórico</h2>
                <ul className="space-y-2">
                  {historico.map(a => {
                    const r = ROTULO[a.status] ?? ROTULO.cancelado
                    return (
                      <li key={a.id} className="ds-card p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-sm font-semibold text-fg truncate">{um(a.servico)?.nome ?? 'Atendimento'}</p>
                          <p className="font-body text-xs text-fg-muted truncate">{quando(a.inicio).data} · {um(a.profissional)?.nome ?? ''}</p>
                          <span className={`ds-tag mt-1.5 ${r.c}`}>{r.t}</span>
                        </div>
                        {a.servico_id && (
                          <Link href={denovo(a)} className="ds-tag border border-line text-fg hover:border-amber hover:text-amber !py-1.5 !px-2.5 shrink-0 transition-colors">
                            <RotateCcw size={11} aria-hidden /> Marcar de novo
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      {/* Confirmação de cancelamento (no lugar do aviso do navegador) */}
      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal aria-labelledby="t-cancelar">
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirmar(null)} />
          <div className="relative w-full max-w-md bg-surface border border-line rounded-t-2xl sm:rounded-card p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-200">
            <h2 id="t-cancelar" className="font-display text-lg font-semibold text-fg">Cancelar esse horário?</h2>
            <p className="font-body text-sm text-fg-muted">
              {um(confirmar.servico)?.nome} em {quando(confirmar.inicio).data} às {quando(confirmar.inicio).hora}. O horário volta a ficar livre pra outra pessoa.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmar(null)} className="ds-btn-secondary flex-1">Manter</button>
              <button onClick={cancelar} disabled={cancelando} className="ds-btn-danger flex-1">{cancelando ? 'Cancelando…' : 'Cancelar horário'}</button>
            </div>
          </div>
        </div>
      )}

      <NavCliente slug={barbearia.slug} ativo="horarios" />
    </div>
  )
}
