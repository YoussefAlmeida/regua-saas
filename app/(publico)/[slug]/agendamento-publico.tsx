'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, MapPin, Instagram, Clock, Check, MessageCircle, CalendarCheck, LogOut } from 'lucide-react'

type Etapa = 'servico' | 'barbeiro' | 'horario' | 'dados' | 'sucesso'
type Aba = 'novo' | 'entrar'

interface Profissional { id: string; nome: string; foto_url: string | null; especialidade: string | null }
interface Servico { id: string; nome: string; preco: number; duracao_min: number; cor: string }
interface Barbearia {
  nome: string; slug: string; endereco: string | null; instagram: string | null; telefone: string | null
}

interface Props {
  barbearia: Barbearia
  profissionais: Profissional[]
  servicos: Servico[]
  clienteLogado: { nome: string } | null
  aceitando: boolean
}

const DIAS_A_FRENTE = 21
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const waLink = (tel: string, txt?: string) => {
  const d = tel.replace(/\D/g, '')
  return `https://wa.me/${d.startsWith('55') ? d : `55${d}`}${txt ? `?text=${encodeURIComponent(txt)}` : ''}`
}

function proximosDias(): { iso: string; semana: string; dia: string; mes: string }[] {
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
  const [y, m, d] = hoje.split('-').map(Number)
  return Array.from({ length: DIAS_A_FRENTE }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d + i, 12))
    return {
      iso: dt.toISOString().slice(0, 10),
      semana: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : dt.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', ''),
      dia: String(dt.getUTCDate()).padStart(2, '0'),
      mes: dt.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', ''),
    }
  })
}

export default function AgendamentoPublico({ barbearia, profissionais, servicos, clienteLogado, aceitando }: Props) {
  const soUmBarbeiro = profissionais.length === 1
  const [etapa, setEtapa] = useState<Etapa>('servico')
  const [servico, setServico] = useState<Servico | null>(null)
  const [profissional, setProfissional] = useState<Profissional | null>(soUmBarbeiro ? profissionais[0] : null)
  const [data, setData] = useState('')
  const [horario, setHorario] = useState('')
  const [slots, setSlots] = useState<string[] | null>(null)
  const [slotsCarregando, setSlotsCarregando] = useState(false)

  const [logado, setLogado] = useState(clienteLogado)
  const [aba, setAba] = useState<Aba>('novo')
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const dias = useMemo(proximosDias, [])
  const ordem: Etapa[] = soUmBarbeiro ? ['servico', 'horario', 'dados'] : ['servico', 'barbeiro', 'horario', 'dados']
  const passo = ordem.indexOf(etapa)

  function voltar() {
    setErro('')
    if (passo > 0) setEtapa(ordem[passo - 1])
  }

  async function buscarSlots(d: string, prof = profissional, srv = servico) {
    if (!prof || !srv) return
    setData(d)
    setHorario('')
    setSlots(null)
    setSlotsCarregando(true)
    const res = await fetch(
      `/api/publico/${barbearia.slug}/disponibilidade?profissional_id=${prof.id}&servico_id=${srv.id}&data=${d}`,
    ).catch(() => null)
    setSlotsCarregando(false)
    const json = res?.ok ? await res.json() : { slots: [] }
    setSlots(json.slots ?? [])
  }

  function escolherServico(s: Servico) {
    setServico(s)
    if (soUmBarbeiro) {
      setEtapa('horario')
      buscarSlots(data || dias[0].iso, profissionais[0], s)
    } else {
      setEtapa('barbeiro')
    }
  }

  function escolherBarbeiro(p: Profissional) {
    setProfissional(p)
    setEtapa('horario')
    buscarSlots(data || dias[0].iso, p)
  }

  async function confirmar(e?: React.FormEvent) {
    e?.preventDefault()
    setErro('')
    if (!logado && aba === 'novo' && senha.length < 4) { setErro('Crie uma senha de pelo menos 4 dígitos'); return }
    setEnviando(true)

    const cliente = logado
      ? { acesso: 'sessao' }
      : aba === 'novo'
        ? { acesso: 'novo', nome, whatsapp, senha }
        : { acesso: 'entrar', whatsapp, senha }

    const res = await fetch(`/api/publico/${barbearia.slug}/agendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profissional_id: profissional!.id,
        servico_id: servico!.id,
        inicio: `${data}T${horario}:00-03:00`,
        cliente,
      }),
    }).catch(() => null)
    setEnviando(false)

    if (!res) { setErro('Sem conexão. Confere a internet e tenta de novo.'); return }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setErro(json.erro || 'Erro ao agendar')
      if (json.jaTemConta) setAba('entrar')
      if (json.sessaoExpirada) setLogado(null)
      if (json.horarioOcupado) { setEtapa('horario'); buscarSlots(data) }
      return
    }
    if (json.cliente?.nome) setLogado({ nome: json.cliente.nome })
    setSenha('')
    setEtapa('sucesso')
  }

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    setLogado(null)
  }

  function novoAgendamento() {
    setEtapa('servico')
    setServico(null)
    if (!soUmBarbeiro) setProfissional(null)
    setData('')
    setHorario('')
    setSlots(null)
    setErro('')
  }

  const dataFormatada = data
    ? new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    : ''

  const inputCls = 'w-full bg-surface-alt border border-line rounded-button px-4 py-3 font-body text-base text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber'
  const labelCls = 'font-ui text-xs uppercase tracking-wider text-fg-muted block mb-1'
  const cardCls = 'w-full flex items-center gap-4 bg-surface border border-line rounded-card px-4 py-4 hover:border-amber/50 active:scale-[0.99] transition text-left'

  return (
    <div className="min-h-screen bg-bg">
      {/* Cabeçalho da barbearia */}
      <header className="bg-surface border-b border-line px-4 pt-4 pb-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start gap-3">
            {etapa !== 'servico' && etapa !== 'sucesso' && (
              <button onClick={voltar} className="mt-1 -ml-1 p-1 text-fg-muted hover:text-fg transition-colors" aria-label="Voltar">
                <ChevronLeft size={20} />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl text-amber tracking-wider uppercase truncate">{barbearia.nome}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                {barbearia.endereco && (
                  <span className="flex items-center gap-1 font-body text-xs text-fg-muted">
                    <MapPin size={11} /> {barbearia.endereco}
                  </span>
                )}
                {barbearia.instagram && (
                  <a
                    href={`https://instagram.com/${barbearia.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-body text-xs text-fg-muted hover:text-fg"
                  >
                    <Instagram size={11} /> @{barbearia.instagram.replace('@', '')}
                  </a>
                )}
              </div>
            </div>
            <Link
              href={`/${barbearia.slug}/meus-agendamentos`}
              className="shrink-0 flex items-center gap-1 font-ui text-[11px] uppercase tracking-wider text-fg-muted hover:text-amber mt-1"
            >
              <CalendarCheck size={13} /> {logado ? 'Meus horários' : 'Entrar'}
            </Link>
          </div>

          {etapa !== 'sucesso' && aceitando && (
            <div className="mt-3 flex gap-1" aria-hidden>
              {ordem.map((e, i) => (
                <div key={e} className={`h-1 flex-1 rounded-full transition-colors ${i < passo ? 'bg-amber' : i === passo ? 'bg-amber/60' : 'bg-line'}`} />
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-16">
        {!aceitando ? (
          <div className="text-center py-16 space-y-4">
            <p className="font-ui text-sm uppercase tracking-wider text-fg-muted">Agendamento online pausado</p>
            <p className="font-body text-sm text-fg-muted">A barbearia não está recebendo agendamentos pelo link agora.</p>
            {barbearia.telefone && (
              <a href={waLink(barbearia.telefone, 'Oi! Queria marcar um horário.')} className="inline-flex items-center gap-2 bg-amber text-accent-fg font-ui text-sm uppercase tracking-wider px-5 py-3 rounded-button">
                <MessageCircle size={15} /> Chamar no WhatsApp
              </a>
            )}
          </div>
        ) : (
          <>
            {/* ── 1. Serviço ─────────────────────────── */}
            {etapa === 'servico' && (
              <section>
                <h2 className="font-ui text-lg uppercase tracking-wider text-fg mb-1">O que vai fazer?</h2>
                {logado && <p className="font-body text-sm text-fg-muted mb-4">Oi, {logado.nome.split(' ')[0]}! 👋</p>}
                {!logado && <p className="font-body text-sm text-fg-muted mb-4">Marca em menos de 1 minuto. Sem baixar app.</p>}
                {servicos.length === 0 ? (
                  <p className="font-body text-sm text-fg-muted text-center py-8">A barbearia ainda não cadastrou os serviços.</p>
                ) : (
                  <div className="space-y-2">
                    {servicos.map(s => (
                      <button key={s.id} onClick={() => escolherServico(s)} className={cardCls}>
                        <span className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: s.cor }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-ui text-sm uppercase tracking-wider text-fg">{s.nome}</p>
                          <span className="flex items-center gap-1 font-body text-xs text-fg-muted mt-0.5">
                            <Clock size={11} /> {s.duracao_min} min
                          </span>
                        </div>
                        <span className="font-mono text-base text-amber">{brl(s.preco)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── 2. Barbeiro ────────────────────────── */}
            {etapa === 'barbeiro' && (
              <section>
                <h2 className="font-ui text-lg uppercase tracking-wider text-fg mb-4">Com quem?</h2>
                {profissionais.length === 0 ? (
                  <p className="font-body text-sm text-fg-muted text-center py-8">Nenhum barbeiro disponível no momento.</p>
                ) : (
                  <div className="space-y-2">
                    {profissionais.map(p => (
                      <button key={p.id} onClick={() => escolherBarbeiro(p)} className={cardCls}>
                        <div className="w-12 h-12 rounded-full bg-surface-alt border border-line flex items-center justify-center font-display text-lg text-amber shrink-0 overflow-hidden">
                          {p.foto_url
                            ? <Image src={p.foto_url} alt={p.nome} width={48} height={48} className="w-full h-full object-cover" />
                            : p.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-ui text-sm uppercase tracking-wider text-fg">{p.nome}</p>
                          {p.especialidade && <p className="font-body text-xs text-fg-muted truncate">{p.especialidade}</p>}
                        </div>
                        <ChevronRight size={16} className="text-fg-muted" />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── 3. Dia e horário ───────────────────── */}
            {etapa === 'horario' && (
              <section>
                <h2 className="font-ui text-lg uppercase tracking-wider text-fg mb-1">Quando?</h2>
                <p className="font-body text-xs text-fg-muted mb-4">{servico?.nome} com {profissional?.nome}</p>

                <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2 snap-x" role="listbox" aria-label="Dia">
                  {dias.map(d => {
                    const ativo = d.iso === data
                    return (
                      <button
                        key={d.iso}
                        role="option"
                        aria-selected={ativo}
                        onClick={() => buscarSlots(d.iso)}
                        className={`snap-start shrink-0 w-16 py-2.5 rounded-card border flex flex-col items-center transition-colors ${
                          ativo ? 'bg-amber border-amber text-accent-fg' : 'bg-surface border-line text-fg hover:border-amber/50'
                        }`}
                      >
                        <span className={`font-ui text-[10px] uppercase tracking-wider ${ativo ? '' : 'text-fg-muted'}`}>{d.semana}</span>
                        <span className="font-mono text-xl leading-tight">{d.dia}</span>
                        <span className={`font-body text-[10px] ${ativo ? '' : 'text-fg-muted'}`}>{d.mes}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4">
                  {slotsCarregando || slots === null ? (
                    <div className="grid grid-cols-4 gap-2" aria-busy>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-11 rounded-button bg-surface border border-line animate-pulse" />
                      ))}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <p className="font-ui text-sm text-fg-muted uppercase tracking-wider">Sem horário livre nesse dia</p>
                      <p className="font-body text-xs text-fg-muted">Toca em outro dia aí em cima.</p>
                    </div>
                  ) : (
                    <>
                      <p className="font-body text-xs text-fg-muted mb-2 capitalize">{dataFormatada}</p>
                      <div className="grid grid-cols-4 gap-2">
                        {slots.map(slot => (
                          <button
                            key={slot}
                            onClick={() => { setHorario(slot); setEtapa('dados') }}
                            className="h-11 rounded-button font-mono text-sm border bg-surface border-line text-fg hover:border-amber hover:text-amber transition-colors"
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}

            {/* ── 4. Confirmar ───────────────────────── */}
            {etapa === 'dados' && (
              <section>
                <h2 className="font-ui text-lg uppercase tracking-wider text-fg mb-4">Confirma aí</h2>

                <div className="bg-surface border border-amber/30 rounded-card p-4 mb-6">
                  <p className="font-ui text-sm uppercase tracking-wider text-fg">{servico?.nome}</p>
                  <p className="font-body text-sm text-fg-muted">com {profissional?.nome}</p>
                  <div className="flex items-end justify-between mt-3">
                    <p className="font-body text-sm text-fg capitalize">{dataFormatada}<br /><span className="font-mono text-2xl text-amber">{horario}</span></p>
                    <p className="font-mono text-base text-fg">{servico && brl(servico.preco)}</p>
                  </div>
                </div>

                {logado ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-surface border border-line rounded-card px-4 py-3">
                      <p className="font-body text-sm text-fg">Agendando como <strong>{logado.nome}</strong></p>
                      <button onClick={sair} className="flex items-center gap-1 font-ui text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg">
                        <LogOut size={12} /> Não sou eu
                      </button>
                    </div>
                    {erro && <p className="font-body text-sm text-saida" role="alert">{erro}</p>}
                    <button
                      onClick={() => confirmar()}
                      disabled={enviando}
                      className="w-full bg-amber hover:bg-accent-press text-accent-fg font-ui uppercase tracking-wider text-sm py-3.5 rounded-button transition-colors disabled:opacity-50"
                    >
                      {enviando ? 'Confirmando…' : 'Confirmar horário'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex rounded-button border border-line overflow-hidden mb-4" role="tablist">
                      {([['novo', 'Primeira vez'], ['entrar', 'Já tenho conta']] as const).map(([v, t]) => (
                        <button
                          key={v}
                          role="tab"
                          aria-selected={aba === v}
                          onClick={() => { setAba(v); setErro('') }}
                          className={`flex-1 py-2.5 font-ui text-xs uppercase tracking-wider transition-colors ${aba === v ? 'bg-amber text-accent-fg' : 'text-fg-muted hover:text-fg'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={confirmar} className="space-y-4">
                      {aba === 'novo' && (
                        <div>
                          <label className={labelCls} htmlFor="nome">Seu nome</label>
                          <input id="nome" type="text" autoComplete="name" value={nome} onChange={e => setNome(e.target.value)} placeholder="João Silva" required minLength={2} className={inputCls} />
                        </div>
                      )}
                      <div>
                        <label className={labelCls} htmlFor="wa">WhatsApp com DDD</label>
                        <input id="wa" type="tel" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(75) 99999-0000" required className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls} htmlFor="senha">{aba === 'novo' ? 'Crie uma senha' : 'Sua senha'}</label>
                        <input
                          id="senha"
                          type="password"
                          inputMode={aba === 'novo' ? 'numeric' : undefined}
                          autoComplete={aba === 'novo' ? 'new-password' : 'current-password'}
                          value={senha}
                          onChange={e => setSenha(e.target.value)}
                          placeholder={aba === 'novo' ? 'mínimo 4 dígitos' : '••••'}
                          required
                          className={inputCls}
                        />
                        {aba === 'novo' && (
                          <p className="font-body text-[11px] text-fg-muted mt-1">Serve pra ver e cancelar seus horários depois. Nada de 1234.</p>
                        )}
                      </div>

                      {erro && <p className="font-body text-sm text-saida" role="alert">{erro}</p>}

                      <button
                        type="submit"
                        disabled={enviando}
                        className="w-full bg-amber hover:bg-accent-press text-accent-fg font-ui uppercase tracking-wider text-sm py-3.5 rounded-button transition-colors disabled:opacity-50"
                      >
                        {enviando ? 'Confirmando…' : 'Confirmar horário'}
                      </button>
                      <p className="font-body text-xs text-fg-muted text-center">Não precisa baixar nenhum app.</p>
                    </form>
                  </>
                )}
              </section>
            )}

            {/* ── Pronto ─────────────────────────────── */}
            {etapa === 'sucesso' && (
              <section className="text-center py-8 space-y-5">
                <div className="w-16 h-16 rounded-full bg-entrada/10 border border-entrada/30 flex items-center justify-center mx-auto">
                  <Check size={32} className="text-entrada" />
                </div>
                <h2 className="font-display text-4xl text-fg tracking-wider uppercase">Tá marcado!</h2>
                <div className="bg-surface border border-line rounded-card p-4 text-left space-y-1 max-w-xs mx-auto">
                  <p className="font-ui text-sm uppercase tracking-wider text-fg">{servico?.nome}</p>
                  <p className="font-body text-sm text-fg-muted">com {profissional?.nome}</p>
                  <p className="font-body text-sm text-fg capitalize pt-1">{dataFormatada} · <span className="font-mono text-amber">{horario}</span></p>
                </div>
                <p className="font-body text-sm text-fg-muted max-w-xs mx-auto">
                  A gente te lembra pelo WhatsApp 2 horas antes. Se precisar cancelar, dá pra fazer até 1 hora antes.
                </p>
                <div className="flex flex-col gap-2 max-w-xs mx-auto">
                  <Link
                    href={`/${barbearia.slug}/meus-agendamentos`}
                    className="bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm uppercase tracking-wider py-3 rounded-button transition-colors"
                  >
                    Ver meus horários
                  </Link>
                  <button onClick={novoAgendamento} className="text-amber font-ui text-xs uppercase tracking-wider py-2 hover:underline">
                    Marcar outro
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {barbearia.telefone && aceitando && etapa !== 'sucesso' && (
          <a
            href={waLink(barbearia.telefone)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 flex items-center justify-center gap-2 font-body text-xs text-fg-muted hover:text-fg"
          >
            <MessageCircle size={13} /> Dúvida? Fala com a barbearia
          </a>
        )}
      </main>
    </div>
  )
}
