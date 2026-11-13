'use client'

import { useEffect, useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import ContatoCliente from '@/components/contato-cliente'
import { avisar, erroDaResposta } from '@/components/aviso'
import { formatBRL } from '@/lib/utils'

/* O atendimento da vez: quem é, a ficha do cliente (visitas, último
   serviço, observação da equipe) e os dois desfechos: Concluir ou Faltou. */

export interface AtendimentoFoco {
  id: string
  inicio: string
  fim: string
  valor_servico: number
  cliente: { id?: string; nome: string; whatsapp: string | null } | null
  servico: { nome: string; duracao_min: number } | null
  profissional: { nome: string } | null
}

interface Ficha { visitas: number; ultimo: { quando: string; servico: string | null } | null; nota: string | null }

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' })

export default function AtendimentoAgora({ ag, ocupado, onFinalizar, onFaltou }: {
  ag: AtendimentoFoco
  ocupado: boolean
  onFinalizar: (id: string) => void
  onFaltou: (id: string) => void
}) {
  const [agora, setAgora] = useState(() => Date.now())
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [editando, setEditando] = useState(false)
  const [nota, setNota] = useState('')

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Ficha do cliente: quem atende vê antes de começar
  useEffect(() => {
    setFicha(null); setEditando(false)
    if (!ag.cliente?.id) return
    let vivo = true
    fetch(`/api/painel/clientes/${ag.cliente.id}/resumo`).then(r => r.ok ? r.json() : null).then(j => { if (vivo && j) { setFicha(j); setNota(j.nota ?? '') } }).catch(() => null)
    return () => { vivo = false }
  }, [ag.id, ag.cliente?.id])

  async function salvarNota() {
    if (!ag.cliente?.id) return
    const res = await fetch(`/api/painel/clientes/${ag.cliente.id}/resumo`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nota: nota.trim() || null }) }).catch(() => null)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    setFicha(f => f && ({ ...f, nota: nota.trim() || null })); setEditando(false)
    avisar('Observação salva.', 'sucesso')
  }

  const faltam = Math.round((new Date(ag.inicio).getTime() - agora) / 60_000)
  const quando = faltam > 60 ? `às ${hora(ag.inicio)}` : faltam > 0 ? `em ${faltam} min` : faltam > -5 ? 'agora' : `atrasado ${-faltam} min`
  const iniciais = (ag.cliente?.nome ?? '?').split(' ').slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('')

  return (
    <section className="ds-card border-amber p-4 space-y-3.5" aria-label="Próximo atendimento">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-surface-alt border border-line flex items-center justify-center font-display text-sm font-semibold text-fg shrink-0" aria-hidden>{iniciais}</span>
        <div className="flex-1 min-w-0">
          <p className="ds-eyebrow !text-amber">A seguir</p>
          <p className="font-display text-base font-semibold text-fg truncate">{ag.cliente?.nome ?? 'Cliente'}</p>
          <p className="font-body text-xs text-fg-muted truncate">{ag.servico?.nome} · {hora(ag.inicio)} – {hora(ag.fim)}{ag.profissional ? ` · ${ag.profissional.nome}` : ''}</p>
        </div>
        <span className={`ds-tag border shrink-0 ${faltam < -5 ? 'border-alerta/50 text-alerta' : 'border-amber/40 text-amber'}`}>{quando}</span>
      </div>

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

      <div className="flex flex-wrap gap-2">
        <button onClick={() => onFinalizar(ag.id)} disabled={ocupado} className="ds-btn-primary flex-[999_1_auto] !min-h-[50px] text-[15px] whitespace-nowrap"><Check size={17} aria-hidden /> Concluir · {formatBRL(ag.valor_servico)}</button>
        <button onClick={() => onFaltou(ag.id)} disabled={ocupado} className="ds-btn-secondary flex-1 !min-h-[50px] px-5">Faltou</button>
      </div>
      <ContatoCliente whatsapp={ag.cliente?.whatsapp} mensagem={`Oi, ${ag.cliente?.nome?.split(' ')[0] ?? ''}! Sobre seu horário das ${hora(ag.inicio)}:`} />
    </section>
  )
}
