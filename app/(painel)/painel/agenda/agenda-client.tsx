'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Check, Clock, User, Scissors, Undo2, Lock, CalendarClock } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'
import ContatoCliente from '@/components/contato-cliente'
import { mensagemStatus, statusAoDesfazer } from '@/lib/status-agendamento'
import { pedirSenha } from '@/components/confirmar-senha'
import { formatBRL } from '@/lib/utils'
import GradeAgenda, { type ColunaGrade, type EventoGrade, type BloqueioGrade } from '@/components/agenda/grade'

type Status = 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'faltou'

interface Profissional { id: string; nome: string; foto_url: string | null; ativo: boolean }
interface Bloqueio { id: string; profissional_id: string | null; inicio: string; fim: string; motivo: string | null }
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
  confirmado: { label: 'Agendado',   cor: 'text-amber',   fundo: 'bg-amber/10 border-amber/30' },
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

/** Dia (YYYY-MM-DD) e minutos do dia de um instante, no horário da barbearia */
function dataLocal(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
}
function minutosLocais(iso: string): number {
  const [h, m] = new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia', hourCycle: 'h23' }).split(':').map(Number)
  return h * 60 + m
}
/** Segunda-feira da semana desse dia */
function segundaDe(data: string): string {
  const dia = new Date(data + 'T12:00:00').getDay()        // 0 = domingo
  return somarDias(data, -((dia + 6) % 7))
}
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

type Visao = 'dia' | 'semana'

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
  const [visao, setVisao] = useState<Visao>('dia')
  // Remarcar o horário aberto no detalhe
  const [remarcar, setRemarcar] = useState<{ dia: string; hora: string; profissional_id: string } | null>(null)
  const [remarcando, setRemarcando] = useState(false)

  // Formulário novo agendamento
  const [novoForm, setNovoForm] = useState({
    profissional_id: profissionaisIniciais.find(p => p.ativo)?.id ?? '',
    servico_id: '',
    dia: dataInicial,
    inicio: '',
    cliente_whatsapp: '',
    observacao: '',
  })
  const [novoErro, setNovoErro] = useState('')
  // WhatsApp sem cadastro: mostra o atalho pra mandar o link de agendamento
  const [convidar, setConvidar] = useState<{ whatsapp: string; slug: string } | null>(null)
  const [novoSalvando, setNovoSalvando] = useState(false)

  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([])

  const buscarBloqueios = useCallback(async (d: string, dias = 1) => {
    const res = await fetch(`/api/painel/bloqueios?data=${d}&dias=${dias}`).catch(() => null)
    if (res?.ok) setBloqueios(await res.json())
  }, [])

  useEffect(() => { buscarBloqueios(dataInicial) }, [dataInicial, buscarBloqueios])

  // Na semana, carrega de segunda a domingo de uma vez
  const buscarAgendamentos = useCallback(async (d: string, v: Visao = 'dia') => {
    setCarregando(true)
    const de = v === 'semana' ? segundaDe(d) : d, dias = v === 'semana' ? 7 : 1
    buscarBloqueios(de, dias)
    const res = await fetch(`/api/painel/agendamentos?data=${de}&dias=${dias}`).catch(() => null)
    setCarregando(false)
    if (!res?.ok) { avisar('Não deu pra carregar a agenda. Confere a internet.', 'erro'); return }
    setAgendamentos(await res.json())
  }, [buscarBloqueios])

  function navegar(n: number) {
    const nova = somarDias(data, visao === 'semana' ? n * 7 : n)
    setData(nova)
    buscarAgendamentos(nova, visao)
  }

  function trocarVisao(v: Visao) {
    if (v === visao) return
    setVisao(v)
    buscarAgendamentos(data, v)
  }

  function abrirNovo(profissional_id?: string, dia = data, minuto?: number) {
    setNovoErro('')
    setConvidar(null)
    setNovoForm(f => ({
      ...f,
      profissional_id: profissional_id ?? (f.profissional_id || (profissionais.find(p => p.ativo)?.id ?? '')),
      dia,
      inicio: minuto === undefined ? f.inicio : hhmm(minuto),
    }))
    setModalNovo(true)
  }

  function fecharDetalhe() { setSelecionado(null); setRemarcar(null) }

  async function salvarRemarcacao() {
    if (!selecionado || !remarcar) return
    if (!remarcar.dia || !remarcar.hora) { avisar('Escolha o dia e o horário novos.', 'erro'); return }
    setRemarcando(true)
    const res = await fetch(`/api/painel/agendamentos/${selecionado.id}/reagendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inicio: `${remarcar.dia}T${remarcar.hora}:00-03:00`,
        ...(remarcar.profissional_id !== selecionado.profissional?.id ? { profissional_id: remarcar.profissional_id } : {}),
      }),
    }).catch(() => null)
    setRemarcando(false)
    if (!res) { avisar('Sem conexão. Confere a internet e tenta de novo.', 'erro'); return }
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    const json: Agendamento = await res.json()
    // Saiu do período que está na tela? Some da lista; senão, atualiza no lugar
    const diaNovo = dataLocal(json.inicio)
    const visivel = visao === 'dia' ? diaNovo === data : diaNovo >= segundaDe(data) && diaNovo <= somarDias(segundaDe(data), 6)
    setAgendamentos(prev => (visivel ? prev.map(a => a.id === json.id ? json : a) : prev.filter(a => a.id !== json.id))
      .sort((a, b) => a.inicio.localeCompare(b.inicio)))
    fecharDetalhe()
    avisar(`Remarcado para ${formatarData(diaNovo)} às ${formatarHora(json.inicio)}. Avise o cliente.`, 'sucesso')
  }

  const [salvandoStatus, setSalvandoStatus] = useState(false)

  async function atualizarStatus(id: string, status: Status, senha?: string) {
    if (!senha && status === 'cancelado' && !confirm('Cancelar esse agendamento? O horário volta a ficar livre.')) return
    setSalvandoStatus(true)
    const res = await fetch(`/api/painel/agendamentos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, senha }),
    }).catch(() => null)
    setSalvandoStatus(false)

    // Desfazer atendimento de outro dia tira dinheiro do caixa: pede a senha do dono
    if (res?.status === 401) {
      const json = await res.clone().json().catch(() => null)
      if (json?.pedirSenha) {
        const s = await pedirSenha('Desfazer atendimento já lançado', senha ? 'Senha incorreta. Tente de novo.' : 'A entrada é de outro dia e sai do caixa. Confirme com sua senha.')
        if (s) await atualizarStatus(id, status, s)
        return
      }
    }

    if (!res) { avisar('Sem conexão. Confere a internet e tenta de novo.', 'erro'); return }
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }

    const json = await res.json()
    // Cancelado sai da agenda
    setAgendamentos(prev => status === 'cancelado' ? prev.filter(a => a.id !== id) : prev.map(a => a.id === id ? json : a))
    fecharDetalhe()
    avisar(mensagemStatus(status, json.entrada, json.valor_servico), 'sucesso')
  }

  async function criarAgendamento(e: React.FormEvent) {
    e.preventDefault()
    setNovoErro('')
    setConvidar(null)
    if (!novoForm.profissional_id || !novoForm.servico_id || !novoForm.inicio) {
      setNovoErro('Preencha profissional, serviço e horário')
      return
    }
    setNovoSalvando(true)

    const [h, m] = novoForm.inicio.split(':').map(Number)
    const inicioDate = new Date(`${novoForm.dia || data}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-03:00`)

    const res = await fetch('/api/painel/agendamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profissional_id: novoForm.profissional_id,
        servico_id: novoForm.servico_id,
        inicio: inicioDate.toISOString(),
        cliente_whatsapp: novoForm.cliente_whatsapp || undefined,
        observacao: novoForm.observacao || undefined,
      }),
    })

    const json = await res.json()
    setNovoSalvando(false)

    if (!res.ok) {
      setNovoErro(json.erro || 'Erro ao criar agendamento')
      if (json.semCadastro && json.slug) setConvidar({ whatsapp: json.whatsapp, slug: json.slug })
      return
    }
    // Só entra na tela se cair no período que está aberto
    const diaCriado = dataLocal(json.inicio)
    if (visao === 'dia' ? diaCriado === data : diaCriado >= segundaDe(data) && diaCriado <= somarDias(segundaDe(data), 6)) {
      setAgendamentos(prev => [...prev, json].sort((a, b) => a.inicio.localeCompare(b.inicio)))
    }
    setModalNovo(false)
    avisar(`Agendado às ${formatarHora(json.inicio)}.`, 'sucesso')
    setNovoForm({ profissional_id: profissionaisIniciais.find(p => p.ativo)?.id ?? '', servico_id: '', dia: data, inicio: '', cliente_whatsapp: '', observacao: '' })
  }

  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
  const profAtual = profissionais[tabProfissional]
  const agsProfAtual = agendamentos.filter(a => a.profissional?.id === profAtual?.id)
  // Bloqueios do barbeiro + os da barbearia toda (sem profissional)
  const bloqsProfAtual = bloqueios.filter(b => b.profissional_id === profAtual?.id || b.profissional_id === null)
  // Linha do tempo do barbeiro: agendamentos e bloqueios na ordem do relógio
  const linha: ({ tipo: 'ag'; item: Agendamento } | { tipo: 'bloq'; item: Bloqueio })[] = [
    ...agsProfAtual.map(item => ({ tipo: 'ag' as const, item })),
    ...bloqsProfAtual.map(item => ({ tipo: 'bloq' as const, item })),
  ].sort((a, b) => a.item.inicio.localeCompare(b.item.inicio))

  // ── Grade (dia: uma coluna por barbeiro · semana: uma coluna por dia do barbeiro da aba) ──
  const semana = useMemo(() => Array.from({ length: 7 }, (_, i) => somarDias(segundaDe(data), i)), [data])
  const agoraMin = minutosLocais(new Date().toISOString())
  const grade = useMemo(() => {
    const DIA_MS = 86_400_000
    const inicioDoDia = (d: string) => new Date(`${d}T00:00:00-03:00`).getTime()
    const colunas: ColunaGrade[] = visao === 'dia'
      ? profissionais.map(p => ({
          id: p.id, titulo: p.nome, apagada: !p.ativo,
          sub: !p.ativo ? 'fora da agenda' : `${agendamentos.filter(a => a.profissional?.id === p.id).length} marcado(s)`,
        }))
      : semana.map(d => ({
          id: d, destaque: d === hoje,
          titulo: new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
          sub: `${d.slice(8, 10)}/${d.slice(5, 7)}`,
        }))
    const daAba = (a: Agendamento) => a.profissional?.id === profAtual?.id
    const eventos: EventoGrade[] = agendamentos
      .filter(a => visao === 'dia' ? dataLocal(a.inicio) === data : daAba(a))
      .map(a => {
        const ini = minutosLocais(a.inicio)
        return {
          id: a.id,
          coluna: visao === 'dia' ? a.profissional?.id ?? '' : dataLocal(a.inicio),
          ini, fim: ini + Math.max(15, Math.round((new Date(a.fim).getTime() - new Date(a.inicio).getTime()) / 60_000)),
          titulo: a.cliente?.nome ?? '—',
          detalhe: a.servico?.nome ?? '',
          cor: a.servico?.cor ?? '#F5D900',
          estado: a.status === 'concluido' ? 'concluido' : a.status === 'faltou' ? 'faltou' : 'aberto',
        }
      })
    // Bloqueio pode atravessar dias: recorta o pedaço de cada dia mostrado
    const dias = visao === 'dia' ? [data] : semana
    const bloqs: BloqueioGrade[] = []
    for (const b of bloqueios) {
      const bi = new Date(b.inicio).getTime(), bf = new Date(b.fim).getTime()
      for (const d of dias) {
        const d0 = inicioDoDia(d), a = Math.max(bi, d0), z = Math.min(bf, d0 + DIA_MS)
        if (z <= a) continue
        const faixa = { ini: Math.round((a - d0) / 60_000), fim: Math.round((z - d0) / 60_000), rotulo: b.motivo || (b.profissional_id === null ? 'Barbearia fechada' : 'Bloqueado') }
        if (visao === 'dia') {
          for (const p of profissionais) if (b.profissional_id === null || b.profissional_id === p.id) bloqs.push({ id: `${b.id}-${p.id}`, coluna: p.id, ...faixa })
        } else if (b.profissional_id === null || b.profissional_id === profAtual?.id) {
          bloqs.push({ id: `${b.id}-${d}`, coluna: d, ...faixa })
        }
      }
    }
    // Faixa de horas: 07h–21h, esticando se houver horário marcado fora disso
    const ini = Math.min(7 * 60, ...eventos.map(e => Math.floor(e.ini / 60) * 60))
    const fim = Math.max(21 * 60, ...eventos.map(e => Math.min(24 * 60, Math.ceil(e.fim / 60) * 60)))
    return { colunas, eventos, bloqs, ini, fim }
  }, [visao, profissionais, agendamentos, bloqueios, data, semana, hoje, profAtual])

  const rotuloPeriodo = visao === 'dia'
    ? formatarData(data)
    : `${semana[0].slice(8, 10)}/${semana[0].slice(5, 7)} a ${semana[6].slice(8, 10)}/${semana[6].slice(5, 7)}`

  const inputCls = 'w-full bg-surface border border-line rounded-button px-3 py-2 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber'
  const labelCls = 'font-ui text-sm font-medium text-fg block mb-1.5'

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem-5.5rem)] md:h-[calc(100dvh-3.5rem)]">
      {/* Header navegação de data */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 md:px-4 py-3 border-b border-line bg-surface shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={() => navegar(-1)} className="p-1.5 text-fg-muted hover:text-fg transition-colors" aria-label={visao === 'dia' ? 'Dia anterior' : 'Semana anterior'}>
            <ChevronLeft size={18} />
          </button>
          <div className="text-center min-w-[6.5rem] md:min-w-[7.5rem]">
            <p className="font-semibold font-ui text-sm text-fg first-letter:uppercase">{rotuloPeriodo}</p>
            {(visao === 'dia' ? data === hoje : semana.includes(hoje)) && (
              <span className="font-body text-xs text-amber">{visao === 'dia' ? 'Hoje' : 'Esta semana'}</span>
            )}
          </div>
          <button onClick={() => navegar(1)} className="p-1.5 text-fg-muted hover:text-fg transition-colors" aria-label={visao === 'dia' ? 'Próximo dia' : 'Próxima semana'}>
            <ChevronRight size={18} />
          </button>
          {!(visao === 'dia' ? data === hoje : semana.includes(hoje)) && (
            <button
              onClick={() => { setData(hoje); buscarAgendamentos(hoje, visao) }}
              className="font-ui text-xs uppercase tracking-wider text-amber hover:underline px-2"
            >
              Hoje
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-button border border-line overflow-hidden" role="tablist" aria-label="Visão da agenda">
            {(['dia', 'semana'] as const).map(v => (
              <button
                key={v}
                role="tab"
                aria-selected={visao === v}
                onClick={() => trocarVisao(v)}
                className={`px-3 py-1.5 font-ui text-xs font-semibold capitalize transition-colors ${visao === v ? 'bg-amber text-accent-fg' : 'text-fg-muted hover:text-fg'}`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => abrirNovo()}
            className="font-semibold flex items-center gap-1.5 bg-amber hover:bg-accent-press text-accent-fg font-ui text-xs px-3 py-2 rounded-button transition-colors"
          >
            <Plus size={13} />
            Novo
          </button>
        </div>
      </div>

      {/* Tabs de profissionais */}
      {profissionais.length > 0 && (
        <div className={`${visao === 'dia' ? 'flex md:hidden' : 'flex'} border-b border-line bg-surface shrink-0 overflow-x-auto`}>
          {profissionais.map((p, i) => {
            const total = agendamentos.filter(a => a.profissional?.id === p.id && a.status !== 'faltou').length
            return (
              <button
                key={p.id}
                onClick={() => setTabProfissional(i)}
                className={`flex items-center gap-2 px-4 py-3 font-ui text-xs uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                  i === tabProfissional ? 'border-amber text-fg' : 'border-transparent text-fg-muted hover:text-fg'
                }`}
              >
                {p.nome}
                {!p.ativo && <span className="normal-case text-[10px] text-fg-muted">(fora)</span>}
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

      {/* Grade: semana (sempre) e dia no computador */}
      {profissionais.length > 0 && (
        <div className={`flex-1 min-h-0 bg-bg ${visao === 'dia' ? 'hidden md:block' : ''} ${carregando ? 'opacity-50' : ''}`} aria-busy={carregando}>
          <GradeAgenda
            colunas={grade.colunas}
            eventos={grade.eventos}
            bloqueios={grade.bloqs}
            inicio={grade.ini}
            fim={grade.fim}
            larguraMin={visao === 'dia' ? 170 : 104}
            agora={visao === 'dia'
              ? (data === hoje ? { coluna: '*', min: agoraMin } : null)
              : semana.includes(hoje) ? { coluna: hoje, min: agoraMin } : null}
            onEvento={id => { const a = agendamentos.find(x => x.id === id); if (a) setSelecionado(a) }}
            onVazio={(coluna, min) => visao === 'dia'
              ? (profissionais.find(p => p.id === coluna)?.ativo ? abrirNovo(coluna, data, min) : avisar('Esse barbeiro está fora da agenda e não recebe horário novo.', 'info'))
              : (profAtual?.ativo ? abrirNovo(profAtual.id, coluna, min) : avisar('Esse barbeiro está fora da agenda e não recebe horário novo.', 'info'))}
          />
        </div>
      )}

      {/* Lista do dia (celular): agendamentos do profissional da aba */}
      <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-3 ${visao === 'dia' ? (profissionais.length > 0 ? 'md:hidden' : '') : 'hidden'}`}>
        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <p className="font-semibold font-ui text-sm text-fg-muted animate-pulse">Carregando…</p>
          </div>
        ) : profissionais.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-semibold font-ui text-sm text-fg-muted">Nenhum barbeiro cadastrado</p>
          </div>
        ) : linha.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-semibold font-ui text-sm text-fg-muted mb-2">Dia livre</p>
            {profAtual?.ativo === false ? (
              <p className="font-body text-sm text-fg-muted">Fora da agenda: só os horários que já estavam marcados.</p>
            ) : (
              <button
                onClick={() => abrirNovo(profAtual?.id)}
                className="text-amber font-body text-sm hover:underline"
              >
                Adicionar agendamento
              </button>
            )}
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
                      {b.profissional_id === null ? 'Barbearia fechada' : 'Bloqueado'} · {diaTodo ? 'dia inteiro' : `${formatarHora(b.inicio)} – ${formatarHora(b.fim)}`}
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
                    style={{ backgroundColor: ag.servico?.cor ?? '#F5D900' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold font-ui text-sm text-fg truncate">
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
                    <p className="font-mono text-xs text-amber mt-0.5">{formatBRL(ag.valor_servico)}</p>
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
          <div className="absolute inset-0 bg-black/60" onClick={fecharDetalhe} />
          <div className="relative w-full max-w-md bg-surface rounded-t-card md:rounded-card md:mb-[10vh] border border-line p-6 z-10 space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold font-ui text-lg text-fg">Agendamento</h2>
              <button onClick={fecharDetalhe} className="text-fg-muted hover:text-fg" aria-label="Fechar">
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
                <span className="font-mono text-xs text-amber">{formatBRL(selecionado.valor_servico)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-fg-muted" />
                <p className="font-body text-sm text-fg">
                  <span className="first-letter:uppercase inline-block">{formatarData(dataLocal(selecionado.inicio))}</span> · {formatarHora(selecionado.inicio)} – {formatarHora(selecionado.fim)}
                  {selecionado.profissional && <span className="text-fg-muted"> · {selecionado.profissional.nome}</span>}
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

            {/* Remarcar: muda dia, hora e (dono) o barbeiro numa gravação só */}
            {remarcar && (
              <div className="space-y-3 border border-line rounded-card p-4 bg-surface-alt/50">
                <p className="font-ui text-sm font-semibold text-fg">Remarcar para</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} htmlFor="rm-dia">Dia</label>
                    <input id="rm-dia" type="date" min={hoje} value={remarcar.dia} onChange={e => setRemarcar(r => r && ({ ...r, dia: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="rm-hora">Horário</label>
                    <input id="rm-hora" type="time" step={300} value={remarcar.hora} onChange={e => setRemarcar(r => r && ({ ...r, hora: e.target.value }))} className={inputCls} />
                  </div>
                </div>
                {profissionais.filter(p => p.ativo || p.id === selecionado.profissional?.id).length > 1 && (
                  <div>
                    <label className={labelCls} htmlFor="rm-prof">Barbeiro</label>
                    <select id="rm-prof" value={remarcar.profissional_id} onChange={e => setRemarcar(r => r && ({ ...r, profissional_id: e.target.value }))} className={inputCls}>
                      {profissionais.filter(p => p.ativo || p.id === selecionado.profissional?.id).map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={salvarRemarcacao} disabled={remarcando} className="font-semibold flex-1 bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm py-2.5 rounded-button transition-colors disabled:opacity-50">
                    {remarcando ? 'Remarcando…' : 'Confirmar novo horário'}
                  </button>
                  <button onClick={() => setRemarcar(null)} className="font-semibold px-4 border border-line text-fg-muted hover:text-fg font-ui text-sm py-2.5 rounded-button transition-colors">
                    Voltar
                  </button>
                </div>
              </div>
            )}

            {/* Ações por status */}
            {!remarcar && (selecionado.status === 'agendado' || selecionado.status === 'confirmado') && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => atualizarStatus(selecionado.id, 'concluido')}
                    disabled={salvandoStatus}
                    className="font-semibold flex-1 flex items-center justify-center gap-2 bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm py-3 rounded-button transition-colors"
                  >
                    <Check size={15} /> Concluir atendimento
                  </button>
                  <button
                    onClick={() => atualizarStatus(selecionado.id, 'faltou')}
                    disabled={salvandoStatus}
                    className="font-semibold px-4 border border-line text-fg-muted hover:text-fg font-ui text-sm py-3 rounded-button transition-colors"
                  >
                    Faltou
                  </button>
                </div>
                <button
                  onClick={() => setRemarcar({
                    dia: dataLocal(selecionado.inicio),
                    hora: hhmm(minutosLocais(selecionado.inicio)),
                    profissional_id: selecionado.profissional?.id ?? '',
                  })}
                  disabled={salvandoStatus}
                  className="font-semibold w-full flex items-center justify-center gap-2 border border-line text-fg hover:border-amber/50 font-ui text-sm py-2.5 rounded-button transition-colors"
                >
                  <CalendarClock size={15} /> Remarcar
                </button>
                <button
                  onClick={() => atualizarStatus(selecionado.id, 'cancelado')}
                  disabled={salvandoStatus}
                  className="font-semibold w-full text-saida font-ui text-sm py-2.5 rounded-button hover:bg-saida/5 transition-colors"
                >
                  Cancelar horário
                </button>
              </div>
            )}
            {(() => {
              const voltarPara = statusAoDesfazer(selecionado.status)
              if (!voltarPara) return null
              return (
                <div className="space-y-3">
                  <p className={`font-semibold text-center font-ui text-sm ${STATUS_CONFIG[selecionado.status].cor}`}>
                    {STATUS_CONFIG[selecionado.status].label}
                  </p>
                  <button
                    onClick={() => atualizarStatus(selecionado.id, voltarPara)}
                    disabled={salvandoStatus}
                    className="font-semibold w-full flex items-center justify-center gap-2 border border-line text-fg-muted hover:text-fg font-ui text-sm py-2.5 rounded-button transition-colors disabled:opacity-50"
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
          <div className="relative w-full max-w-md bg-surface rounded-t-card md:rounded-card md:mb-[10vh] border border-line p-6 z-10 max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold font-ui text-lg text-fg">Novo agendamento</h2>
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
                  {profissionais.filter(p => p.ativo).map(p => (
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
                    <option key={s.id} value={s.id}>{s.nome} — {formatBRL(s.preco)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Dia</label>
                <input
                  type="date"
                  value={novoForm.dia}
                  onChange={e => setNovoForm(f => ({ ...f, dia: e.target.value }))}
                  required
                  className={inputCls}
                />
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
                <label className={labelCls}>WhatsApp do cliente</label>
                <input
                  type="tel"
                  value={novoForm.cliente_whatsapp}
                  onChange={e => setNovoForm(f => ({ ...f, cliente_whatsapp: e.target.value }))}
                  placeholder="(71) 99999-0000"
                  required
                  className={inputCls}
                />
                <p className="font-body text-xs text-fg-muted mt-1">Do cliente que já se cadastrou pelo seu link. Quem é novo marca pelo link.</p>
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

              {novoErro && <p className="font-body text-sm text-saida" role="alert">{novoErro}</p>}
              {convidar && (
                <a
                  href={`https://wa.me/55${convidar.whatsapp}?text=${encodeURIComponent(`Oi! Pra marcar seu horário é só tocar aqui: ${typeof window !== 'undefined' ? window.location.origin : ''}/${convidar.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold w-full flex items-center justify-center gap-2 border border-line text-fg hover:border-amber/50 font-ui text-sm py-2.5 rounded-button transition-colors"
                >
                  Mandar o link pelo WhatsApp
                </a>
              )}

              <button
                type="submit"
                disabled={novoSalvando}
                className="font-semibold w-full bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm py-3 rounded-button transition-colors disabled:opacity-50"
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
