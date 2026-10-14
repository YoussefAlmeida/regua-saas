'use client'

import { useState } from 'react'
import { Search, Users } from 'lucide-react'
import LinkNovaSenha from '@/components/link-nova-senha'

interface Agendamento { id: string; inicio: string; status: string }
interface Cliente {
  id: string
  nome: string
  whatsapp: string | null
  criado_em: string
  agendamentos: Agendamento[]
}

function ultimoCorte(ags: Agendamento[]): string | null {
  const concluidos = ags.filter(a => a.status === 'concluido').sort((a, b) => b.inicio.localeCompare(a.inicio))
  if (!concluidos.length) return null
  return new Date(concluidos[0].inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Bahia' })
}

export default function ClientesClient({ clientesIniciais }: { clientesIniciais: Cliente[] }) {
  const [busca, setBusca] = useState('')

  const filtrados = clientesIniciais.filter(c => {
    const q = busca.toLowerCase()
    return c.nome.toLowerCase().includes(q) || c.whatsapp?.includes(q)
  })

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-ui text-xl uppercase tracking-widest text-fg">Clientes</h1>
        <span className="font-mono text-sm text-fg-muted">{clientesIniciais.length}</span>
      </div>

      {clientesIniciais.length > 0 && (
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou WhatsApp…"
            className="w-full bg-surface-alt border border-line rounded-button pl-9 pr-4 py-2.5 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber"
          />
        </div>
      )}

      {filtrados.length === 0 ? (
        <div className="text-center py-16">
          {clientesIniciais.length === 0 ? (
            <>
              <Users size={40} className="mx-auto mb-3 text-fg-muted opacity-30" strokeWidth={1} />
              <p className="font-ui text-sm uppercase tracking-wider text-fg-muted">Nenhum cliente ainda</p>
              <p className="font-body text-xs text-fg-muted mt-2">Os clientes aparecem aqui após o primeiro agendamento.</p>
            </>
          ) : (
            <p className="font-ui text-sm uppercase tracking-wider text-fg-muted">Nenhum resultado</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(c => {
            const totalCortes = c.agendamentos.filter(a => a.status === 'concluido').length
            const ultimo = ultimoCorte(c.agendamentos)
            return (
              <div key={c.id} className="bg-surface border border-line rounded-card px-4 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-alt flex items-center justify-center font-display text-sm text-amber shrink-0">
                  {c.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-ui text-sm uppercase tracking-wider text-fg truncate">{c.nome}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {c.whatsapp && (
                      <span className="font-body text-xs text-fg-muted">{c.whatsapp}</span>
                    )}
                  </div>
                </div>
                <LinkNovaSenha endpoint="/api/painel/recuperacao" corpo={{ usuario_id: c.id }} nome={c.nome} compacto />
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm text-amber">{totalCortes}</p>
                  <p className="font-body text-xs text-fg-muted">{totalCortes === 1 ? 'corte' : 'cortes'}</p>
                  {ultimo && (
                    <p className="font-body text-[10px] text-fg-muted mt-0.5">{ultimo}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
