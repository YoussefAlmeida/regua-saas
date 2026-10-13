'use client'

import { useState, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Check, Clock, User, Scissors, Undo2, Lock } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'
import ContatoCliente from '@/components/contato-cliente'
import { mensagemStatus, statusAoDesfazer } from '@/lib/status-agendamento'

type Status = 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'faltou'

interface Profissional { id: string; nome: string; foto_url: string | null }
interface Bloqueio { id: string; profissional_id: string; inicio: string; fim: string; motivo: string | null }
interface Servico { id: string; nome: string; preco: number; duracao_min: number; cor: string }
export interface Agendamento {
  id: string
  inicio: string
  fim: string
  status: Status
  valor_servico: number
  observacao: string | null
  profissional: { id: string; nome: string } | null
  cliente: { nome: string; whatsapp: string | null } | null
  servico: { nome: string; duracao_min: number; cor: string } | null
}

const STATUS_CONFIG: Record<Status, { label: string; cor: string; fundo: string }> = {
  agendado:   { label: 'Agendado',   cor: 'text-amber',   fundo: 'bg-amber/10 border-amber/30' },
  confirmado: { label: 'Confirmado', cor: 'text-entrada',  fundo: 'bg-entrada/10 border-entrada/30' },
  concluido:  { label: 'Concluído',  cor: 'text-entrada',  fundo: 'bg-entrada/5 border-entrada/20' },
  cancelado:  { label: 'Cancelado',  cor: 'text-saida',    fundo: 'bg-saida/10 border-saida/30' },
  faltou:     { label: 'Faltou',     cor: 'text-fg-muted', fundo: 'bg-surface-alt border-line' },
}

function formatarData(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' })
}

function somarDias(data: string, n: number): string {
  const d = new Date(data + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE')
}

export default function AgendaClient({
  profissionaisIniciais,
  servicosIniciais,
  agendamentosIniciais,
  dataInicial,
}: {
  profissionaisIniciais: Profissional[]
  servicosIniciais: Servico[]
  agendamentosIniciais: Agendamento[]
  dataInicial: string
}) {
  const [data, setData] = useState(dataInicial)
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(agendamentosIniciais)
  const [profissionais] = useState(profissionaisIniciais)
  const [servicos] = useState(servicosIniciais)
  const [carregando, setCarregando] = useState(false)
  const [selecionado, setSelecionado] = useState<Agendamento | null>(null)
  const [modalNovo, setModalNovo] = useState(false)
  const [tabProfissional, setTabProfissional] = useState(0)

  // Formulário novo agendamento
  const [novoForm, setNovoForm] = useState({
    profissional_id: profissionaisIniciais[0]?.id ?? '',
    servico_id: '',
    inicio: '',
    cliente_nome: '',
    cliente_whatsapp: '',
    observacao: '',
  })
  const [novoErro, setNovoErro] = useState('')
  const [novoSalvando, setNovoSalvando] = useState(false)

  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([])

  const buscarBloqueios = useCallback(async (d: string) => {
    const res = await fetch(`/api/painel/bloqueios?data=${d}`).catch(() => null)
    if (res?.ok) setBloqueios(await res.json())
  }, [])

  useEffect(() => { buscarBloqueios(dataInicial) }, [dataInicial, buscarBloqueios])

  const buscarAgendamentos = useCallback(async (d: string) => {
    setCarregando(true)
    buscarBloqueios(d)
    const res = await fetch(`/api/painel/agendamentos?data=${d}`).catch(() => null)
    setCarregando(false)
    if (!res?.ok) { avisar('Não deu pra carregar a agenda. Confere a internet.', 'erro'); return }
    setAgendamentos(await res.json())
  }, [buscarBloqueios])

  function navegar(n: number) {
    const nova = somarDias(data, n)
    setData(nova)
    buscarAgendamentos(nova)
  }

  const [salvandoStatus, setSalvandoStatus] = useState(false)

  async function atualizarStatus(id: string, status: Status) {
    if (status === 'cancelado' && !confirm('Cancelar esse agendamento? O horário volta a ficar livre.')) return
    setSalvandoStatus(true)
    const res = await fetch(`/api/painel/agendamentos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => null)
    setSalvandoStatus(false)

    if (!res) { avisar('Sem conexão. Confere a internet e tenta de novo.', 'erro'); return }
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }

    const json = await res.json()
    setAgendamentos(prev => prev.map(a => a.id === id ? json : a))
    setSelecionado(null)
    avisar(mensagemStatus(status, json.entrada, json.valor_servico), 'sucesso')
  }

  async function criarAgendamento(e: React.FormEvent) {
    e.preventDefault()
    setNovoErro('')
    if (!novoForm.profissional_id || !novoForm.servico_id || !novoForm.inicio) {
      setNovoErro('Preencha profissional, serviço e horário')
      return
    }
    setNovoSalvando(true)

    const [h, m] = novoForm.inicio.split(':').map(Number)
    const inicioDate = new Date(`${data}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-03:00`)

    const res = await fetch('/api/painel/agendamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profissional_id: novoForm.profissional_id,
        servico_id: novoForm.servico_id,
        inicio: inicioDate.toISOString(),
        cliente_nome: novoForm.cliente_nome || undefined,
        cliente_whatsapp: novoForm.cliente_whatsapp || undefined,
        observacao: novoForm.observacao || undefined,
      }),
    })

    const json = await res.json()
    setNovoSalvando(false)

    if (!res.ok) { setNovoErro(json.erro || 'Erro ao criar agendamento'); return }
    setAgendamentos(prev => [...prev, json].sort((a, b) => a.inicio.localeCompare(b.inicio)))
    setModalNovo(false)
    avisar(`Agendado às ${formatarHora(json.inicio)}.`, 'sucesso')
    setNovoForm({ profissional_id: profissionaisIniciais[0]?.id ?? '', servico_id: '', inicio: '', cliente_nome: '', cliente_whatsapp: '', observacao: '' })
  }

  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
  const profAtual = profissionais[tabProfissional]
  const agsProfAtual = agendamentos.filter(a => a.profissional?.id === profAtual?.id)
  const bloqsProfAtual = bloqueios.filter(b => b.profissional_id === profAtual?.id)
  // Linha do tempo do barbeiro: agendamentos e bloqueios na ordem do relógio
  const linha: ({ tipo: 'ag'; item: Agendamento } | { tipo: 'bloq'; item: Bloqueio })[] = [
    ...agsProfAtual.map(item => ({ tipo: 'ag' as const, item })),
    ...bloqsProfAtual.map(item => ({ tipo: 'bloq' as const, item })),
  ].sort((a, b) => a.item.inicio.localeCompare(b.item.inicio))

  const inputCls = 'w-full bg-bg border border-line rounded-button px-3 py-2 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber'
  const labelCls = 'font-ui text-xs uppercase tracking-wider text-fg-muted block mb-1'

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      {/* Header navegação de data */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-surface shrink-0">
        <button onClick={() => navegar(-1)} className="p-1.5 text-fg-muted hover:text-fg transition-colors">
          <ChevronLeft size={18} />
        </button>

        <div className="text-center">
          <p className="font-ui text-sm uppercase tracking-wider text-fg">{formatarData(data)}</p>
          {data === hoje && (
            <span className="font-body text-xs text-amber">Hoje</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {data !== hoje && (
            <button
              onClick={() => { setData(hoje); buscarAgendamentos(hoje) }}
              className="font-ui text-xs uppercase tracking-wider text-amber hover:underline px-2"
            >
              Hoje
            </button>
          )}
          <button onClick={() => navegar(1)} className="p-1.5 text-fg-muted hover:text-fg transition-colors">
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => setModalNovo(true)}
            className="flex items-center gap-1.5 bg-amber hover:bg-accent-press text-accent-fg font-ui text-xs uppercase tracking-wider px-3 py-2 rounded-button transition-colors ml-2"
          >
            <Plus size={13} />
            Novo
          </button>
        </div>
      </div>

      {/* Tabs de profissionais */}
      {profissionais.length > 0 && (
        <div className="flex border-b border-line bg-surface shrink-0 overflow-x-auto">
          {profissionais.map((p, i) => {
            const total = agendamentos.filter(a => a.profissional?.id === p.id).length
            return (
              <button
                key={p.id}
                onClick={() => setTabProfissional(i)}
                className={`flex items-center gap-2 px-4 py-3 font-ui text-xs uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                  i === tabProfissional ? 'border-amber text-fg' : 'border-transparent text-fg-muted hover:text-fg'
                }`}
              >
                {p.nome}
                {total > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${i === tabProfissional ? 'bg-amber text-accent-fg' : 'bg-surface-alt text-fg-muted'}`}>
                    {total}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Lista de agendamentos do profissional selecionado */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <p className="font-ui text-sm text-fg-muted uppercase tracking-wider animate-pulse">Carregando…</p>
          </div>
        ) : profissionais.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-ui text-sm text-fg-muted uppercase tracking-wider">Nenhum barbeiro cadastrado</p>
          </div>
        ) : linha.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-ui text-sm text-fg-muted uppercase tracking-wider mb-2">Dia livre</p>
            <button
              onClick={() => setModalNovo(true)}
              className="text-amber font-body text-sm hover:underline"
            >
              Adicionar agendamento
            </button>
          </div>
        ) : (
          linha.map(entrada => {
            if (entrada.tipo === 'bloq') {
              const b = entrada.item
              const ini = new Date(b.inicio), fim = new Date(b.fim)
              const diaTodo = fim.getTime() - ini.getTime() >= 20 * 60 * 60 * 1000
              return (
                <div key={`b-${b.id}`} className="flex items-center gap-3 border border-dashed border-line rounded-card px-4 py-3 bg-surface-alt/40">
                  <Lock size={14} className="text-fg-muted shrink-0" />
                  <div className="min-w-0">
                    <p className="font-ui text-xs uppercase tracking-wider text-fg-muted">
                      Bloqueado · {diaTodo ? 'dia inteiro' : `${formatarHora(b.inicio)} – ${formatarHora(b.fim)}`}
                    </p>
                    {b.motivo && <p className="font-body text-xs text-fg-muted truncate">{b.motivo}</p>}
                  </div>
                </div>
              )
            }
            const ag = entrada.item
            const st = STATUS_CONFIG[ag.status]
            return (
              <button
                key={ag.id}
                onClick={() => setSelecionado(ag)}
                className={`w-full text-left bg-surface border rounded-card px-4 py-4 ${st.fundo} transition-colors hover:opacity-90`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0 mt-1"
                    style={{ backgroundColor: ag.servico?.cor ?? '#E8B04B' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-ui text-sm uppercase tracking-wider text-fg truncate">
                        {ag.cliente?.nome ?? '—'}
                      </p>
                      <span className={`font-ui text-[10px] uppercase tracking-wider ${st.cor} shrink-0`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 font-body text-xs text-fg-muted">
                        <Clock size={10} /> {formatarHora(ag.inicio)}
                      </span>
                      <span className="font-body text-xs text-fg-muted truncate">{ag.servico?.nome}</span>
                    </div>
                    <p className="font-mono text-xs text-amber mt-0.5">R$ {ag.valor_servico.toFixed(2)}</p>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Modal detalhes do agendamento */}
      {selecionado && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelecionado(null)} />
          <div className="relative w-full max-w-md bg-surface rounded-t-card border border-line p-6 z-10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-ui text-lg uppercase tracking-wider text-fg">Agendamento</h2>
              <button onClick={() => setSelecionado(null)} className="text-fg-muted hover:text-fg">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User size={14} className="text-fg-muted" />
                <p className="font-body text-sm text-fg">{selecionado.cliente?.nome ?? '—'}</p>
                {selecionado.cliente?.whatsapp && (
                  <span className="font-body text-xs text-fg-muted">· {selecionado.cliente.whatsapp}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Scissors size={14} className="text-fg-muted" />
                <p className="font-body text-sm text-fg">{selecionado.servico?.nome ?? '—'}</p>
                <span className="font-mono text-xs text-amber">R$ {selecionado.valor_servico.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-fg-muted" />
                <p className="font-body text-sm text-fg">
                  {formatarHora(selecionado.inicio)} – {formatarHora(selecionado.fim)}
                </p>
              </div>
              {selecionado.observacao && (
                <p className="font-body text-xs text-fg-muted bg-surface-alt rounded-button px-3 py-2">{selecionado.observacao}</p>
              )}
            </div>

            <ContatoCliente
              whatsapp={selecionado.cliente?.whatsapp}
              mensagem={`Oi, ${selecionado.cliente?.nome?.split(' ')[0] ?? ''}! Sobre seu horário das ${formatarHora(selecionado.inicio)}:`}
            />

            {/* Ações por status */}
            {selecionado.status === 'agendado' && (
              <div className="flex gap-2">
                <button
                  onClick={() => atualizarStatus(selecionado.id, 'confirmado')}
                  disabled={salvandoStatus}
                  className="flex-1 flex items-center justify-center gap-2 bg-entrada/10 hover:bg-entrada/20 border border-entrada/30 text-entrada font-ui text-xs uppercase tracking-wider py-2.5 rounded-button transition-colors"
                >
                  <Check size={13} /> Confirmar
                </button>
                <button
                  onClick={() => atualizarStatus(selecionado.id, 'cancelado')}
                  disabled={salvandoStatus}
                  className="flex-1 bg-saida/10 hover:bg-saida/20 border border-saida/30 text-saida font-ui text-xs uppercase tracking-wider py-2.5 rounded-button transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
            {selecionado.status === 'confirmado' && (
              <div className="flex gap-2">
                <button
                  onClick={() => atualizarStatus(selecionado.id, 'concluido')}
                  disabled={salvandoStatus}
                  className="flex-1 bg-amber hover:bg-accent-press text-accent-fg font-ui text-xs uppercase tracking-wider py-2.5 rounded-button transition-colors"
                >
                  Concluir atendimento
                </button>
                <button
                  onClick={() => atualizarStatus(selecionado.id, 'faltou')}
                  disabled={salvandoStatus}
                  className="px-4 bg-surface-alt border border-line text-fg-muted font-ui text-xs uppercase tracking-wider py-2.5 rounded-button transition-colors"
                >
                  Faltou
                </button>
              </div>
            )}
            {(() => {
              const voltarPara = statusAoDesfazer(selecionado.status)
              if (!voltarPara) return null
              return (
                <div className="space-y-3">
                  <p className={`text-center font-ui text-sm uppercase tracking-wider ${STATUS_CONFIG[selecionado.status].cor}`}>
                    {STATUS_CONFIG[selecionado.status].label}
                  </p>
                  <button
                    onClick={() => atualizarStatus(selecionado.id, voltarPara)}
                    disabled={salvandoStatus}
                    className="w-full flex items-center justify-center gap-2 border border-line text-fg-muted hover:text-fg font-ui text-xs uppercase tracking-wider py-2.5 rounded-button transition-colors disabled:opacity-50"
                  >
                    <Undo2 size={13} />
                    {selecionado.status === 'concluido' ? 'Desfazer — tira a entrada do caixa' : 'Desfazer'}
                  </button>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Modal novo agendamento */}
      {modalNovo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setModalNovo(false); setNovoErro('') }} />
          <div className="relative w-full max-w-md bg-surface rounded-t-card border border-line p-6 z-10 max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-ui text-lg uppercase tracking-wider text-fg">Novo agendamento</h2>
              <button onClick={() => { setModalNovo(false); setNovoErro('') }} className="text-fg-muted hover:text-fg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={criarAgendamento} className="space-y-4">
              <div>
                <label className={labelCls}>Barbeiro</label>
                <select
                  value={novoForm.profissional_id}
                  onChange={e => setNovoForm(f => ({ ...f, profissional_id: e.target.value }))}
                  className={inputCls}
                >
                  {profissionais.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Serviço</label>
                <select
                  value={novoForm.servico_id}
                  onChange={e => setNovoForm(f => ({ ...f, servico_id: e.target.value }))}
                  required
                  className={inputCls}
                >
                  <option value="">Selecione…</option>
                  {servicos.map(s => (
                    <option key={s.id} value={s.id}>{s.nome} — R$ {s.preco.toFixed(2)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Horário</label>
                <input
                  type="time"
                  value={novoForm.inicio}
                  onChange={e => setNovoForm(f => ({ ...f, inicio: e.target.value }))}
                  required
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Nome do cliente</label>
                <input
                  type="text"
                  value={novoForm.cliente_nome}
                  onChange={e => setNovoForm(f => ({ ...f, cliente_nome: e.target.value }))}
                  placeholder="João Silva"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>WhatsApp do cliente</label>
                <input
                  type="tel"
                  value={novoForm.cliente_whatsapp}
                  onChange={e => setNovoForm(f => ({ ...f, cliente_whatsapp: e.target.value }))}
                  placeholder="(71) 99999-0000"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Observação</label>
                <input
                  type="text"
                  value={novoForm.observacao}
                  onChange={e => setNovoForm(f => ({ ...f, observacao: e.target.value }))}
                  placeholder="Opcional"
                  className={inputCls}
                />
              </div>

              {novoErro && <p className="font-body text-sm text-saida">{novoErro}</p>}

              <button
                type="submit"
                disabled={novoSalvando}
                className="w-full bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm uppercase tracking-wider py-3 rounded-button transition-colors disabled:opacity-50"
              >
                {novoSalvando ? 'Criando…' : 'Criar agendamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
