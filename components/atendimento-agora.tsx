'use client'

import { useEffect, useState } from 'react'
import { Play, Check, Pencil } from 'lucide-react'
import ContatoCliente from '@/components/contato-cliente'
import { avisar, erroDaResposta } from '@/components/aviso'
import { formatBRL } from '@/lib/utils'

/* O atendimento da vez: antes de começar, "Iniciar atendimento";
   em andamento, cronômetro, ficha do cliente (visitas, último serviço,
   observação da equipe) e "Finalizar atendimento". */

export interface AtendimentoFoco {
  id: string
  inicio: string
  fim: string
  valor_servico: number
  iniciado_em?: string | null
  cliente: { id?: string; nome: string; whatsapp: string | null } | null
  servico: { nome: string; duracao_min: number } | null
  profissional: { nome: string } | null
}

interface Ficha { visitas: number; ultimo: { quando: string; servico: string | null } | null; nota: string | null }

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' })
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function AtendimentoAgora({ ag, ocupado, onIniciado, onFinalizar, onFaltou }: {
  ag: AtendimentoFoco
  ocupado: boolean
  onIniciado: (id: string, iniciado_em: string | null) => void
  onFinalizar: (id: string) => void
  onFaltou: (id: string) => void
}) {
  const [agora, setAgora] = useState(() => Date.now())
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [editando, setEditando] = useState(false)
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const emAndamento = !!ag.iniciado_em

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), emAndamento ? 1000 : 30_000)
    return () => clearInterval(t)
  }, [emAndamento])

  // Ficha do cliente: quem atende vê antes de começar
  useEffect(() => {
    setFicha(null); setEditando(false)
    if (!ag.cliente?.id) return
    let vivo = true
    fetch(`/api/painel/clientes/${ag.cliente.id}/resumo`).then(r => r.ok ? r.json() : null).then(j => { if (vivo && j) { setFicha(j); setNota(j.nota ?? '') } }).catch(() => null)
    return () => { vivo = false }
  }, [ag.id, ag.cliente?.id])

  async function iniciar(desfazer = false) {
    setEnviando(true)
    const res = await fetch(`/api/painel/agendamentos/${ag.id}/iniciar`, { method: desfazer ? 'DELETE' : 'POST' }).catch(() => null)
    setEnviando(false)
    if (!res) { avisar('Sem conexão. Confere a internet e tenta de novo.', 'erro'); return }
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    onIniciado(ag.id, (await res.json()).iniciado_em)
  }

  async function salvarNota() {
    if (!ag.cliente?.id) return
    const res = await fetch(`/api/painel/clientes/${ag.cliente.id}/resumo`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nota: nota.trim() || null }) }).catch(() => null)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    setFicha(f => f && ({ ...f, nota: nota.trim() || null })); setEditando(false)
    avisar('Observação salva.', 'sucesso')
  }

  const faltam = Math.round((new Date(ag.inicio).getTime() - agora) / 60_000)
  const quando = faltam > 60 ? `às ${hora(ag.inicio)}` : faltam > 0 ? `em ${faltam} min` : faltam > -5 ? 'agora' : `atrasado ${-faltam} min`
  const decorrido = emAndamento ? Math.max(0, Math.floor((agora - new Date(ag.iniciado_em!).getTime()) / 1000)) : 0
  const previsto = (ag.servico?.duracao_min ?? 30) * 60
  const passou = decorrido > previsto
  const iniciais = (ag.cliente?.nome ?? '?').split(' ').slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('')

  return (
    <section className="ds-card border-amber p-4 space-y-3.5" aria-label={emAndamento ? 'Atendimento em andamento' : 'Próximo atendimento'}>
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-surface-alt border border-line flex items-center justify-center font-display text-sm font-semibold text-fg shrink-0" aria-hidden>{iniciais}</span>
        <div className="flex-1 min-w-0">
          <p className="ds-eyebrow !text-amber">{emAndamento ? 'Em atendimento' : 'A seguir'}</p>
          <p className="font-display text-base font-semibold text-fg truncate">{ag.cliente?.nome ?? 'Cliente'}</p>
          <p className="font-body text-xs text-fg-muted truncate">{ag.servico?.nome} · {hora(ag.inicio)} – {hora(ag.fim)}{ag.profissional ? ` · ${ag.profissional.nome}` : ''}</p>
        </div>
        {!emAndamento && <span className={`ds-tag border shrink-0 ${faltam < -5 ? 'border-alerta/50 text-alerta' : 'border-amber/40 text-amber'}`}>{quando}</span>}
      </div>

      {emAndamento && (
        <div className="rounded-button bg-surface-alt px-4 py-4 text-center">
          <p className={`font-display text-[40px] leading-none font-semibold tabular-nums ${passou ? 'text-alerta' : 'text-amber'}`} role="timer" aria-live="off">{mmss(decorrido)}</p>
          <p className="font-body text-xs text-fg-muted mt-1.5">de {ag.servico?.duracao_min ?? 30} minutos previstos · começou às {hora(ag.iniciado_em!)}</p>
          <div className="h-1 rounded-full bg-line mt-3 overflow-hidden"><div className={`h-full rounded-full ${passou ? 'bg-alerta' : 'bg-amber'}`} style={{ width: `${Math.min(100, (decorrido / previsto) * 100)}%` }} /></div>
        </div>
      )}

      {ficha && (
        <div className="rounded-button border border-line px-3.5 py-3 space-y-1.5">
          <div className="flex justify-between gap-3 font-body text-sm"><span className="text-fg-muted">Visitas</span><span className="text-fg">{ficha.visitas === 0 ? 'Primeira vez aqui' : `${ficha.visitas + 1}ª vez aqui`}</span></div>
          {ficha.ultimo && (
            <div className="flex justify-between gap-3 font-body text-sm"><span className="text-fg-muted">Última</span>
              <span className="text-fg truncate">{new Date(ficha.ultimo.quando).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Bahia' }).replace('.', '')}{ficha.ultimo.servico ? ` · ${ficha.ultimo.servico}` : ''}</span></div>
          )}
          {editando ? (
            <div className="pt-1.5 space-y-2">
              <textarea value={nota} onChange={e => setNota(e.target.value)} maxLength={300} rows={2} placeholder="Ex.: degradê baixo, não tirar muito em cima" className="ds-input" aria-label="Observação sobre o cliente" />
              <div className="flex gap-2"><button onClick={salvarNota} className="ds-btn-primary flex-1 !min-h-[36px] text-xs">Salvar</button><button onClick={() => { setEditando(false); setNota(ficha.nota ?? '') }} className="ds-btn-secondary flex-1 !min-h-[36px] text-xs">Voltar</button></div>
            </div>
          ) : (
            <button onClick={() => setEditando(true)} className="w-full flex items-start gap-2 text-left pt-1.5 border-t border-line font-body text-sm text-fg-muted hover:text-fg transition-colors">
              <Pencil size={13} className="shrink-0 mt-0.5" aria-hidden />
              <span className="flex-1">{ficha.nota ? `“${ficha.nota}”` : 'Anotar uma observação sobre o cliente'}</span>
            </button>
          )}
        </div>
      )}

      {emAndamento ? (
        <div className="space-y-2">
          <button onClick={() => onFinalizar(ag.id)} disabled={ocupado} className="ds-btn-primary w-full !min-h-[50px] text-[15px]"><Check size={17} aria-hidden /> Finalizar atendimento · {formatBRL(ag.valor_servico)}</button>
          <button onClick={() => iniciar(true)} disabled={enviando} className="ds-btn-ghost w-full !min-h-[36px] text-xs">Ainda não comecei (desfazer)</button>
        </div>
      ) : (
        <div className="space-y-2">
          <button onClick={() => iniciar()} disabled={enviando || ocupado} className="ds-btn-primary w-full !min-h-[50px] text-[15px]"><Play size={16} aria-hidden /> Iniciar atendimento</button>
          <div className="flex gap-2">
            <button onClick={() => onFinalizar(ag.id)} disabled={ocupado} className="ds-btn-secondary flex-1 !min-h-[38px] text-xs">Concluir direto</button>
            <button onClick={() => onFaltou(ag.id)} disabled={ocupado} className="ds-btn-secondary flex-1 !min-h-[38px] text-xs">Faltou</button>
          </div>
        </div>
      )}
      <ContatoCliente whatsapp={ag.cliente?.whatsapp} mensagem={`Oi, ${ag.cliente?.nome?.split(' ')[0] ?? ''}! Sobre seu horário das ${hora(ag.inicio)}:`} />
    </section>
  )
}
