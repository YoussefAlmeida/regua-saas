'use client'

import { create } from 'zustand'
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'

/* ================================================================
   Avisos rápidos (toast) — feedback de toda ação no painel.
   Uso: avisar('Entrada lançada', 'sucesso')
   ================================================================ */

type Tipo = 'sucesso' | 'erro' | 'info'
interface Aviso { id: number; texto: string; tipo: Tipo }

const useAvisos = create<{ lista: Aviso[] }>(() => ({ lista: [] }))

let proximoId = 1
export function avisar(texto: string, tipo: Tipo = 'info') {
  const id = proximoId++
  useAvisos.setState(s => ({ lista: [...s.lista.slice(-2), { id, texto, tipo }] }))
  setTimeout(() => {
    useAvisos.setState(s => ({ lista: s.lista.filter(a => a.id !== id) }))
  }, tipo === 'erro' ? 6000 : 3500)
}

/** Lê o erro da API ou devolve uma mensagem padrão */
export async function erroDaResposta(res: Response, padrao = 'Algo deu errado. Tenta de novo.'): Promise<string> {
  try {
    const json = await res.clone().json()
    return typeof json?.erro === 'string' ? json.erro : padrao
  } catch {
    return padrao
  }
}

const ESTILO: Record<Tipo, { cls: string; Icone: typeof Info }> = {
  sucesso: { cls: 'border-entrada/40 text-entrada', Icone: CheckCircle2 },
  erro:    { cls: 'border-saida/40 text-saida',     Icone: AlertTriangle },
  info:    { cls: 'border-line text-fg',            Icone: Info },
}

export default function Avisos() {
  const lista = useAvisos(s => s.lista)
  if (lista.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none"
    >
      {lista.map(({ id, texto, tipo }) => {
        const { cls, Icone } = ESTILO[tipo]
        return (
          <div
            key={id}
            className={`pointer-events-auto w-full max-w-md flex items-start gap-2.5 bg-surface-alt border ${cls} rounded-card px-4 py-3 shadow-lg shadow-black/40 animate-in fade-in slide-in-from-bottom-2`}
          >
            <Icone size={16} className="shrink-0 mt-0.5" />
            <p className="font-body text-sm text-fg">{texto}</p>
          </div>
        )
      })}
    </div>
  )
}
