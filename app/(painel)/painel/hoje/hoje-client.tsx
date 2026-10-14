'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, TrendingUp, Scissors, Check, X, Undo2, AlertTriangle, ChevronRight } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'
import ContatoCliente from '@/components/contato-cliente'
import { mensagemStatus } from '@/lib/status-agendamento'
import { formatBRL } from '@/lib/utils'

type Status = 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'faltou'

interface Agendamento {
  id: string
  inicio: string
  fim: string
  status: Status
  valor_servico: number
  profissional: { id: string; nome: string } | null
  cliente: { nome: string; whatsapp: string | null } | null
  servico: { nome: string; duracao_min: number; cor: string } | null
}

interface Movimentacao { id: string; tipo: 'entrada' | 'saida'; valor: number; origem: string }

const STATUS_LABEL: Record<Status, string> = {
  agendado: 'Agendado', confirmado: 'Confirmado', concluido: 'Concluído',
  cancelado: 'Cancelado', faltou: 'Faltou',
}
// Etiqueta discreta de situação (o cartão fica branco)
const STATUS_COR: Record<Status, string> = {
  agendado: 'text-fg-muted bg-surface-alt',
  confirmado: 'text-info bg-info/10',
  concluido: 'text-entrada bg-entrada/10',
  cancelado: 'text-saida bg-saida/10',
  faltou: 'text-fg-muted bg-surface-alt',
}

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' })
}

export default function HojeClient({
  agendamentosIniciais,
  esquecidosIniciais,
  movimentacoesHoje,
  data,
  souBarbeiro = false,
  pendencias = [],
}: {
  pendencias?: { href: string; texto: string }[]
  souBarbeiro?: boolean
  agendamentosIniciais: Agendamento[]
  esquecidosIniciais: Agendamento[]
  movimentacoesHoje: Movimentacao[]
  data: string
}) {
  const [ags, setAgs] = useState<Agendamento[]>(agendamentosIniciais)
  const [esquecidos, setEsquecidos] = useState<Agendamento[]>(esquecidosIniciais)
  const [atualizando, setAtualizando] = useState<string | null>(null)

  const ativos   = ags.filter(a => !['cancelado', 'faltou'].includes(a.status))
  const concluidos = ags.filter(a => a.status === 'concluido')
  const pendentes  = ags.filter(a => ['agendado', 'confirmado'].includes(a.status))

  const faturadoReal = concluidos.reduce((s, a) => s + a.valor_servico, 0)
  const faturadoPrev = ativos.reduce((s, a) => s + a.valor_servico, 0)

  // Entradas manuais do dia (além das automáticas)
  const entradasManuais = movimentacoesHoje.filter(m => m.tipo === 'entrada' && m.origem === 'manual')
    .reduce((s, m) => s + m.valor, 0)
  const saidasDia = movimentacoesHoje.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0)

  const dataFmt = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  async function atualizarStatus(id: string, status: Status) {
    if (status === 'cancelado' && !confirm('Cancelar esse agendamento? O horário volta a ficar livre.')) return
    setAtualizando(id)
    const res = await fetch(`/api/painel/agendamentos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => null)
    setAtualizando(null)

    if (!res) { avisar('Sem conexão. Confere a internet e tenta de novo.', 'erro'); return }
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }

    const json = await res.json()
    setAgs(prev => prev.map(a => a.id === id ? { ...a, ...json } : a))
    setEsquecidos(prev => prev.filter(a => a.id !== id))
    avisar(mensagemStatus(status, json.entrada, json.valor_servico), 'sucesso')
  }

  // Próximo agendamento pendente
  const agora = new Date()
  const proximo = pendentes.find(a => new Date(a.inicio) > agora)

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="font-display text-[28px] font-semibold leading-tight text-fg">Hoje</h1>
        <p className="font-body text-sm text-fg-muted first-letter:uppercase">{dataFmt}</p>
      </div>

      {pendencias.length > 0 && (
        <div className="space-y-2">
          {pendencias.map(p => (
            <Link key={p.href} href={p.href} className="flex items-center gap-3 bg-surface border border-amber/30 rounded-card px-4 py-3 hover:border-amber/60 transition-colors">
              <span className="w-2 h-2 rounded-full bg-amber shrink-0" />
              <span className="flex-1 font-body text-sm text-fg">{p.texto}</span>
              <ChevronRight size={14} className="text-fg-muted" />
            </Link>
          ))}
        </div>
      )}

      {/* Atendimentos que passaram sem status — não deixa esquecer */}
      {esquecidos.length > 0 && (
        <div className="bg-amber/5 border border-amber/40 rounded-card p-4 space-y-3">
          <p className="font-ui text-xs uppercase tracking-wider text-amber flex items-center gap-1.5">
            <AlertTriangle size={12} />
            {esquecidos.length} atendimento{esquecidos.length > 1 ? 's' : ''} sem status
          </p>
          <p className="font-body text-xs text-fg-muted">
            Marca o que aconteceu — só entra no caixa e no desempenho depois disso.
          </p>
          {esquecidos.map(ag => {
            const dia = new Date(ag.inicio).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', timeZone: 'America/Bahia' })
            const ocupado = atualizando === ag.id
            return (
              <div key={ag.id} className={`border-t border-line pt-3 ${ocupado ? 'opacity-50' : ''}`}>
                <p className="font-semibold font-ui text-sm text-fg truncate">{ag.cliente?.nome ?? '—'}</p>
                <p className="font-body text-xs text-fg-muted first-letter:uppercase">
                  {dia} · {hora(ag.inicio)} · {ag.servico?.nome} · {ag.profissional?.nome}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => atualizarStatus(ag.id, 'concluido')}
                    disabled={ocupado}
                    className="font-semibold flex-1 bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm py-2.5 rounded-button transition-colors"
                  >
                    Cortou
                  </button>
                  <button
                    onClick={() => atualizarStatus(ag.id, 'faltou')}
                    disabled={ocupado}
                    className="font-semibold flex-1 bg-surface-alt border border-line text-fg-muted font-ui text-xs py-1.5 rounded-button"
                  >
                    Faltou
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Cards de métricas */}
      {souBarbeiro ? (
        <Link href="/painel/mais/desempenho" className="block bg-surface border border-line rounded-card p-4 hover:border-amber/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="font-ui text-xs uppercase tracking-wider text-fg-muted">Meu dia</p>
            <span className="flex items-center gap-0.5 font-ui text-[10px] uppercase tracking-wider text-amber">Meu desempenho <ChevronRight size={12} /></span>
          </div>
          <p className="font-mono text-4xl text-entrada leading-none">{formatBRL(faturadoReal)}</p>
          <p className="font-body text-xs text-fg-muted mt-2">
            {concluidos.length} feito{concluidos.length !== 1 ? 's' : ''} · {pendentes.length} pela frente
          </p>
        </Link>
      ) : (
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface border border-line rounded-card p-4">
          <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-1">Faturado hoje</p>
          <p className="font-mono text-xl text-entrada whitespace-nowrap">{formatBRL((faturadoReal + entradasManuais))}</p>
          <p className="font-body text-xs text-fg-muted mt-0.5">{concluidos.length} concluído{concluidos.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-surface border border-line rounded-card p-4">
          <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-1">Previsto</p>
          <p className="font-mono text-xl text-amber whitespace-nowrap">{formatBRL(faturadoPrev)}</p>
          <p className="font-body text-xs text-fg-muted mt-0.5">{pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-surface border border-line rounded-card p-4">
          <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-1">Atendimentos</p>
          <p className="font-mono text-xl text-fg">{ags.length}</p>
          <p className="font-body text-xs text-fg-muted mt-0.5">no total</p>
        </div>
        <div className="bg-surface border border-line rounded-card p-4">
          <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-1">Saídas</p>
          <p className="font-mono text-xl text-saida whitespace-nowrap">{formatBRL(saidasDia)}</p>
          <p className="font-body text-xs text-fg-muted mt-0.5">lançadas hoje</p>
        </div>
      </div>
      )}

      {/* Próximo agendamento */}
      {proximo && (
        <div className="bg-surface border border-amber/30 rounded-card p-4">
          <p className="font-ui text-xs uppercase tracking-wider text-amber mb-2 flex items-center gap-1.5">
            <Clock size={11} /> Próximo
          </p>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: proximo.servico?.cor ?? '#9A4A1A' }} />
            <div className="flex-1">
              <p className="font-semibold font-ui text-sm text-fg">{proximo.cliente?.nome ?? '—'}</p>
              <p className="font-body text-xs text-fg-muted">{proximo.servico?.nome} · {hora(proximo.inicio)} · {proximo.profissional?.nome}</p>
            </div>
            {proximo.status === 'agendado' && (
              <button
                onClick={() => atualizarStatus(proximo.id, 'confirmado')}
                disabled={atualizando === proximo.id}
                className="font-semibold flex items-center gap-1 bg-entrada/10 border border-entrada/30 text-entrada font-ui text-xs px-3 py-1.5 rounded-button transition-colors hover:bg-entrada/20"
              >
                <Check size={12} /> Confirmar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lista completa do dia */}
      <div>
        <h2 className="font-semibold font-ui text-sm text-fg-muted mb-3">Agenda do dia</h2>

        {ags.length === 0 ? (
          <div className="text-center py-12">
            <Scissors size={32} className="mx-auto mb-3 text-fg-muted opacity-30" strokeWidth={1} />
            <p className="font-semibold font-ui text-sm text-fg-muted">Dia sem agendamentos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ags.map(ag => {
              const st = STATUS_COR[ag.status]
              const isAtivo = atualizando === ag.id
              return (
                <div key={ag.id} className={`bg-surface border border-line rounded-card px-4 py-3.5 transition-opacity ${ag.status === 'concluido' || ag.status === 'faltou' ? 'opacity-70' : ''} ${isAtivo ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 shrink-0 text-right">
                      <p className="font-mono text-[17px] font-semibold text-fg leading-tight">{hora(ag.inicio)}</p>
                      <p className="font-mono text-[11px] text-fg-muted">{hora(ag.fim)}</p>
                    </div>
                    <div className="flex-1 min-w-0 border-l border-line pl-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold font-ui text-[15px] text-fg truncate">{ag.cliente?.nome ?? '—'}</p>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full font-body text-[11px] font-semibold ${st}`}>{STATUS_LABEL[ag.status]}</span>
                      </div>
                      <p className="font-body text-[13px] text-fg-muted mt-0.5">
                        {ag.servico?.nome}{!souBarbeiro && ` · ${ag.profissional?.nome}`} · <span className="font-mono text-fg">{formatBRL(ag.valor_servico)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Ações rápidas */}
                  {ag.status === 'agendado' && (
                    <div className="flex gap-2 mt-3 ml-16">
                      <button
                        onClick={() => atualizarStatus(ag.id, 'confirmado')}
                        disabled={isAtivo}
                        className="font-semibold flex-1 flex items-center justify-center gap-1.5 bg-fg text-bg font-ui text-sm py-2.5 rounded-button transition-colors hover:bg-fg/85"
                      >
                        <Check size={14} /> Confirmar
                      </button>
                      <button
                        onClick={() => atualizarStatus(ag.id, 'cancelado')}
                        disabled={isAtivo}
                        aria-label="Cancelar horário"
                        className="font-semibold px-3.5 border border-line text-saida font-ui text-sm py-2.5 rounded-button transition-colors hover:border-saida/40"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}
                  {(ag.status === 'agendado' || ag.status === 'confirmado') && ag.cliente?.whatsapp && (
                    <div className="mt-3 ml-16">
                      <ContatoCliente whatsapp={ag.cliente.whatsapp} compacto />
                    </div>
                  )}
                  {(ag.status === 'concluido' || ag.status === 'faltou') && (
                    <button
                      onClick={() => atualizarStatus(ag.id, 'confirmado')}
                      disabled={isAtivo}
                      className="mt-2 ml-16 flex items-center gap-1 font-body text-xs font-semibold text-fg-muted hover:text-fg py-1"
                    >
                      <Undo2 size={13} /> Desfazer
                    </button>
                  )}
                  {ag.status === 'confirmado' && (
                    <div className="flex gap-2 mt-3 ml-16">
                      <button
                        onClick={() => atualizarStatus(ag.id, 'concluido')}
                        disabled={isAtivo}
                        className="font-semibold flex-1 bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm py-2.5 rounded-button transition-colors"
                      >
                        Concluir
                      </button>
                      <button
                        onClick={() => atualizarStatus(ag.id, 'faltou')}
                        disabled={isAtivo}
                        className="font-semibold px-4 border border-line text-fg-muted font-ui text-sm py-2.5 rounded-button hover:text-fg"
                      >
                        Faltou
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Resumo financeiro do dia */}
      {!souBarbeiro && (faturadoReal + entradasManuais - saidasDia) !== 0 && (
        <div className="bg-surface border border-line rounded-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-fg-muted" />
            <span className="font-semibold font-ui text-sm text-fg-muted">Saldo do dia</span>
          </div>
          <span className={`font-mono text-lg ${(faturadoReal + entradasManuais - saidasDia) >= 0 ? 'text-entrada' : 'text-saida'}`}>
            {formatBRL((faturadoReal + entradasManuais - saidasDia))}
          </span>
        </div>
      )}
    </div>
  )
}
