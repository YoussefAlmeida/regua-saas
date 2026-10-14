'use client'

import { X } from 'lucide-react'
import ContatoCliente from '@/components/contato-cliente'

export interface Cancelado {
  id: string
  inicio: string
  cliente: { nome: string; whatsapp: string | null } | { nome: string; whatsapp: string | null }[] | null
  servico: { nome: string } | { nome: string }[] | null
}
const um = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

/* Lista dos clientes que perderam o horário, com botão de WhatsApp pra remarcar */
export default function AvisarCancelados({ lista, titulo = 'Avise os clientes', texto, onFechar }: {
  lista: Cancelado[]
  titulo?: string
  texto?: string
  onFechar: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/60" onClick={onFechar} />
      <div className="relative w-full max-w-md bg-surface rounded-t-card border border-line p-6 z-10 max-h-[85dvh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold font-ui text-lg text-fg">{titulo}</h2>
          <button onClick={onFechar} aria-label="Fechar"><X size={18} className="text-fg-muted" /></button>
        </div>
        <p className="font-body text-sm text-fg-muted">
          {texto ?? `${lista.length} horário${lista.length > 1 ? 's foram cancelados' : ' foi cancelado'}. Manda uma mensagem pra remarcar com quem ficou.`}
        </p>
        <ul className="divide-y divide-line">
          {lista.map(c => {
            const cli = um(c.cliente), srv = um(c.servico)
            const q = new Date(c.inicio).toLocaleString('pt-BR', { timeZone: 'America/Bahia', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
            return (
              <li key={c.id} className="py-3 space-y-2">
                <p className="font-body text-sm text-fg">{cli?.nome ?? 'Cliente'} <span className="text-fg-muted">· {srv?.nome} · {q}</span></p>
                <ContatoCliente whatsapp={cli?.whatsapp} mensagem={`Oi, ${cli?.nome?.split(' ')[0] ?? ''}! Seu horário de ${q} precisou ser cancelado. Quer remarcar com outro barbeiro?`} />
              </li>
            )
          })}
        </ul>
        <button onClick={onFechar} className="font-semibold w-full border border-line text-fg font-ui text-sm py-3 rounded-button">
          Pronto
        </button>
      </div>
    </div>
  )
}
