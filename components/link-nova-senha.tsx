'use client'

import { useState } from 'react'
import { KeyRound, MessageCircle, Copy, Check, X } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'

/* Botão "Link de nova senha": gera o link (vale 24h, uso único) e abre
   uma janelinha pra mandar no WhatsApp ou copiar. */
export default function LinkNovaSenha({
  endpoint,
  corpo,
  nome,
  compacto = false,
}: {
  endpoint: string
  corpo?: Record<string, unknown>
  nome: string
  compacto?: boolean
}) {
  const [gerando, setGerando] = useState(false)
  const [res, setRes] = useState<{ link: string; texto: string; whatsapp?: string | null; telefone?: string | null } | null>(null)
  const [copiado, setCopiado] = useState(false)

  async function gerar() {
    setGerando(true)
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo ?? {}),
    }).catch(() => null)
    setGerando(false)
    if (!r?.ok) { avisar(r ? await erroDaResposta(r) : 'Sem conexão.', 'erro'); return }
    setRes(await r.json())
  }

  const numero = res?.whatsapp ?? res?.telefone
  const wa = res && numero
    ? `https://wa.me/55${numero.replace(/\D/g, '').replace(/^55/, '')}?text=${encodeURIComponent(res.texto)}`
    : res ? `https://wa.me/?text=${encodeURIComponent(res.texto)}` : '#'

  return (
    <>
      <button
        onClick={gerar}
        disabled={gerando}
        title="Link de nova senha"
        aria-label={`Link de nova senha pra ${nome}`}
        className={compacto
          ? 'w-8 h-8 rounded-button flex items-center justify-center text-fg-muted hover:text-amber transition-colors shrink-0 disabled:opacity-40'
          : 'font-semibold inline-flex items-center gap-1.5 px-3 py-2 rounded-button border border-line text-fg-muted hover:text-fg font-ui text-xs disabled:opacity-40'}
      >
        <KeyRound size={14} /> {!compacto && (gerando ? 'Gerando…' : 'Link de nova senha')}
      </button>

      {res && (
        <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/60" onClick={() => setRes(null)} />
          <div className="relative w-full max-w-sm bg-surface border border-line rounded-t-card sm:rounded-card p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold font-ui text-sm text-fg">Senha nova pra {nome.split(' ')[0]}</h2>
                <p className="font-body text-xs text-fg-muted mt-0.5">O link vale 24 horas e funciona uma vez só.</p>
              </div>
              <button onClick={() => setRes(null)} aria-label="Fechar"><X size={18} className="text-fg-muted" /></button>
            </div>
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="font-semibold w-full flex items-center justify-center gap-2 bg-entrada/10 border border-entrada/30 text-entrada font-ui text-sm py-3 rounded-button hover:bg-entrada/20">
              <MessageCircle size={14} /> Mandar no WhatsApp
            </a>
            <button
              onClick={async () => { await navigator.clipboard.writeText(res.link).catch(() => null); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }}
              className="font-semibold w-full flex items-center justify-center gap-2 border border-line text-fg-muted hover:text-fg font-ui text-sm py-3 rounded-button"
            >
              {copiado ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar link</>}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
