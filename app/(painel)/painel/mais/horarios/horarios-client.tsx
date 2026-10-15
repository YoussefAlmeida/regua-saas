'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Lock, Trash2, Plus, Check, AlertTriangle } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'
import { HORARIO_PADRAO } from '@/lib/horario-padrao'

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

interface Profissional { id: string; nome: string }
interface Dia { ativo: boolean; inicio: string; fim: string; almoco: boolean; intervalo_inicio: string; intervalo_fim: string }
interface Bloqueio { id: string; inicio: string; fim: string; motivo: string | null; daBarbearia?: boolean; travado?: boolean }
type HorarioLoja = Record<string, { ativo?: boolean; inicio?: string; fim?: string; intervalo_inicio?: string; intervalo_fim?: string }>
interface Conflito { id: string; inicio: string; cliente: { nome: string } | { nome: string }[] | null }

const hojeBahia = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })

function semanaPadrao(hb: HorarioLoja): Dia[] {
  return DIAS.map((_, i) => {
    const h = hb[String(i)]
    return {
      ativo: h?.ativo ?? (i !== 0),
      inicio: h?.inicio ?? '08:00',
      fim: h?.fim ?? '19:00',
      almoco: false,
      intervalo_inicio: '12:00',
      intervalo_fim: '13:00',
    }
  })
}

function fmtBloqueio(b: Bloqueio): string {
  const ini = new Date(b.inicio), fim = new Date(b.fim)
  const opts = { timeZone: 'America/Bahia' } as const
  const dia = ini.toLocaleDateString('pt-BR', { ...opts, weekday: 'short', day: '2-digit', month: 'short' })
  const h = (d: Date) => d.toLocaleTimeString('pt-BR', { ...opts, hour: '2-digit', minute: '2-digit' })
  const mesmoDia = ini.toLocaleDateString('sv-SE', opts) === new Date(fim.getTime() - 1).toLocaleDateString('sv-SE', opts)
  if (mesmoDia && h(ini) === '00:00' && h(fim) === '00:00') return `${dia} · dia inteiro`
  if (mesmoDia) return `${dia} · ${h(ini)} às ${h(fim)}`
  const diaFim = new Date(fim.getTime() - 1).toLocaleDateString('pt-BR', { ...opts, day: '2-digit', month: 'short' })
  return `${dia} até ${diaFim}`
}

export default function HorariosClient({
  profissionais,
  horarioBarbearia,
  souDono,
}: {
  profissionais: Profissional[]
  horarioBarbearia: HorarioLoja
  souDono: boolean
}) {
  // O que o dono definiu (sem nada salvo, o padrão que a barbearia já usa)
  const loja: HorarioLoja = Object.keys(horarioBarbearia).length ? horarioBarbearia : HORARIO_PADRAO
  const abre = (i: number) => {
    const h = loja[String(i)]
    return h && h.ativo !== false && h.inicio && h.fim ? h : null
  }
  // Dono: "Barbearia" (vale pra todos) e, se ele corta, "Minha agenda". Barbeiro: só a dele.
  const profId = profissionais[0]?.id ?? ''
  const [aba, setAba] = useState<'barbearia' | 'minha'>(souDono ? 'barbearia' : 'minha')
  const naBarbearia = aba === 'barbearia'
  const [carregando, setCarregando] = useState(true)
  const [proprio, setProprio] = useState(false)          // false = segue o horário da barbearia
  const [semana, setSemana] = useState<Dia[]>(semanaPadrao(loja))
  const [salvandoSemana, setSalvandoSemana] = useState(false)

  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([])
  const [form, setForm] = useState({ data: hojeBahia(), dataFim: '', diaInteiro: false, de: '12:00', ate: '13:00', motivo: '' })
  const [salvandoBloq, setSalvandoBloq] = useState(false)
  const [conflitos, setConflitos] = useState<Conflito[]>([])

  const carregar = useCallback(async (id: string, barbearia: boolean) => {
    setConflitos([])
    if (barbearia) {
      // Só os bloqueios da barbearia toda
      setCarregando(true)
      const r = await fetch('/api/painel/bloqueios?barbearia=1').catch(() => null)
      setCarregando(false)
      if (!r?.ok) { avisar('Não deu pra carregar os bloqueios.', 'erro'); return }
      setBloqueios(await r.json())
      return
    }
    if (!id) return
    setCarregando(true)
    const [rH, rB] = await Promise.all([
      fetch(`/api/painel/horarios?profissional_id=${id}`),
      fetch(`/api/painel/bloqueios?profissional_id=${id}`),
    ]).catch(() => [null, null])
    setCarregando(false)
    if (!rH?.ok || !rB?.ok) { avisar('Não deu pra carregar os horários.', 'erro'); return }

    const horarios: { dia_semana: number; inicio: string; fim: string; intervalo_inicio: string | null; intervalo_fim: string | null }[] = await rH.json()
    setBloqueios(await rB.json())

    if (horarios.length === 0) {
      setProprio(false)
      setSemana(semanaPadrao(loja))
      return
    }
    setProprio(true)
    setSemana(DIAS.map((_, i) => {
      const h = horarios.find(x => x.dia_semana === i)
      return {
        ativo: !!h,
        inicio: h?.inicio.slice(0, 5) ?? '08:00',
        fim: h?.fim.slice(0, 5) ?? '19:00',
        almoco: !!h?.intervalo_inicio,
        intervalo_inicio: h?.intervalo_inicio?.slice(0, 5) ?? '12:00',
        intervalo_fim: h?.intervalo_fim?.slice(0, 5) ?? '13:00',
      }
    }))
  }, [loja])

  useEffect(() => { carregar(profId, naBarbearia) }, [profId, naBarbearia, carregar])

  function mudarDia(i: number, patch: Partial<Dia>) {
    setSemana(s => s.map((d, idx) => idx === i ? { ...d, ...patch } : d))
  }

  async function salvarSemana() {
    setSalvandoSemana(true)
    const dias = proprio
      ? semana.flatMap((d, i) => d.ativo && abre(i) ? [{
          dia_semana: i,
          inicio: d.inicio,
          fim: d.fim,
          intervalo_inicio: d.almoco ? d.intervalo_inicio : null,
          intervalo_fim: d.almoco ? d.intervalo_fim : null,
        }] : [])
      : []
    const res = await fetch('/api/painel/horarios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profissional_id: profId, dias }),
    }).catch(() => null)
    setSalvandoSemana(false)
    if (!res) { avisar('Sem conexão. Tenta de novo.', 'erro'); return }
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    avisar(proprio ? 'Horário salvo. A página de agendamento já mostra os novos horários.' : 'Pronto. Agora segue o horário da barbearia.', 'sucesso')
  }

  async function bloquear(e: React.FormEvent) {
    e.preventDefault()
    setConflitos([])
    let inicio: string, fim: string
    if (form.diaInteiro) {
      const ultimo = form.dataFim && form.dataFim >= form.data ? form.dataFim : form.data
      const [y, m, d] = ultimo.split('-').map(Number)
      const diaSeguinte = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
      inicio = `${form.data}T00:00:00-03:00`
      fim = `${diaSeguinte}T00:00:00-03:00`
    } else {
      if (form.ate <= form.de) { avisar('O fim precisa ser depois do início.', 'erro'); return }
      inicio = `${form.data}T${form.de}:00-03:00`
      fim = `${form.data}T${form.ate}:00-03:00`
    }

    setSalvandoBloq(true)
    const res = await fetch('/api/painel/bloqueios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(naBarbearia
        ? { todos: true, inicio, fim, motivo: form.motivo || undefined }
        : { profissional_id: profId, inicio, fim, motivo: form.motivo || undefined }),
    }).catch(() => null)
    setSalvandoBloq(false)

    if (!res) { avisar('Sem conexão. Tenta de novo.', 'erro'); return }
    const json = await res.json().catch(() => ({}))
    if (res.status === 409 && json.conflitos) {
      setConflitos(json.conflitos)
      return
    }
    if (!res.ok) { avisar(json.erro ?? 'Erro ao bloquear', 'erro'); return }

    setBloqueios(b => [...b, json].sort((a, z) => a.inicio.localeCompare(z.inicio)))
    setForm(f => ({ ...f, motivo: '' }))
    avisar(naBarbearia ? 'Barbearia bloqueada nesse horário para toda a equipe.' : 'Horário bloqueado. Ninguém consegue marcar nele.', 'sucesso')
  }

  async function desbloquear(id: string) {
    if (!confirm('Liberar esse horário de novo?')) return
    const res = await fetch(`/api/painel/bloqueios/${id}`, { method: 'DELETE' }).catch(() => null)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    setBloqueios(b => b.filter(x => x.id !== id))
    avisar('Horário liberado.', 'sucesso')
  }

  const inputCls = 'bg-surface border border-line rounded-button px-2.5 py-2 font-body text-sm text-fg focus:outline-none focus:ring-1 focus:ring-amber'
  const labelCls = 'font-ui text-sm font-medium text-fg block mb-1.5'

  // O que o dono definiu: o limite de todos
  const cardFuncionamento = (
            <div className="rounded-card border border-line bg-surface-alt/60 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-ui text-sm font-semibold text-fg">Funcionamento da barbearia</p>
                {souDono
                  ? <Link href="/painel/mais/configuracoes" className="font-body text-xs font-semibold text-amber hover:underline">Alterar</Link>
                  : <span className="flex items-center gap-1 font-body text-xs text-fg-muted"><Lock size={11} /> Definido pelo dono</span>}
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
                {DIAS.map((nome, i) => {
                  const h = abre(i)
                  return (
                    <li key={nome} className="flex justify-between font-body text-xs">
                      <span className="text-fg-muted">{nome.slice(0, 3)}</span>
                      <span className={`font-mono ${h ? 'text-fg' : 'text-fg-muted'}`}>{h ? `${h.inicio}–${h.fim}` : 'Fechada'}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
  )

  if (!souDono && profissionais.length === 0) {
    return (
      <div className="px-4 py-16 max-w-lg mx-auto text-center space-y-3">
        <p className="font-semibold font-ui text-sm text-fg-muted">Nenhum barbeiro ativo</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/painel/mais" className="text-fg-muted hover:text-fg" aria-label="Voltar"><ChevronLeft size={20} /></Link>
        <h1 className="font-display text-[28px] font-semibold leading-tight text-fg">{souDono ? 'Horários' : 'Meu horário'}</h1>
      </div>

      {/* Dono: o que vale pra barbearia toda x a agenda dele (se também corta) */}
      {souDono && (
        <div className="flex rounded-button border border-line overflow-hidden">
          {([['barbearia', 'Barbearia'], ...(profissionais.length ? [['minha', 'Minha agenda']] : [])] as [typeof aba, string][]).map(([v, t]) => (
            <button
              key={v}
              onClick={() => setAba(v)}
              className={`flex-1 py-2.5 font-ui text-sm font-semibold transition-colors ${aba === v ? 'bg-amber text-accent-fg' : 'text-fg-muted hover:text-fg'}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {souDono && naBarbearia && (
        <p className="font-body text-sm text-fg-muted -mt-4">
          Tudo aqui vale para a barbearia toda. Cada barbeiro monta o horário dele dentro do funcionamento.
          {!profissionais.length && ' Se você também corta, ligue "Eu também atendo" em Mais → Equipe pra ter a sua agenda.'}
        </p>
      )}

      {carregando ? (
        <p className="font-semibold font-ui text-sm text-fg-muted animate-pulse text-center py-12">Carregando…</p>
      ) : (
        <>
          {naBarbearia && <section>{cardFuncionamento}</section>}

          {/* ── Semana de trabalho ───────────────────────── */}
          {!naBarbearia && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold font-ui text-sm text-fg-muted">Semana de trabalho</h2>
              <button
                onClick={salvarSemana}
                disabled={salvandoSemana}
                className="font-semibold flex items-center gap-1.5 bg-amber hover:bg-accent-press text-accent-fg font-ui text-xs px-4 py-2 rounded-button transition-colors disabled:opacity-50"
              >
                <Check size={13} /> {salvandoSemana ? 'Salvando…' : 'Salvar'}
              </button>
            </div>

            {cardFuncionamento}

            <div className="grid grid-cols-2 gap-2">
              {[
                { v: false, t: 'Igual à barbearia', d: 'Atende em todo o funcionamento' },
                { v: true, t: 'Horário próprio', d: 'Dentro do funcionamento da barbearia' },
              ].map(o => (
                <button
                  key={String(o.v)}
                  onClick={() => setProprio(o.v)}
                  className={`text-left rounded-card border px-3 py-3 transition-colors ${proprio === o.v ? 'border-amber bg-amber/5' : 'border-line bg-surface'}`}
                >
                  <p className={`font-ui text-sm font-semibold ${proprio === o.v ? 'text-amber' : 'text-fg'}`}>{o.t}</p>
                  <p className="font-body text-xs text-fg-muted mt-0.5">{o.d}</p>
                </button>
              ))}
            </div>

            {proprio && (
              <div className="bg-surface rounded-card border border-line divide-y divide-line">
                {semana.map((d, i) => {
                  const h = abre(i)
                  if (!h) {
                    return (
                      <div key={i} className="px-4 py-3 flex items-center gap-3 opacity-60">
                        <Lock size={14} className="text-fg-muted shrink-0 ml-2.5 mr-2.5" />
                        <span className="font-ui text-sm font-semibold w-12 shrink-0 text-fg-muted">{DIAS[i].slice(0, 3)}</span>
                        <span className="font-body text-xs text-fg-muted">Barbearia fechada</span>
                      </div>
                    )
                  }
                  return (
                    <div key={i} className="px-4 py-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={d.ativo}
                          aria-label={`Trabalha ${DIAS[i]}`}
                          onClick={() => mudarDia(i, { ativo: !d.ativo })}
                          className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${d.ativo ? 'bg-amber' : 'bg-line'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-fg transition-transform ${d.ativo ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                        <span className={`font-ui text-sm font-semibold w-12 shrink-0 ${d.ativo ? 'text-fg' : 'text-fg-muted'}`}>{DIAS[i].slice(0, 3)}</span>
                        {d.ativo ? (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <input type="time" min={h.inicio} max={h.fim} value={d.inicio} onChange={e => mudarDia(i, { inicio: e.target.value })} className={`${inputCls} py-1 text-xs w-[5.5rem]`} />
                            <span className="text-fg-muted text-xs">–</span>
                            <input type="time" min={h.inicio} max={h.fim} value={d.fim} onChange={e => mudarDia(i, { fim: e.target.value })} className={`${inputCls} py-1 text-xs w-[5.5rem]`} />
                          </div>
                        ) : (
                          <span className="font-body text-xs text-fg-muted">Folga</span>
                        )}
                      </div>
                      {d.ativo && (
                        <div className="pl-12 flex items-center gap-2 flex-wrap">
                          <label className="flex items-center gap-1.5 font-body text-xs text-fg-muted cursor-pointer">
                            <input type="checkbox" checked={d.almoco} onChange={e => mudarDia(i, { almoco: e.target.checked })} className="accent-[var(--regua-accent)]" />
                            Almoço
                          </label>
                          {d.almoco && (
                            <>
                              <input type="time" value={d.intervalo_inicio} onChange={e => mudarDia(i, { intervalo_inicio: e.target.value })} className={`${inputCls} py-1 text-xs w-[5.5rem]`} />
                              <span className="text-fg-muted text-xs">–</span>
                              <input type="time" value={d.intervalo_fim} onChange={e => mudarDia(i, { intervalo_fim: e.target.value })} className={`${inputCls} py-1 text-xs w-[5.5rem]`} />
                            </>
                          )}
                        </div>
                      )}
                      {d.ativo && (d.inicio < h.inicio! || d.fim > h.fim!) && (
                        <p className="pl-12 font-body text-xs text-saida">A barbearia funciona das {h.inicio} às {h.fim}. Ajuste dentro desse horário.</p>
                      )}
                      {d.ativo && !(d.inicio < h.inicio! || d.fim > h.fim!) && (
                        <p className="pl-12 font-body text-xs text-fg-muted">Barbearia: {h.inicio}–{h.fim}{h.intervalo_inicio && h.intervalo_fim ? ` · fecha ${h.intervalo_inicio}–${h.intervalo_fim}` : ''}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          )}

          {/* ── Bloqueios ───────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="font-semibold font-ui text-sm text-fg-muted">{naBarbearia ? 'Bloquear a barbearia' : 'Bloquear minha agenda'}</h2>
            <p className="font-body text-xs text-fg-muted -mt-1">
              {naBarbearia
                ? 'Feriado, reforma, fechar mais cedo. Vale para toda a equipe e some da página de agendamento na hora. Só você pode liberar.'
                : `Médico, folga, compromisso. Some da página de agendamento na hora.${souDono ? '' : ' Os bloqueios do dono valem pra você também.'}`}
            </p>

            <form onSubmit={bloquear} className="bg-surface rounded-card border border-line p-4 space-y-3">
              <div className="flex gap-2">
                {[{ v: false, t: 'Algumas horas' }, { v: true, t: 'Dia inteiro' }].map(o => (
                  <button
                    key={String(o.v)}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, diaInteiro: o.v }))}
                    className={`font-semibold flex-1 py-2 rounded-button border font-ui text-xs transition-colors ${form.diaInteiro === o.v ? 'border-amber text-amber bg-amber/5' : 'border-line text-fg-muted'}`}
                  >
                    {o.t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>{form.diaInteiro ? 'De' : 'Dia'}</label>
                  <input type="date" min={hojeBahia()} value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required className={`${inputCls} w-full`} />
                </div>
                {form.diaInteiro ? (
                  <div>
                    <label className={labelCls}>Até (opcional)</label>
                    <input type="date" min={form.data} value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} className={`${inputCls} w-full`} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className={labelCls}>Das</label>
                      <input type="time" value={form.de} onChange={e => setForm(f => ({ ...f, de: e.target.value }))} required className={`${inputCls} w-full px-1.5`} />
                    </div>
                    <div>
                      <label className={labelCls}>Às</label>
                      <input type="time" value={form.ate} onChange={e => setForm(f => ({ ...f, ate: e.target.value }))} required className={`${inputCls} w-full px-1.5`} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Motivo (só a equipe vê)</label>
                <input type="text" maxLength={120} value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Ex.: dentista" className={`${inputCls} w-full`} />
              </div>

              {conflitos.length > 0 && (
                <div className="bg-saida/5 border border-saida/30 rounded-button p-3 space-y-2">
                  <p className="flex items-center gap-1.5 font-ui text-sm font-semibold text-saida">
                    <AlertTriangle size={12} /> Tem cliente marcado nesse horário
                  </p>
                  <ul className="space-y-1">
                    {conflitos.map(c => {
                      const cli = Array.isArray(c.cliente) ? c.cliente[0] : c.cliente
                      return (
                        <li key={c.id} className="font-body text-xs text-fg">
                          {new Date(c.inicio).toLocaleString('pt-BR', { timeZone: 'America/Bahia', weekday: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })} · {cli?.nome ?? 'Cliente'}
                        </li>
                      )
                    })}
                  </ul>
                  <p className="font-body text-xs text-fg-muted">
                    Cancele ou remarque na <Link href="/painel/agenda" className="text-amber hover:underline">Agenda</Link> e depois bloqueie.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={salvandoBloq}
                className="font-semibold w-full flex items-center justify-center gap-2 bg-surface-alt border border-line hover:border-amber/40 text-fg font-ui text-sm py-2.5 rounded-button transition-colors disabled:opacity-50"
              >
                <Plus size={13} /> {salvandoBloq ? 'Bloqueando…' : 'Bloquear'}
              </button>
            </form>

            {bloqueios.length > 0 ? (
              <ul className="bg-surface rounded-card border border-line divide-y divide-line">
                {bloqueios.map(b => (
                  <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                    <Lock size={14} className="text-fg-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-fg first-letter:uppercase">{fmtBloqueio(b)}</p>
                      <p className="font-body text-xs text-fg-muted truncate">
                        {[b.daBarbearia ? 'Barbearia toda' : null, b.travado ? 'definido pelo dono' : null, b.motivo].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {b.travado ? (
                      <span className="p-2 text-fg-muted" title="Só o dono pode liberar"><Lock size={14} /></span>
                    ) : (
                      <button onClick={() => desbloquear(b.id)} className="p-2 text-fg-muted hover:text-saida transition-colors" aria-label="Liberar horário">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-body text-xs text-fg-muted text-center py-2">Nenhum bloqueio marcado.</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
