'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, BadgeCheck, PauseCircle, XCircle, RotateCcw, Trash2 } from 'lucide-react'
import { PLANOS_ADMIN, type PlanoPago } from '@/lib/admin-planos'

interface Props {
  barbearia: { id: string; nome: string; slug: string; status: string; plano: string }
  /** Plano que o dono pediu pra mudar (vale quando pagar) */
  pedido?: string | null
}

export default function AcoesBarbearia({ barbearia: b, pedido }: Props) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null)
  const [plano, setPlano] = useState<PlanoPago>((pedido && pedido in PLANOS_ADMIN ? pedido : b.plano in PLANOS_ADMIN ? b.plano : 'barbearia') as PlanoPago)
  const [apagando, setApagando] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')

  async function agir(corpo: Record<string, unknown>, sucesso: string, pergunta?: string) {
    if (pergunta && !confirm(pergunta)) return
    setOcupado(true)
    setMsg(null)
    const res = await fetch(`/api/admin/barbearias/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    }).catch(() => null)
    setOcupado(false)
    if (!res) { setMsg({ t: 'Sem conexão.', erro: true }); return }
    if (res.status === 401) { router.replace('/admin/login'); return }
    if (!res.ok) { setMsg({ t: (await res.json().catch(() => ({}))).erro ?? 'Erro', erro: true }); return }
    const json = await res.json().catch(() => ({}))
    setMsg(json.aviso ? { t: `${sucesso} ${json.aviso}`, erro: true } : { t: sucesso })
    router.refresh()
  }

  async function apagar() {
    setOcupado(true)
    const res = await fetch(`/api/admin/barbearias/${b.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmacao }),
    }).catch(() => null)
    setOcupado(false)
    if (!res?.ok) { setMsg({ t: res ? (await res.json().catch(() => ({}))).erro ?? 'Erro' : 'Sem conexão.', erro: true }); return }
    router.replace('/admin')
    router.refresh()
  }

  const btn = 'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-button border font-ui text-xs uppercase tracking-wider transition-colors disabled:opacity-40'
  const parado = b.status === 'leitura' || b.status === 'cancelado'

  return (
    <section className="bg-surface border border-line rounded-card p-4 space-y-4">
      <p className="font-ui text-xs uppercase tracking-wider text-fg-muted">Ações</p>

      {msg && (
        <p role="status" className={`font-body text-sm rounded-button px-3 py-2 border ${msg.erro ? 'text-saida border-saida/30 bg-saida/5' : 'text-entrada border-entrada/30 bg-entrada/5'}`}>
          {msg.t}
        </p>
      )}

      {/* Teste grátis */}
      <div className="space-y-2">
        <p className="font-body text-sm text-fg">Estender teste grátis</p>
        <div className="grid grid-cols-3 gap-2">
          {[7, 14, 30].map(d => (
            <button key={d} disabled={ocupado} onClick={() => agir({ acao: 'estender_teste', dias: d }, `Teste estendido em ${d} dias.`)}
              className={`${btn} border-amber/40 text-amber hover:bg-amber/10`}>
              <CalendarPlus size={13} /> +{d} dias
            </button>
          ))}
        </div>
      </div>

      {/* Plano */}
      <div className="space-y-2">
        <p className="font-body text-sm text-fg">Registrar pagamento (Pix ou por fora)</p>
        <p className="font-body text-xs text-fg-muted">
          O plano só muda aqui. Mesmo plano em dia: soma 1 mês. Plano diferente: vale na hora e o mês começa hoje.
        </p>
        <div className="flex gap-2">
          <select value={plano} onChange={e => setPlano(e.target.value as PlanoPago)} aria-label="Plano"
            className="flex-1 bg-bg border border-line rounded-button px-3 py-2.5 font-body text-sm text-fg focus:outline-none focus:ring-1 focus:ring-amber">
            {Object.entries(PLANOS_ADMIN).map(([id, p]) => (
              <option key={id} value={id}>{p.nome} — R$ {p.preco.toFixed(2).replace('.', ',')}/mês</option>
            ))}
          </select>
          <button disabled={ocupado} onClick={() => agir({ acao: 'ativar_plano', plano }, `Pagamento do ${PLANOS_ADMIN[plano].nome} registrado.`, `${b.nome} pagou o ${PLANOS_ADMIN[plano].nome} (R$ ${PLANOS_ADMIN[plano].preco.toFixed(2).replace('.', ',')})?`)}
            className={`${btn} border-entrada/40 text-entrada hover:bg-entrada/10`}>
            <BadgeCheck size={13} /> Pagou
          </button>
        </div>
      </div>

      {/* Situação */}
      <div className="space-y-2">
        <p className="font-body text-sm text-fg">Situação da conta</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {parado ? (
            <button disabled={ocupado} onClick={() => agir({ acao: 'reativar' }, 'Barbearia reativada.')}
              className={`${btn} border-entrada/40 text-entrada hover:bg-entrada/10`}>
              <RotateCcw size={13} /> Reativar
            </button>
          ) : (
            <button disabled={ocupado} onClick={() => agir({ acao: 'suspender' }, 'Suspensa: vê os dados mas não lança nada.', `Suspender ${b.nome}? Eles continuam vendo os dados, mas não criam agendamento nem lançam no caixa.`)}
              className={`${btn} border-info/40 text-info hover:bg-info/10`}>
              <PauseCircle size={13} /> Suspender
            </button>
          )}
          {b.status !== 'cancelado' && (
            <button disabled={ocupado} onClick={() => agir({ acao: 'cancelar' }, 'Cancelada: página de agendamento saiu do ar.', `Cancelar ${b.nome}? A página de agendamento sai do ar. Os dados ficam guardados.`)}
              className={`${btn} border-saida/40 text-saida hover:bg-saida/10`}>
              <XCircle size={13} /> Cancelar
            </button>
          )}
        </div>
        <p className="font-body text-[11px] text-fg-muted">Suspender = só leitura. Cancelar = tira o link do ar. Nos dois casos nada é apagado.</p>
      </div>

      {/* Apagar */}
      <div className="pt-3 border-t border-line space-y-2">
        {!apagando ? (
          <button onClick={() => setApagando(true)} className="flex items-center gap-1.5 font-ui text-xs uppercase tracking-wider text-saida/80 hover:text-saida">
            <Trash2 size={13} /> Apagar barbearia e todos os dados
          </button>
        ) : (
          <div className="bg-saida/5 border border-saida/30 rounded-button p-3 space-y-2">
            <p className="font-body text-sm text-fg">
              Isso apaga <strong>tudo</strong> de {b.nome}: dono, barbeiros, clientes, agendamentos, financeiro, fotos e a pasta aqui do admin (erros e atividade). <strong>Não dá pra desfazer.</strong>
            </p>
            <p className="font-body text-xs text-fg-muted">Pra confirmar, digite <span className="font-mono text-fg">{b.slug}</span>:</p>
            <input value={confirmacao} onChange={e => setConfirmacao(e.target.value)} autoFocus aria-label="Confirmação"
              className="w-full bg-bg border border-saida/40 rounded-button px-3 py-2 font-mono text-sm text-fg focus:outline-none focus:ring-1 focus:ring-saida" />
            <div className="flex gap-2">
              <button onClick={() => { setApagando(false); setConfirmacao('') }} className={`${btn} flex-1 border-line text-fg-muted`}>Voltar</button>
              <button disabled={ocupado || confirmacao !== b.slug} onClick={apagar} className={`${btn} flex-1 bg-saida border-saida text-bg`}>
                <Trash2 size={13} /> Apagar de vez
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
