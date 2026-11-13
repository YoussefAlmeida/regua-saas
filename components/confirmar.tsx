'use client'

import { create } from 'zustand'

/* Confirmação do Design System (no lugar do aviso cinza do navegador).
   Uso:  if (!(await confirmar('Cancelar esse horário?', 'Ele volta a ficar livre.', { perigo: true }))) return
   O componente <Confirmar /> fica montado uma vez no layout do painel. */

interface Pedido { titulo: string; texto?: string; rotulo: string; perigo: boolean; resolver: (ok: boolean) => void }
const useConfirmar = create<{ pedido: Pedido | null }>(() => ({ pedido: null }))

export function confirmar(titulo: string, texto?: string, opcoes: { rotulo?: string; perigo?: boolean } = {}): Promise<boolean> {
  return new Promise(resolver => {
    useConfirmar.setState({ pedido: { titulo, texto, rotulo: opcoes.rotulo ?? 'Confirmar', perigo: !!opcoes.perigo, resolver } })
  })
}

export default function Confirmar() {
  const pedido = useConfirmar(s => s.pedido)
  if (!pedido) return null
  const fechar = (ok: boolean) => { pedido.resolver(ok); useConfirmar.setState({ pedido: null }) }
  return (
    <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center" role="alertdialog" aria-modal aria-labelledby="t-confirmar">
      <div className="absolute inset-0 bg-black/70" onClick={() => fechar(false)} />
      <div className="relative w-full max-w-md bg-surface border border-line rounded-t-2xl sm:rounded-card p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-200">
        <h2 id="t-confirmar" className="font-display text-lg font-semibold text-fg">{pedido.titulo}</h2>
        {pedido.texto && <p className="font-body text-sm text-fg-muted">{pedido.texto}</p>}
        <div className="flex gap-2">
          <button onClick={() => fechar(false)} className="ds-btn-secondary flex-1">Voltar</button>
          <button autoFocus onClick={() => fechar(true)} className={`${pedido.perigo ? 'ds-btn-danger' : 'ds-btn-primary'} flex-1`}>{pedido.rotulo}</button>
        </div>
      </div>
    </div>
  )
}
