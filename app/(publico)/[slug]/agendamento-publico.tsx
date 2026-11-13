'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, MapPin, Instagram, Clock, Check, MessageCircle, Scissors, Sparkles, CalendarPlus, Navigation, LogOut, Plus, Star } from 'lucide-react'
import { problemaNaSenha, SENHA_MIN_CLIENTE } from '@/lib/senha'
import NavCliente from '@/components/cliente/nav-cliente'
import { notaTexto, type ResumoAvaliacoes } from '@/lib/avaliacoes'

/* ================================================================
   Página pública de agendamento — a "loja" da barbearia.
   Início (serviços com foto, sobre, equipe) → profissional →
   dia e horário → confirmação. A barra de baixo sempre mostra o
   próximo passo; quem já entrou antes confirma com um toque.
   ================================================================ */

type Etapa = 'inicio' | 'profissional' | 'horario' | 'dados' | 'sucesso'
type Aba = 'novo' | 'entrar'
type AbaInicio = 'servicos' | 'sobre' | 'equipe'

interface Profissional { id: string; nome: string; foto_url: string | null; especialidade: string | null }
interface Servico { id: string; nome: string; preco: number; duracao_min: number; cor: string; foto_url?: string | null; descricao?: string | null }
interface Barbearia {
  nome: string; slug: string; endereco: string | null; instagram: string | null; telefone: string | null
  logo_url?: string | null; capa_url?: string | null; sobre?: string | null
}
interface Props {
  barbearia: Barbearia
  profissionais: Profissional[]
  servicos: Servico[]
  clienteLogado: { nome: string } | null
  aceitando: boolean
  /** WhatsApp automático ligado: só então a tela promete confirmação e lembrete */
  lembreteAtivo?: boolean
  /** "Aberta até 19:00" / "Fechada agora" */
  situacao?: { aberta: boolean; texto: string } | null
  /** Vindo de "Marcar de novo": já chega com serviço e profissional */
  pre?: { servico?: string; profissional?: string }
  avaliacoes?: ResumoAvaliacoes | null
  galeria?: string[]
}

type Dias = Record<string, string[]>
interface Agenda { dias: Dias; quem: Record<string, Record<string, string>>; porProfissional: Record<string, Dias> }

const DIAS_A_FRENTE = 21
const QUALQUER = 'qualquer'
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const waLink = (tel: string, txt?: string) => {
  const d = tel.replace(/\D/g, '')
  return `https://wa.me/${d.startsWith('55') ? d : `55${d}`}${txt ? `?text=${encodeURIComponent(txt)}` : ''}`
}

function proximosDias() {
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

/** "Livre hoje às 14:30" a partir da agenda de um profissional */
function proximoLivre(dias: Dias | undefined, lista: ReturnType<typeof proximosDias>): string | null {
  if (!dias) return null
  for (const d of lista) {
    const h = dias[d.iso]?.[0]
    if (h) return d.semana === 'Hoje' ? `Livre hoje às ${h}` : d.semana === 'Amanhã' ? `Livre amanhã às ${h}` : `Próximo horário: ${d.dia}/${d.iso.slice(5, 7)} às ${h}`
  }
  return 'Sem horário nas próximas 3 semanas'
}

const PERIODOS = [['Manhã', 0, 12], ['Tarde', 12, 18], ['Noite', 18, 24]] as const

function Foto({ src, alt, className, children }: { src?: string | null; alt: string; className: string; children?: React.ReactNode }) {
  return (
    <div className={`relative overflow-hidden bg-surface-alt flex items-center justify-center ${className}`}>
      {src ? <Image src={src} alt={alt} fill sizes="160px" className="object-cover" /> : children}
    </div>
  )
}

export default function AgendamentoPublico({ barbearia, profissionais, servicos, clienteLogado, aceitando, lembreteAtivo = false, situacao = null, pre, avaliacoes = null, galeria = [] }: Props) {
  const soUm = profissionais.length === 1
  const dias = useMemo(proximosDias, [])
  const preServico = servicos.find(s => s.id === pre?.servico) ?? null
  const preProf = profissionais.find(p => p.id === pre?.profissional)?.id ?? null

  const [etapa, setEtapa] = useState<Etapa>('inicio')
  const [abaInicio, setAbaInicio] = useState<AbaInicio>('servicos')
  const [servico, setServico] = useState<Servico | null>(preServico)
  const [profId, setProfId] = useState<string>(soUm ? profissionais[0].id : preProf ?? QUALQUER)
  const [data, setData] = useState('')
  const [horario, setHorario] = useState('')
  const [agenda, setAgenda] = useState<Agenda | null>(null)
  const [agendaErro, setAgendaErro] = useState(false)
  const pedidoAtual = useRef(0)

  const [logado, setLogado] = useState(clienteLogado)
  const [aba, setAba] = useState<Aba>('novo')
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [semAcesso, setSemAcesso] = useState(false)
  const [marcado, setMarcado] = useState<{ inicio: string; fim: string; profissional: string } | null>(null)

  const ordem: Etapa[] = soUm ? ['inicio', 'horario', 'dados'] : ['inicio', 'profissional', 'horario', 'dados']
  const passo = ordem.indexOf(etapa)
  const diasDoProf: Dias | null = agenda ? (profId === QUALQUER ? agenda.dias : agenda.porProfissional[profId] ?? {}) : null
  const slots = diasDoProf ? diasDoProf[data] ?? [] : null
  const algumDiaLivre = diasDoProf ? Object.values(diasDoProf).some(l => l.length > 0) : true
  // Quem atende: o escolhido, ou (em "qualquer") o primeiro livre naquele horário
  const profFinalId = profId === QUALQUER ? agenda?.quem[data]?.[horario] ?? null : profId
  const profFinal = profissionais.find(p => p.id === profFinalId) ?? null

  async function carregarAgenda(srv = servico) {
    if (!srv) return
    const pedido = ++pedidoAtual.current
    setAgenda(null); setAgendaErro(false)
    const res = await fetch(`/api/publico/${barbearia.slug}/disponibilidade?profissional_id=${QUALQUER}&servico_id=${srv.id}&de=${dias[0].iso}&dias=${DIAS_A_FRENTE}`).catch(() => null)
    if (pedido !== pedidoAtual.current) return
    if (!res?.ok) { setAgendaErro(true); return }
    setAgenda(await res.json())
  }

  // Chegou por "Marcar de novo": já carrega os horários do serviço
  useEffect(() => { if (preServico && aceitando) carregarAgenda(preServico) }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  // Ao entrar na escolha do horário: fica no dia escolhido se tiver vaga; senão, o primeiro com vaga
  useEffect(() => {
    if (etapa !== 'horario' || !diasDoProf) return
    if (data && diasDoProf[data]?.length) return
    setData(dias.find(d => diasDoProf[d.iso]?.length)?.iso ?? dias[0].iso)
    setHorario('')
  }, [etapa, diasDoProf])   // eslint-disable-line react-hooks/exhaustive-deps

  // Voltou pra página (trocou de app): recarrega, porque um horário pode ter sido ocupado ou liberado
  useEffect(() => {
    const aoVoltar = () => { if (document.visibilityState === 'visible' && etapa === 'horario') carregarAgenda() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  })

  function escolherServico(s: Servico) {
    setServico(s); setHorario(''); setErro('')
    carregarAgenda(s)
  }
  const avancar = () => { setErro(''); setEtapa(ordem[passo + 1]) }
  const voltar = () => { setErro(''); if (passo > 0) setEtapa(ordem[passo - 1]) }

  async function confirmar(e?: React.FormEvent) {
    e?.preventDefault()
    setErro('')
    if (!servico || !profFinalId || !horario) { setErro('Escolha o horário de novo.'); setEtapa('horario'); return }
    if (!logado && aba === 'novo') {
      const problema = problemaNaSenha(senha, [whatsapp], SENHA_MIN_CLIENTE)
      if (problema) { setErro(problema); return }
    }
    setEnviando(true)
    const cliente = logado ? { acesso: 'sessao' } : aba === 'novo' ? { acesso: 'novo', nome, whatsapp, senha } : { acesso: 'entrar', whatsapp, senha }
    const res = await fetch(`/api/publico/${barbearia.slug}/agendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profissional_id: profFinalId, servico_id: servico.id, inicio: `${data}T${horario}:00-03:00`, cliente }),
    }).catch(() => null)
    setEnviando(false)

    if (!res) { setErro('Sem conexão. Confere a internet e tenta de novo.'); return }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setErro(json.erro || 'Erro ao agendar')
      if (json.jaTemConta) setAba('entrar')
      if (json.sessaoExpirada) setLogado(null)
      if (json.horarioOcupado) { setHorario(''); setEtapa('horario'); carregarAgenda() }
      return
    }
    setSemAcesso(!!json.semAcesso)
    if (json.cliente?.nome) setLogado({ nome: json.cliente.nome })
    setMarcado({ inicio: json.agendamento.inicio, fim: json.agendamento.fim, profissional: profFinal?.nome ?? '' })
    setSenha('')
    setEtapa('sucesso')
  }

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    setLogado(null)
  }

  function novoAgendamento() {
    setEtapa('inicio'); setServico(null); setProfId(soUm ? profissionais[0].id : QUALQUER)
    setData(''); setHorario(''); setAgenda(null); setErro(''); setMarcado(null)
  }

  const dataFormatada = data ? new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : ''
  const fimHorario = horario && servico ? (() => { const [h, m] = horario.split(':').map(Number); const t = h * 60 + m + servico.duracao_min; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` })() : ''
  const mapa = barbearia.endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${barbearia.nome} ${barbearia.endereco}`)}` : null
  // Arquivo de calendário (.ics) do horário marcado
  const ics = marcado && servico ? (() => {
    const f = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//REGUA//Agendamento//PT', 'BEGIN:VEVENT',
      `UID:${marcado.inicio}-${barbearia.slug}@regua`, `DTSTAMP:${f(new Date().toISOString())}`,
      `DTSTART:${f(new Date(marcado.inicio).toISOString())}`, `DTEND:${f(new Date(marcado.fim).toISOString())}`,
      `SUMMARY:${servico.nome} na ${barbearia.nome}`, ...(barbearia.endereco ? [`LOCATION:${barbearia.endereco.replace(/,/g, '\\,')}`] : []),
      `DESCRIPTION:Com ${marcado.profissional}`, 'END:VEVENT', 'END:VCALENDAR']
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(linhas.join('\r\n'))}`
  })() : null

  const Resumo = () => servico && (
    <div className="ds-card p-3 flex items-center gap-3">
      <Foto src={servico.foto_url} alt="" className="w-11 h-11 rounded-button shrink-0"><Scissors size={16} className="text-fg-muted" aria-hidden /></Foto>
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm font-semibold text-fg truncate">{servico.nome}{profFinal ? ` · ${profFinal.nome}` : profId === QUALQUER && !horario ? '' : ''}</p>
        <p className="font-body text-xs text-fg-muted truncate first-letter:uppercase">
          {horario ? `${dataFormatada} · ${horario} – ${fimHorario}` : `${servico.duracao_min} min`}
        </p>
      </div>
      <p className="font-display text-sm font-semibold text-amber shrink-0 tabular-nums">{brl(servico.preco)}</p>
    </div>
  )

  const noFluxo = etapa !== 'inicio' && etapa !== 'sucesso'

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto pb-40">
        {/* ── Cabeçalho do fluxo ─────────────────────────────── */}
        {noFluxo && (
          <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur px-4 pt-4 pb-3">
            <div className="flex items-center gap-3">
              <button onClick={voltar} className="w-9 h-9 rounded-button border border-line flex items-center justify-center text-fg-muted hover:text-fg transition-colors" aria-label="Voltar">
                <ChevronLeft size={18} />
              </button>
              <div>
                <p className="ds-eyebrow">Passo {passo + 1} de {ordem.length}</p>
                <h1 className="font-display text-lg font-semibold text-fg leading-tight">
                  {etapa === 'profissional' ? 'Com quem?' : etapa === 'horario' ? 'Quando?' : 'Confirme o horário'}
                </h1>
              </div>
            </div>
            <div className="mt-3 flex gap-1" aria-hidden>
              {ordem.map((e, i) => <span key={e} className={`h-[3px] flex-1 rounded-full transition-colors ${i <= passo ? 'bg-amber' : 'bg-surface-alt'}`} />)}
            </div>
          </header>
        )}

        {/* ── Início: a barbearia ────────────────────────────── */}
        {etapa === 'inicio' && (
          <>
            <div className={`relative ${barbearia.capa_url ? 'h-44' : 'h-24'} bg-surface-alt overflow-hidden ds-grade`}>
              {barbearia.capa_url && <Image src={barbearia.capa_url} alt="" fill priority sizes="(max-width: 512px) 100vw, 512px" className="object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" aria-hidden />
            </div>
            <div className="px-4 -mt-10 relative">
              <div className="w-[68px] h-[68px] rounded-full border-2 border-bg bg-surface overflow-hidden flex items-center justify-center font-display text-2xl font-semibold text-amber relative">
                {barbearia.logo_url ? <Image src={barbearia.logo_url} alt={`Logo da ${barbearia.nome}`} fill sizes="68px" className="object-cover" /> : barbearia.nome.charAt(0).toUpperCase()}
              </div>
              <h1 className="font-display text-2xl font-semibold text-fg mt-2.5 leading-tight break-words">{barbearia.nome}</h1>
              {barbearia.endereco && <p className="flex items-center gap-1 font-body text-xs text-fg-muted mt-1"><MapPin size={12} aria-hidden /> {barbearia.endereco}</p>}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {avaliacoes && (
                  <span className="ds-tag border border-line text-fg">
                    <Star size={11} className="text-amber" fill="currentColor" aria-hidden /> {notaTexto(avaliacoes.media)}
                    <span className="text-fg-muted font-normal">({avaliacoes.total} avaliaç{avaliacoes.total === 1 ? 'ão' : 'ões'})</span>
                  </span>
                )}
                {situacao && (
                  <span className="ds-tag border border-line text-fg-muted">
                    <span className={`w-1.5 h-1.5 rounded-full ${situacao.aberta ? 'bg-entrada' : 'bg-fg-muted'}`} aria-hidden /> {situacao.texto}
                  </span>
                )}
                {barbearia.instagram && (
                  <a href={`https://instagram.com/${barbearia.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="ds-tag border border-line text-fg-muted hover:text-fg">
                    <Instagram size={11} aria-hidden /> @{barbearia.instagram.replace('@', '')}
                  </a>
                )}
                {barbearia.telefone && (
                  <a href={waLink(barbearia.telefone)} target="_blank" rel="noopener noreferrer" className="ds-tag border border-line text-fg-muted hover:text-fg">
                    <MessageCircle size={11} aria-hidden /> WhatsApp
                  </a>
                )}
              </div>

              {!aceitando ? (
                <div className="ds-card p-5 mt-6 text-center space-y-3">
                  <p className="font-display font-semibold text-fg">Agendamento online pausado</p>
                  <p className="font-body text-sm text-fg-muted">A barbearia não está recebendo agendamentos pelo link agora.</p>
                  {barbearia.telefone && <a href={waLink(barbearia.telefone, 'Oi! Queria marcar um horário.')} className="ds-btn-primary w-full"><MessageCircle size={15} aria-hidden /> Chamar no WhatsApp</a>}
                </div>
              ) : (
                <>
                  <div className="flex gap-5 mt-6 border-b border-line" role="tablist">
                    {([['servicos', 'Serviços'], ['sobre', 'Sobre'], ['equipe', 'Equipe']] as const).map(([v, t]) => (
                      <button key={v} role="tab" aria-selected={abaInicio === v} onClick={() => setAbaInicio(v)}
                        className={`pb-2.5 -mb-px border-b-2 font-display text-sm transition-colors ${abaInicio === v ? 'border-amber text-fg font-semibold' : 'border-transparent text-fg-muted hover:text-fg'}`}>
                        {t}
                      </button>
                    ))}
                  </div>

                  {abaInicio === 'servicos' && (
                    <div className="mt-4 space-y-2">
                      {logado && <p className="font-body text-sm text-fg-muted">Olá, {logado.nome.split(' ')[0]}. O que vai ser hoje?</p>}
                      {servicos.length === 0 && <p className="font-body text-sm text-fg-muted text-center py-8">A barbearia ainda não cadastrou os serviços.</p>}
                      {servicos.map(s => {
                        const ativo = servico?.id === s.id
                        return (
                          <button key={s.id} onClick={() => escolherServico(s)} aria-pressed={ativo}
                            className={`w-full flex items-center gap-3 text-left ds-card p-2.5 transition-colors active:scale-[0.99] ${ativo ? 'border-amber' : 'hover:border-fg/30'}`}>
                            <Foto src={s.foto_url} alt="" className="w-[68px] h-[68px] rounded-button shrink-0"><Scissors size={20} className="text-fg-muted" aria-hidden /></Foto>
                            <span className="flex-1 min-w-0">
                              <span className="block font-display text-[15px] font-semibold text-fg truncate">{s.nome}</span>
                              <span className="flex items-center gap-1 font-body text-xs text-fg-muted mt-0.5">
                                <Clock size={11} aria-hidden /> {s.duracao_min} min{s.descricao ? ` · ${s.descricao}` : ''}
                              </span>
                              <span className="block font-display text-sm font-semibold text-amber mt-1.5 tabular-nums">{brl(s.preco)}</span>
                            </span>
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${ativo ? 'bg-amber text-accent-fg' : 'border border-line text-fg-muted'}`} aria-hidden>
                              {ativo ? <Check size={16} /> : <Plus size={16} />}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {abaInicio === 'sobre' && (
                    <div className="mt-4 space-y-3">
                      <p className="font-body text-sm text-fg leading-relaxed whitespace-pre-line break-words">{barbearia.sobre || 'A barbearia ainda não escreveu sobre ela.'}</p>
                      {mapa && <a href={mapa} target="_blank" rel="noopener noreferrer" className="ds-btn-secondary w-full"><Navigation size={15} aria-hidden /> Como chegar</a>}
                      {galeria.length > 0 && (
                        <section>
                          <h2 className="ds-eyebrow mb-2 mt-5">Fotos</h2>
                          <div className="grid grid-cols-3 gap-1.5">
                            {galeria.map(u => (
                              <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="relative aspect-square rounded-button overflow-hidden bg-surface-alt border border-line">
                                <Image src={u} alt={`Foto da ${barbearia.nome}`} fill sizes="170px" className="object-cover" />
                              </a>
                            ))}
                          </div>
                        </section>
                      )}
                      {avaliacoes && avaliacoes.recentes.length > 0 && (
                        <section>
                          <h2 className="ds-eyebrow mb-2 mt-5">O que os clientes dizem</h2>
                          <ul className="space-y-2">
                            {avaliacoes.recentes.map((a, i) => (
                              <li key={i} className="ds-card p-3">
                                <p className="flex items-center gap-0.5 text-amber" aria-label={`${a.nota} de 5 estrelas`}>
                                  {Array.from({ length: 5 }, (_, k) => <Star key={k} size={12} fill={k < a.nota ? 'currentColor' : 'none'} className={k < a.nota ? '' : 'text-line'} aria-hidden />)}
                                </p>
                                <p className="font-body text-sm text-fg mt-1.5 break-words">{a.comentario}</p>
                                <p className="font-body text-xs text-fg-muted mt-1">{a.nome}</p>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                    </div>
                  )}

                  {abaInicio === 'equipe' && (
                    <ul className="mt-4 space-y-2">
                      {profissionais.map(p => (
                        <li key={p.id} className="ds-card p-3 flex items-center gap-3">
                          <Foto src={p.foto_url} alt={p.nome} className="w-12 h-12 rounded-full shrink-0"><span className="font-display font-semibold text-amber">{p.nome.charAt(0).toUpperCase()}</span></Foto>
                          <div className="min-w-0">
                            <p className="font-display text-sm font-semibold text-fg">{p.nome}</p>
                            {p.especialidade && <p className="font-body text-xs text-fg-muted truncate">{p.especialidade}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* ── Profissional ───────────────────────────────────── */}
        {etapa === 'profissional' && (
          <div className="px-4 pt-2 space-y-2">
            {[{ id: QUALQUER, nome: 'Qualquer profissional', foto_url: null, especialidade: 'Mostra o horário mais próximo' } as Profissional, ...profissionais].map(p => {
              const ativo = profId === p.id
              const livre = agenda ? proximoLivre(p.id === QUALQUER ? agenda.dias : agenda.porProfissional[p.id], dias) : null
              return (
                <button key={p.id} onClick={() => { setProfId(p.id); setHorario('') }} aria-pressed={ativo}
                  className={`w-full flex items-center gap-3 text-left ds-card p-3 transition-colors active:scale-[0.99] ${ativo ? 'border-amber' : 'hover:border-fg/30'}`}>
                  <Foto src={p.foto_url} alt="" className="w-12 h-12 rounded-full shrink-0">
                    {p.id === QUALQUER ? <Sparkles size={18} className="text-amber" aria-hidden /> : <span className="font-display font-semibold text-amber">{p.nome.charAt(0).toUpperCase()}</span>}
                  </Foto>
                  <span className="flex-1 min-w-0">
                    <span className="block font-display text-[15px] font-semibold text-fg">{p.nome}</span>
                    {p.especialidade && <span className="block font-body text-xs text-fg-muted truncate">{p.especialidade}</span>}
                    {avaliacoes?.porProfissional[p.id] && (
                      <span className="flex items-center gap-1 font-body text-[11px] text-fg-muted mt-0.5">
                        <Star size={10} className="text-amber" fill="currentColor" aria-hidden /> {notaTexto(avaliacoes.porProfissional[p.id].media)} ({avaliacoes.porProfissional[p.id].total})
                      </span>
                    )}
                    {agenda === null && !agendaErro
                      ? <span className="block ds-skeleton h-3 w-28 mt-1.5" />
                      : livre && <span className={`block font-body text-[11px] mt-1 ${livre.startsWith('Livre') ? 'text-entrada' : 'text-fg-muted'}`}>{livre}</span>}
                  </span>
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${ativo ? 'bg-amber border-amber' : 'border-line'}`} aria-hidden>
                    {ativo && <Check size={12} className="text-accent-fg" />}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Dia e horário ──────────────────────────────────── */}
        {etapa === 'horario' && (
          <div className="pt-2">
            <div className="flex gap-2 overflow-x-auto px-4 pb-2 snap-x" role="listbox" aria-label="Dia">
              {dias.map(d => {
                const ativo = d.iso === data
                const semVaga = diasDoProf !== null && !(diasDoProf[d.iso]?.length)
                return (
                  <button key={d.iso} role="option" aria-selected={ativo} disabled={semVaga && !ativo}
                    aria-label={semVaga ? `${d.semana} ${d.dia}: sem horário` : `${d.semana} ${d.dia}`}
                    onClick={() => { setData(d.iso); setHorario('') }}
                    className={`snap-start shrink-0 w-[60px] py-2.5 rounded-card border flex flex-col items-center transition-colors ${
                      ativo ? 'bg-amber border-amber text-accent-fg' : semVaga ? 'border-line/60 text-fg-muted opacity-35' : 'bg-surface border-line text-fg hover:border-fg/40'}`}>
                    <span className={`font-body text-[10px] font-semibold uppercase tracking-wider ${ativo ? '' : 'text-fg-muted'}`}>{d.semana}</span>
                    <span className="font-display text-xl font-semibold leading-tight tabular-nums">{d.dia}</span>
                    <span className={`font-body text-[10px] ${ativo ? '' : 'text-fg-muted'}`}>{d.mes}</span>
                  </button>
                )
              })}
            </div>

            <div className="px-4 mt-3">
              {agendaErro ? (
                <div className="text-center py-10 space-y-3">
                  <p className="font-body text-sm text-fg-muted">Não deu pra carregar os horários.</p>
                  <button onClick={() => carregarAgenda()} className="ds-btn-secondary">Tentar de novo</button>
                </div>
              ) : slots === null ? (
                <div className="grid grid-cols-4 gap-2" aria-busy>{Array.from({ length: 12 }).map((_, i) => <div key={i} className="ds-skeleton h-11" />)}</div>
              ) : !algumDiaLivre ? (
                <div className="text-center py-10 space-y-2">
                  <p className="font-display font-semibold text-fg">Agenda cheia nas próximas 3 semanas</p>
                  <p className="font-body text-sm text-fg-muted">{soUm ? 'Chama a barbearia no WhatsApp.' : 'Tenta com outro profissional ou chama a barbearia no WhatsApp.'}</p>
                </div>
              ) : slots.length === 0 ? (
                <p className="font-body text-sm text-fg-muted text-center py-10">Sem horário livre nesse dia. Os dias apagados estão cheios ou fechados.</p>
              ) : PERIODOS.map(([rotulo, de, ate]) => {
                const doPeriodo = slots.filter(h => { const hh = Number(h.slice(0, 2)); return hh >= de && hh < ate })
                if (!doPeriodo.length) return null
                return (
                  <section key={rotulo} className="mb-4">
                    <h2 className="ds-eyebrow mb-2">{rotulo}</h2>
                    <div className="grid grid-cols-4 gap-2">
                      {doPeriodo.map(h => (
                        <button key={h} onClick={() => setHorario(h)} aria-pressed={horario === h}
                          className={`h-11 rounded-button border font-display text-sm tabular-nums transition-colors ${horario === h ? 'bg-amber border-amber text-accent-fg font-semibold' : 'bg-surface border-line text-fg hover:border-fg/40'}`}>
                          {h}
                        </button>
                      ))}
                    </div>
                  </section>
                )
              })}
              {horario && <div className="mt-2"><Resumo /></div>}
            </div>
          </div>
        )}

        {/* ── Confirmar ──────────────────────────────────────── */}
        {etapa === 'dados' && (
          <div className="px-4 pt-2 space-y-4">
            <div className="ds-card overflow-hidden">
              {servico?.foto_url && <div className="relative h-24"><Image src={servico.foto_url} alt="" fill sizes="512px" className="object-cover" /></div>}
              <div className="p-4">
                <p className="font-display text-base font-semibold text-fg">{servico?.nome}</p>
                <p className="font-body text-sm text-fg-muted">com {profFinal?.nome} · {servico?.duracao_min} min</p>
                <p className="font-body text-sm text-fg mt-3 first-letter:uppercase">{dataFormatada}</p>
                <p className="font-display text-3xl font-semibold text-amber leading-tight tabular-nums">{horario}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                  <span className="font-body text-sm text-fg-muted">Paga na barbearia</span>
                  <span className="font-display font-semibold text-fg tabular-nums">{servico && brl(servico.preco)}</span>
                </div>
              </div>
            </div>

            {logado ? (
              <div className="ds-card px-4 py-3 flex items-center justify-between gap-3">
                <p className="font-body text-sm text-fg">Agendando como <strong className="font-semibold">{logado.nome}</strong></p>
                <button onClick={sair} className="flex items-center gap-1 font-body text-xs text-fg-muted hover:text-fg shrink-0"><LogOut size={12} aria-hidden /> Não sou eu</button>
              </div>
            ) : (
              <form id="form-cliente" onSubmit={confirmar} className="space-y-4">
                <div className="flex rounded-button border border-line overflow-hidden" role="tablist">
                  {([['novo', 'Primeira vez'], ['entrar', 'Já tenho conta']] as const).map(([v, t]) => (
                    <button key={v} type="button" role="tab" aria-selected={aba === v} onClick={() => { setAba(v); setErro('') }}
                      className={`flex-1 py-2.5 font-ui text-sm font-semibold transition-colors ${aba === v ? 'bg-surface-alt text-fg' : 'text-fg-muted hover:text-fg'}`}>{t}</button>
                  ))}
                </div>
                {aba === 'novo' && (
                  <div>
                    <label className="ds-label" htmlFor="nome">Seu nome</label>
                    <input id="nome" type="text" autoComplete="name" value={nome} onChange={e => setNome(e.target.value)} placeholder="João Silva" required minLength={2} className="ds-input !text-base" />
                  </div>
                )}
                <div>
                  <label className="ds-label" htmlFor="wa">WhatsApp com DDD</label>
                  <input id="wa" type="tel" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(75) 99999-0000" required className="ds-input !text-base" />
                </div>
                <div>
                  <label className="ds-label" htmlFor="senha">{aba === 'novo' ? 'Crie uma senha' : 'Sua senha'}</label>
                  <input id="senha" type="password" inputMode={aba === 'novo' ? 'numeric' : undefined} autoComplete={aba === 'novo' ? 'new-password' : 'current-password'}
                    value={senha} onChange={e => setSenha(e.target.value)} placeholder={aba === 'novo' ? 'mínimo 4 dígitos' : '••••'} required className="ds-input !text-base" />
                  {aba === 'novo'
                    ? <p className="font-body text-xs text-fg-muted mt-1.5">Serve pra ver e cancelar seus horários depois. Nada de 1234.</p>
                    : <Link href={`/recuperar-senha?b=${barbearia.slug}`} className="inline-block font-body text-xs text-fg-muted underline underline-offset-2 mt-1.5 hover:text-fg">Esqueci minha senha</Link>}
                </div>
                <p className="font-body text-[11px] text-fg-muted leading-relaxed">
                  Ao confirmar, você aceita os <Link href="/termos" target="_blank" className="underline hover:text-fg">Termos</Link> e
                  a <Link href="/privacidade" target="_blank" className="underline hover:text-fg">Privacidade</Link>
                  {lembreteAtivo ? ', e recebe a confirmação e o lembrete deste horário no WhatsApp' : ''}.
                </p>
              </form>
            )}
            {erro && <p className="font-body text-sm text-saida" role="alert">{erro}</p>}
          </div>
        )}

        {/* ── Pronto ─────────────────────────────────────────── */}
        {etapa === 'sucesso' && (
          <div className="px-4 pt-12 text-center">
            <div className="w-16 h-16 rounded-full bg-amber flex items-center justify-center mx-auto animate-in zoom-in-50 duration-300"><Check size={32} className="text-accent-fg" aria-hidden /></div>
            <h1 className="font-display text-2xl font-semibold text-fg mt-4">Horário marcado</h1>
            <p className="font-body text-sm text-fg-muted first-letter:uppercase">{dataFormatada} às {horario}</p>
            <div className="mt-6 text-left"><Resumo /></div>
            <div className="mt-3 space-y-2">
              {ics && <a href={ics} download="horario-barbearia.ics" className="ds-btn-secondary w-full"><CalendarPlus size={15} aria-hidden /> Adicionar ao calendário</a>}
              {mapa && <a href={mapa} target="_blank" rel="noopener noreferrer" className="ds-btn-secondary w-full"><Navigation size={15} aria-hidden /> Como chegar</a>}
            </div>
            <p className="font-body text-xs text-fg-muted mt-4 max-w-xs mx-auto">
              {semAcesso
                ? 'A barbearia já tinha seu cadastro. Pra ver e cancelar seus horários por aqui, pede pra ela te mandar o link de acesso.'
                : lembreteAtivo
                  ? 'A gente te lembra pelo WhatsApp 2 horas antes. Cancelamento até 1 hora antes, em Meus horários.'
                  : 'Anota o dia e o horário. Cancelamento até 1 hora antes, em Meus horários.'}
            </p>
            <button onClick={novoAgendamento} className="font-body text-sm text-amber underline underline-offset-4 mt-5">Marcar outro horário</button>
          </div>
        )}

        {etapa === 'inicio' && (
          <footer className="px-4 mt-12 text-center">
            <Link href={`/?ref=${barbearia.slug}`} className="inline-block font-body text-xs text-fg-muted hover:text-fg py-2">
              Agendamento por <span className="font-display font-semibold tracking-[0.12em] text-fg">RÉGUA</span> · Tem barbearia? <span className="underline">Teste grátis</span>
            </Link>
          </footer>
        )}
      </div>

      {/* ── Barra do próximo passo ───────────────────────────── */}
      {aceitando && etapa !== 'sucesso' && (etapa !== 'inicio' || servico) && (
        <div className={`fixed inset-x-0 z-30 px-4 ${etapa === 'inicio' ? 'bottom-[calc(3.6rem+env(safe-area-inset-bottom))]' : 'bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))]'} pt-3 bg-gradient-to-t from-bg via-bg to-transparent`}>
          <div className="max-w-lg mx-auto">
            {etapa === 'dados' ? (
              <button type={logado ? 'button' : 'submit'} form={logado ? undefined : 'form-cliente'} onClick={logado ? () => confirmar() : undefined} disabled={enviando} className="ds-btn-primary w-full !min-h-[52px] text-[15px]">
                {enviando ? 'Confirmando…' : 'Confirmar agendamento'}
              </button>
            ) : (
              <button onClick={avancar} disabled={etapa === 'horario' ? !horario : etapa === 'inicio' ? !servico : false} className="ds-btn-primary w-full !min-h-[52px] text-[15px]">
                {etapa === 'inicio' ? `Continuar · ${servico?.nome}` : etapa === 'horario' && !horario ? 'Escolha um horário' : 'Continuar'}
              </button>
            )}
          </div>
        </div>
      )}

      {(etapa === 'inicio' || etapa === 'sucesso') && <NavCliente slug={barbearia.slug} ativo="agendar" />}
    </div>
  )
}
