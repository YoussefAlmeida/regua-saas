'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarPlus, CalendarX2, Navigation, RotateCcw, Star, Scissors, Clock, CalendarDays, UserRound, X } from 'lucide-react'
import { clientePodeCancelar } from '@/lib/cancelamento'
import { formatBRL } from '@/lib/utils'
import NavCliente from '@/components/cliente/nav-cliente'
import TopoInterno from '@/components/cliente/topo-interno'

/* Meus Agendamentos: Próximos, Histórico e Cancelados. Cada cartão abre os
   detalhes; dali o cliente cancela (até 1h antes), vê como chegar, avalia
   ou marca de novo. Pra mudar o horário: cancela e marca outro. */

export interface MeuAgendamento {
  id: string
  inicio: string
  fim: string
  status: 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'faltou'
  valor_servico: number
  cancelado_por: string | null
  servico_id?: string
  profissional_id?: string
  foto?: string | null
  profissional: { nome: string } | { nome: string }[] | null
  servico: { nome: string; duracao_min: number } | { nome: string; duracao_min: number }[] | null
}

type Filtro = 'proximos' | 'historico' | 'cancelados'
const FILTROS: [Filtro, string][] = [['proximos', 'Próximos'], ['historico', 'Histórico'], ['cancelados', 'Cancelados']]
const VAZIO: Record<Filtro, { t: string; d: string }> = {
  proximos: { t: 'Nenhum horário marcado', d: 'Marcar leva menos de um minuto.' },
  historico: { t: 'Você ainda não tem atendimentos aqui', d: 'Depois do primeiro corte, ele aparece nesta lista.' },
  cancelados: { t: 'Nenhum horário cancelado', d: 'Os horários que você cancelar ficam registrados aqui.' },
}

const um = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)
const tz = { timeZone: 'America/Bahia' } as const
const quando = (iso: string) => {
  const d = new Date(iso)
  return {
    data: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', ...tz }).replace(/\./g, ''),
    dataLonga: d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', ...tz }),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', ...tz }),
  }
}
const duracao = (a: MeuAgendamento) => um(a.servico)?.duracao_min ?? Math.round((new Date(a.fim).getTime() - new Date(a.inicio).getTime()) / 60_000)

function situacao(a: MeuAgendamento): { t: string; c: string } {
  if (a.status === 'concluido') return { t: 'Concluído', c: 'bg-entrada/10 text-entrada' }
  if (a.status === 'cancelado') return { t: 'Cancelado', c: 'bg-saida/10 text-saida' }
  if (a.status === 'faltou') return { t: 'Não compareceu', c: 'bg-surface-alt text-fg-muted' }
  return { t: 'Confirmado', c: 'bg-amber/15 text-amber' }
}

function Foto({ a, className }: { a: MeuAgendamento; className: string }) {
  return (
    <span className={`relative rounded-button overflow-hidden bg-surface-alt border border-line flex items-center justify-center shrink-0 ${className}`}>
      {a.foto
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={a.foto} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        : <Scissors size={20} className="text-fg-muted" aria-hidden />}
    </span>
  )
}

export default function MeusAgendamentos({ barbearia, agendamentosIniciais, notasIniciais = {}, podeAvaliar = false }: {
  notasIniciais?: Record<string, number>
  podeAvaliar?: boolean
  barbearia: { nome: string; slug: string; telefone: string | null; endereco?: string | null }
  agendamentosIniciais: MeuAgendamento[]
}) {
  const [ags, setAgs] = useState(agendamentosIniciais)
  const [filtro, setFiltro] = useState<Filtro>('proximos')
  const [aberto, setAberto] = useState<MeuAgendamento | null>(null)
  const [confirmar, setConfirmar] = useState<MeuAgendamento | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null)
  // Avaliação com estrelas de um atendimento concluído
  const [notas, setNotas] = useState(notasIniciais)
  const [avaliar, setAvaliar] = useState<MeuAgendamento | null>(null)
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)

  const agora = Date.now()
  const futuro = (a: MeuAgendamento) => (a.status === 'agendado' || a.status === 'confirmado') && new Date(a.fim).getTime() > agora
  const listas: Record<Filtro, MeuAgendamento[]> = {
    proximos: ags.filter(futuro).sort((a, b) => a.inicio.localeCompare(b.inicio)),
    cancelados: ags.filter(a => a.status === 'cancelado'),
    historico: ags.filter(a => !futuro(a) && a.status !== 'cancelado'),
  }
  const lista = listas[filtro]
  const mapa = barbearia.endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${barbearia.nome} ${barbearia.endereco}`)}` : null
  const denovo = (a: MeuAgendamento) => `/${barbearia.slug}?${new URLSearchParams({ ...(a.servico_id ? { servico: a.servico_id } : {}), ...(a.profissional_id ? { profissional: a.profissional_id } : {}) })}`

  async function cancelar() {
    if (!confirmar) return
    setCancelando(true); setMsg(null)
    const res = await fetch(`/api/cliente/agendamentos/${confirmar.id}/cancelar`, { method: 'POST' }).catch(() => null)
    setCancelando(false)
    const alvo = confirmar
    setConfirmar(null); setAberto(null)
    if (!res) { setMsg({ t: 'Sem conexão. O horário continua marcado; tenta de novo.', erro: true }); return }
    if (!res.ok) { setMsg({ t: (await res.json().catch(() => ({}))).erro ?? 'Não deu pra cancelar', erro: true }); return }
    setAgs(prev => prev.map(x => x.id === alvo.id ? { ...x, status: 'cancelado', cancelado_por: 'cliente' } : x))
    setMsg({ t: 'Horário cancelado. Quer outro? Toque em Agendar.' })
  }

  async function enviarAvaliacao() {
    if (!avaliar || nota < 1) return
    setEnviando(true)
    const res = await fetch('/api/cliente/avaliacoes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agendamento_id: avaliar.id, nota, comentario: comentario.trim() || undefined }),
    }).catch(() => null)
    setEnviando(false)
    const alvo = avaliar
    setAvaliar(null)
    if (!res?.ok) { setMsg({ t: res ? (await res.json().catch(() => ({}))).erro ?? 'Não deu pra enviar a avaliação' : 'Sem conexão. Tenta de novo.', erro: true }); return }
    setNotas(n => ({ ...n, [alvo.id]: nota }))
    setMsg({ t: 'Obrigado pela avaliação!' })
  }

  const Estrelas = ({ n }: { n: number }) => (
    <span className="flex items-center gap-0.5 text-amber" aria-label={`Você deu ${n} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, k) => <Star key={k} size={13} fill={k < n ? 'currentColor' : 'none'} className={k < n ? '' : 'text-line'} aria-hidden />)}
    </span>
  )

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-28 space-y-5">
        <TopoInterno voltar={`/${barbearia.slug}/perfil`} titulo="Meus Agendamentos" subtitulo="Veja e gerencie seus horários" />

        <div className="flex rounded-button border border-line overflow-hidden" role="tablist" aria-label="Filtrar agendamentos">
          {FILTROS.map(([id, rotulo]) => (
            <button key={id} role="tab" aria-selected={filtro === id} onClick={() => setFiltro(id)}
              className={`flex-1 min-w-0 min-h-[44px] px-0.5 font-ui text-xs min-[380px]:text-[13px] font-semibold whitespace-nowrap transition-colors ${filtro === id ? 'bg-amber text-accent-fg' : 'text-fg-muted hover:text-fg'}`}>
              {rotulo}{listas[id].length > 0 && <span className="font-normal opacity-70"> {listas[id].length}</span>}
            </button>
          ))}
        </div>

        {msg && <p className={`ds-card px-4 py-3 font-body text-sm ${msg.erro ? 'text-saida border-saida/40' : 'text-fg'}`} role="status">{msg.t}</p>}

        {lista.length === 0 ? (
          <div className="ds-card p-8 text-center ds-grade">
            <CalendarX2 size={30} className="mx-auto text-fg-muted" strokeWidth={1.5} aria-hidden />
            <p className="font-display font-semibold text-fg mt-3">{VAZIO[filtro].t}</p>
            <p className="font-body text-sm text-fg-muted mt-1">{VAZIO[filtro].d}</p>
            <Link href={`/${barbearia.slug}`} className="ds-btn-primary mt-5"><CalendarPlus size={15} aria-hidden /> Agendar horário</Link>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {lista.map(a => {
              const q = quando(a.inicio), s = situacao(a)
              return (
                <li key={a.id}>
                  <button type="button" onClick={() => setAberto(a)} className="ds-card w-full text-left p-3.5 flex gap-3.5 hover:border-amber/40 transition-colors">
                    <Foto a={a} className="w-[72px] h-[72px]" />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-display text-[15px] leading-snug font-semibold text-fg line-clamp-2">{um(a.servico)?.nome ?? 'Atendimento'}</span>
                        <span className={`ds-tag shrink-0 ${s.c}`}>{s.t}</span>
                      </span>
                      <span className="block font-body text-xs text-fg-muted truncate mt-0.5">com {um(a.profissional)?.nome ?? 'a equipe'}</span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-body text-xs text-fg mt-1.5">
                        <span className="flex items-center gap-1 first-letter:uppercase"><CalendarDays size={12} className="text-fg-muted" aria-hidden /> {q.data}</span>
                        <span className="flex items-center gap-1 tabular-nums"><Clock size={12} className="text-fg-muted" aria-hidden /> {q.hora} · {duracao(a)} min</span>
                      </span>
                      {a.status === 'concluido' && notas[a.id] ? <span className="block mt-1.5"><Estrelas n={notas[a.id]} /></span> : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Detalhes do horário */}
      {aberto && !confirmar && !avaliar && (() => {
        const a = aberto, q = quando(a.inicio), s = situacao(a), pode = clientePodeCancelar(a.inicio, a.status), ehFuturo = futuro(a)
        return (
          <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" role="dialog" aria-modal aria-labelledby="t-detalhe">
            <div className="absolute inset-0 bg-black/70" onClick={() => setAberto(null)} />
            <div className="relative w-full max-w-md max-h-[92dvh] overflow-y-auto bg-surface border border-line rounded-t-2xl sm:rounded-card p-5 space-y-4">
              <div className="flex items-start gap-3.5">
                <Foto a={a} className="w-16 h-16" />
                <div className="flex-1 min-w-0">
                  <h2 id="t-detalhe" className="font-display text-lg font-semibold text-fg leading-snug">{um(a.servico)?.nome ?? 'Atendimento'}</h2>
                  <span className={`ds-tag mt-1 ${s.c}`}>{s.t}</span>
                </div>
                <button type="button" onClick={() => setAberto(null)} aria-label="Fechar" className="w-9 h-9 -mr-1.5 -mt-1.5 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-alt"><X size={18} aria-hidden /></button>
              </div>

              <dl className="rounded-button border border-line divide-y divide-line font-body text-sm">
                {[
                  [UserRound, 'Profissional', um(a.profissional)?.nome ?? 'A equipe'],
                  [CalendarDays, 'Data', q.dataLonga],
                  [Clock, 'Horário', `${q.hora} · ${duracao(a)} min`],
                ].map(([Icone, rotulo, valor]) => {
                  const I = Icone as typeof Clock
                  return (
                    <div key={rotulo as string} className="flex items-center gap-3 px-3.5 py-3">
                      <I size={15} className="text-amber shrink-0" aria-hidden />
                      <dt className="text-fg-muted">{rotulo as string}</dt>
                      <dd className="ml-auto text-right text-fg first-letter:uppercase">{valor as string}</dd>
                    </div>
                  )
                })}
                <div className="flex items-center gap-3 px-3.5 py-3">
                  <span className="w-[15px] text-center text-amber font-semibold shrink-0" aria-hidden>$</span>
                  <dt className="text-fg-muted">Valor</dt>
                  <dd className="ml-auto text-fg tabular-nums">{formatBRL(a.valor_servico)}</dd>
                </div>
              </dl>

              {a.status === 'cancelado' && (
                <p className="font-body text-sm text-fg-muted">{a.cancelado_por === 'cliente' ? 'Você cancelou este horário.' : 'Este horário foi cancelado pela barbearia.'}</p>
              )}

              {ehFuturo && (
                <div className="space-y-2">
                  {mapa && <a href={mapa} target="_blank" rel="noopener noreferrer" className="ds-btn-secondary w-full"><Navigation size={15} aria-hidden /> Como chegar</a>}
                  {pode
                    ? <button type="button" onClick={() => setConfirmar(a)} className="ds-btn-danger w-full">Cancelar horário</button>
                    : <p className="font-body text-sm text-fg-muted">Falta menos de 1 hora: pra cancelar, fale com a barbearia.</p>}
                  <p className="font-body text-xs text-fg-muted">Precisa de outro dia ou hora? Cancele este e marque um novo em Agendar.</p>
                </div>
              )}

              {!ehFuturo && (
                <div className="space-y-2">
                  {a.status === 'concluido' && (notas[a.id]
                    ? <p className="flex items-center gap-2 font-body text-sm text-fg-muted">Sua avaliação: <Estrelas n={notas[a.id]} /></p>
                    : podeAvaliar && <button type="button" onClick={() => { setAvaliar(a); setNota(0); setComentario('') }} className="ds-btn-secondary w-full"><Star size={15} aria-hidden /> Avaliar atendimento</button>)}
                  {a.servico_id && <Link href={denovo(a)} className="ds-btn-primary w-full"><RotateCcw size={15} aria-hidden /> Marcar de novo</Link>}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Confirmação de cancelamento */}
      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal aria-labelledby="t-cancelar">
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirmar(null)} />
          <div className="relative w-full max-w-md bg-surface border border-line rounded-t-2xl sm:rounded-card p-6 space-y-4">
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

      {avaliar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal aria-labelledby="t-avaliar">
          <div className="absolute inset-0 bg-black/70" onClick={() => setAvaliar(null)} />
          <div className="relative w-full max-w-md bg-surface border border-line rounded-t-2xl sm:rounded-card p-6 space-y-4">
            <div>
              <h2 id="t-avaliar" className="font-display text-lg font-semibold text-fg">Como foi o atendimento?</h2>
              <p className="font-body text-sm text-fg-muted">{um(avaliar.servico)?.nome} com {um(avaliar.profissional)?.nome ?? 'a equipe'}</p>
            </div>
            <div className="flex justify-center gap-1.5" role="radiogroup" aria-label="Nota de 1 a 5 estrelas">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" role="radio" aria-checked={nota === n} aria-label={`${n} estrela${n > 1 ? 's' : ''}`} onClick={() => setNota(n)}
                  className={`w-12 h-12 flex items-center justify-center rounded-button transition-transform active:scale-90 ${n <= nota ? 'text-amber' : 'text-line hover:text-fg-muted'}`}>
                  <Star size={32} fill={n <= nota ? 'currentColor' : 'none'} aria-hidden />
                </button>
              ))}
            </div>
            <div>
              <label className="ds-label" htmlFor="comentario">Quer contar como foi? <span className="text-fg-muted font-normal">(opcional)</span></label>
              <textarea id="comentario" rows={3} maxLength={300} value={comentario} onChange={e => setComentario(e.target.value)} className="ds-input" placeholder="Seu comentário pode aparecer na página da barbearia, só com o seu primeiro nome." />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAvaliar(null)} className="ds-btn-secondary flex-1">Agora não</button>
              <button onClick={enviarAvaliacao} disabled={nota < 1 || enviando} className="ds-btn-primary flex-1">{enviando ? 'Enviando…' : 'Enviar avaliação'}</button>
            </div>
          </div>
        </div>
      )}

      <NavCliente slug={barbearia.slug} ativo="perfil" />
    </div>
  )
}
