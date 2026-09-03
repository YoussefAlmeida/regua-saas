'use client'

import { useState } from 'react'
import { Clock, TrendingUp, Scissors, Check, X } from 'lucide-react'

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
const STATUS_COR: Record<Status, string> = {
  agendado: 'text-amber border-amber/30 bg-amber/5',
  confirmado: 'text-entrada border-entrada/30 bg-entrada/5',
  concluido: 'text-entrada border-entrada/40 bg-entrada/10',
  cancelado: 'text-saida border-saida/30 bg-saida/5',
  faltou: 'text-fg-muted border-line bg-surface-alt',
}

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' })
}

export default function HojeClient({
  agendamentosIniciais,
  movimentacoesHoje,
  data,
}: {
  agendamentosIniciais: Agendamento[]
  movimentacoesHoje: Movimentacao[]
  data: string
}) {
  const [ags, setAgs] = useState<Agendamento[]>(agendamentosIniciais)
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
    setAtualizando(id)
    const res = await fetch(`/api/painel/agendamentos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setAtualizando(null)
    if (res.ok) {
      const json = await res.json()
      setAgs(prev => prev.map(a => a.id === id ? { ...a, ...json } : a))
    }
  }

  // Próximo agendamento pendente
  const agora = new Date()
  const proximo = pendentes.find(a => new Date(a.inicio) > agora)

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="font-ui text-xl uppercase tracking-widest text-fg">Hoje</h1>
        <p className="font-body text-sm text-fg-muted capitalize">{dataFmt}</p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface border border-line rounded-card p-4">
          <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-1">Faturado hoje</p>
          <p className="font-mono text-2xl text-entrada">R$ {(faturadoReal + entradasManuais).toFixed(2)}</p>
          <p className="font-body text-xs text-fg-muted mt-0.5">{concluidos.length} concluído{concluidos.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-surface border border-line rounded-card p-4">
          <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-1">Previsto</p>
          <p className="font-mono text-2xl text-amber">R$ {faturadoPrev.toFixed(2)}</p>
          <p className="font-body text-xs text-fg-muted mt-0.5">{pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-surface border border-line rounded-card p-4">
          <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-1">Atendimentos</p>
          <p className="font-mono text-2xl text-fg">{ags.length}</p>
          <p className="font-body text-xs text-fg-muted mt-0.5">no total</p>
        </div>
        <div className="bg-surface border border-line rounded-card p-4">
          <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-1">Saídas</p>
          <p className="font-mono text-2xl text-saida">R$ {saidasDia.toFixed(2)}</p>
          <p className="font-body text-xs text-fg-muted mt-0.5">manual</p>
        </div>
      </div>

      {/* Próximo agendamento */}
      {proximo && (
        <div className="bg-surface border border-amber/30 rounded-card p-4">
          <p className="font-ui text-xs uppercase tracking-wider text-amber mb-2 flex items-center gap-1.5">
            <Clock size={11} /> Próximo
          </p>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: proximo.servico?.cor ?? '#E8B04B' }} />
            <div className="flex-1">
              <p className="font-ui text-sm uppercase tracking-wider text-fg">{proximo.cliente?.nome ?? '—'}</p>
              <p className="font-body text-xs text-fg-muted">{proximo.servico?.nome} · {hora(proximo.inicio)} · {proximo.profissional?.nome}</p>
            </div>
            {proximo.status === 'agendado' && (
              <button
                onClick={() => atualizarStatus(proximo.id, 'confirmado')}
                disabled={atualizando === proximo.id}
                className="flex items-center gap-1 bg-entrada/10 border border-entrada/30 text-entrada font-ui text-xs uppercase tracking-wider px-3 py-1.5 rounded-button transition-colors hover:bg-entrada/20"
              >
                <Check size={12} /> Confirmar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lista completa do dia */}
      <div>
        <h2 className="font-ui text-sm uppercase tracking-wider text-fg-muted mb-3">Agenda do dia</h2>

        {ags.length === 0 ? (
          <div className="text-center py-12">
            <Scissors size={32} className="mx-auto mb-3 text-fg-muted opacity-30" strokeWidth={1} />
            <p className="font-ui text-sm text-fg-muted uppercase tracking-wider">Dia sem agendamentos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ags.map(ag => {
              const st = STATUS_COR[ag.status]
              const isAtivo = atualizando === ag.id
              return (
                <div key={ag.id} className={`border rounded-card px-4 py-3 ${st} transition-opacity ${isAtivo ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: ag.servico?.cor ?? '#E8B04B' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-ui text-sm uppercase tracking-wider text-fg truncate">{ag.cliente?.nome ?? '—'}</p>
                        <span className="font-ui text-[10px] uppercase tracking-wider shrink-0">{STATUS_LABEL[ag.status]}</span>
                      </div>
                      <p className="font-body text-xs text-fg-muted">{ag.servico?.nome} · {hora(ag.inicio)} · {ag.profissional?.nome}</p>
                      <p className="font-mono text-xs text-amber mt-0.5">R$ {ag.valor_servico.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Ações rápidas */}
                  {ag.status === 'agendado' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => atualizarStatus(ag.id, 'confirmado')}
                        disabled={isAtivo}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-entrada/10 border border-entrada/30 text-entrada font-ui text-xs uppercase tracking-wider py-1.5 rounded-button transition-colors hover:bg-entrada/20"
                      >
                        <Check size={11} /> Confirmar
                      </button>
                      <button
                        onClick={() => atualizarStatus(ag.id, 'cancelado')}
                        disabled={isAtivo}
                        className="px-3 bg-saida/10 border border-saida/30 text-saida font-ui text-xs uppercase tracking-wider py-1.5 rounded-button transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )}
                  {ag.status === 'confirmado' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => atualizarStatus(ag.id, 'concluido')}
                        disabled={isAtivo}
                        className="flex-1 bg-amber hover:bg-accent-press text-accent-fg font-ui text-xs uppercase tracking-wider py-1.5 rounded-button transition-colors"
                      >
                        Concluir
                      </button>
                      <button
                        onClick={() => atualizarStatus(ag.id, 'faltou')}
                        disabled={isAtivo}
                        className="px-3 bg-surface-alt border border-line text-fg-muted font-ui text-xs uppercase tracking-wider py-1.5 rounded-button"
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
      {(faturadoReal + entradasManuais - saidasDia) !== 0 && (
        <div className="bg-surface border border-line rounded-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-fg-muted" />
            <span className="font-ui text-sm uppercase tracking-wider text-fg-muted">Saldo do dia</span>
          </div>
          <span className={`font-mono text-lg ${(faturadoReal + entradasManuais - saidasDia) >= 0 ? 'text-entrada' : 'text-saida'}`}>
            R$ {(faturadoReal + entradasManuais - saidasDia).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}
