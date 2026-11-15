'use client'

import { useEffect, useRef, useState } from 'react'

/* Recorte da foto de perfil: arrasta pra enquadrar, desliza pra aproximar.
   Devolve um JPG quadrado de 512 px, pronto pra enviar. */

const V = 264        // lado da janela de recorte, em px de tela
const SAIDA = 512

export default function RecorteFoto({ arquivo, onCancelar, onPronto }: { arquivo: File; onCancelar: () => void; onPronto: (foto: File) => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [erro, setErro] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const arrasto = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    let vivo = true
    const url = URL.createObjectURL(arquivo)
    const i = new Image()
    i.onload = () => { if (vivo) setImg(i) }
    i.onerror = () => { if (vivo) setErro('Não deu pra abrir essa imagem. Tenta outra (JPG, PNG ou WEBP).') }
    i.src = url
    return () => { vivo = false; URL.revokeObjectURL(url) }
  }, [arquivo])

  // Escala que faz a imagem cobrir a janela; o zoom multiplica por cima
  const escala = img ? (V / Math.min(img.naturalWidth, img.naturalHeight)) * zoom : 1
  const w = img ? img.naturalWidth * escala : V, h = img ? img.naturalHeight * escala : V
  const limitar = (p: { x: number; y: number }, lw = w, lh = h) => ({
    x: Math.min((lw - V) / 2, Math.max(-(lw - V) / 2, p.x)),
    y: Math.min((lh - V) / 2, Math.max(-(lh - V) / 2, p.y)),
  })
  const p = limitar(pos)

  function mudarZoom(z: number) {
    if (!img) return
    const e = (V / Math.min(img.naturalWidth, img.naturalHeight)) * z
    setZoom(z)
    setPos(atual => limitar(atual, img.naturalWidth * e, img.naturalHeight * e))
  }

  function confirmar() {
    if (!img) return
    setGerando(true)
    const canvas = document.createElement('canvas')
    canvas.width = SAIDA; canvas.height = SAIDA
    const ctx = canvas.getContext('2d')
    if (!ctx) { setErro('Seu navegador não conseguiu recortar a imagem.'); setGerando(false); return }
    const esquerda = (V - w) / 2 + p.x, topo = (V - h) / 2 + p.y
    ctx.drawImage(img, -esquerda / escala, -topo / escala, V / escala, V / escala, 0, 0, SAIDA, SAIDA)
    canvas.toBlob(blob => {
      setGerando(false)
      if (!blob) { setErro('Não deu pra recortar. Tenta outra imagem.'); return }
      onPronto(new File([blob], 'perfil.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.88)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal aria-labelledby="t-recorte">
      <div className="absolute inset-0 bg-black/80" onClick={onCancelar} />
      <div className="relative w-full max-w-md bg-surface border border-line rounded-t-2xl sm:rounded-card p-5 space-y-4">
        <div>
          <h2 id="t-recorte" className="font-display text-lg font-semibold text-fg">Ajuste sua foto</h2>
          <p className="font-body text-sm text-fg-muted">Arraste pra enquadrar e use a barra pra aproximar.</p>
        </div>

        {erro ? <p className="font-body text-sm text-saida" role="alert">{erro}</p> : (
          <>
            <div
              className="relative mx-auto overflow-hidden rounded-card bg-bg touch-none cursor-grab active:cursor-grabbing select-none"
              style={{ width: V, height: V }}
              onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); arrasto.current = { x: e.clientX, y: e.clientY, px: p.x, py: p.y } }}
              onPointerMove={e => { const a = arrasto.current; if (a) setPos(limitar({ x: a.px + e.clientX - a.x, y: a.py + e.clientY - a.y })) }}
              onPointerUp={() => { arrasto.current = null }}
              onPointerCancel={() => { arrasto.current = null }}
            >
              {img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.src} alt="Prévia da foto" draggable={false} className="absolute max-w-none pointer-events-none"
                  style={{ width: w, height: h, left: (V - w) / 2 + p.x, top: (V - h) / 2 + p.y }} />
              )}
              {/* Máscara redonda: mostra como a foto aparece no perfil */}
              <div className="absolute inset-0 rounded-full pointer-events-none border-2 border-amber" style={{ boxShadow: '0 0 0 999px rgb(0 0 0 / 0.55)' }} aria-hidden />
            </div>
            <div>
              <label className="ds-label" htmlFor="zoom">Aproximar</label>
              <input id="zoom" type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => mudarZoom(Number(e.target.value))} className="w-full accent-[rgb(var(--accent-rgb))]" disabled={!img} />
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={onCancelar} className="ds-btn-secondary flex-1">Cancelar</button>
          {!erro && <button type="button" onClick={confirmar} disabled={!img || gerando} className="ds-btn-primary flex-1">{gerando ? 'Preparando…' : 'Usar esta foto'}</button>}
        </div>
      </div>
    </div>
  )
}
