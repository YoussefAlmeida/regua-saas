'use client'

import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { Lock } from 'lucide-react'

/* ================================================================
   Pede a senha de novo antes de ação sensível.
   Uso:  const senha = await pedirSenha('Apagar lançamento de R$ 50')
         if (!senha) return   // cancelou
   ================================================================ */

interface Pedido { titulo: string; detalhe?: string; resolver: (s: string | null) => void }
const usePedido = create<{ pedido: Pedido | null }>(() => ({ pedido: null }))

export function pedirSenha(titulo: string, detalhe?: string): Promise<string | null> {
  return new Promise(resolver => {
    usePedido.getState().pedido?.resolver(null)
    usePedido.setState({ pedido: { titulo, detalhe, resolver } })
  })
}

export default function ConfirmarSenha() {
  const pedido = usePedido(s => s.pedido)
  const [senha, setSenha] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (pedido) { setSenha(''); setTimeout(() => input.current?.focus(), 50) }
  }, [pedido])

  if (!pedido) return null

  function fechar(valor: string | null) {
    pedido!.resolver(valor)
    usePedido.setState({ pedido: null })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal aria-labelledby="titulo-senha">
      <div className="absolute inset-0 bg-black/70" onClick={() => fechar(null)} />
      <form
        onSubmit={e => { e.preventDefault(); if (senha) fechar(senha) }}
        className="relative w-full max-w-sm bg-surface border border-line rounded-t-card sm:rounded-card p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber/10 flex items-center justify-center text-amber shrink-0">
            <Lock size={16} />
          </div>
          <div>
            <h2 id="titulo-senha" className="font-semibold font-ui text-sm text-fg">{pedido.titulo}</h2>
            <p className="font-body text-xs text-fg-muted">{pedido.detalhe ?? 'Confirme com sua senha.'}</p>
          </div>
        </div>
        <input
          ref={input}
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          placeholder="Sua senha"
          className="w-full bg-surface border border-line rounded-button px-4 py-3 font-body text-base text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber"
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => fechar(null)} className="font-semibold flex-1 border border-line text-fg-muted font-ui text-sm py-3 rounded-button">
            Voltar
          </button>
          <button type="submit" disabled={!senha} className="font-semibold flex-1 bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm py-3 rounded-button disabled:opacity-50">
            Confirmar
          </button>
        </div>
      </form>
    </div>
  )
}
