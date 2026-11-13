'use client'

import { useLayoutEffect, useRef } from 'react'

/* Valor que sempre cabe: fica numa linha só e, se a caixa for estreita
   (celular pequeno, valor alto), diminui a letra até caber. */
export default function Cabe({ children, className = '', minimo = 0.55 }: { children: React.ReactNode; className?: string; minimo?: number }) {
  const ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ajustar = () => {
      el.style.fontSize = ''
      const cabe = el.clientWidth, precisa = el.scrollWidth
      if (cabe > 0 && precisa > cabe) {
        const base = parseFloat(getComputedStyle(el).fontSize)
        el.style.fontSize = `${Math.floor(base * Math.max(minimo, cabe / precisa) * 10) / 10}px`
      }
    }
    ajustar()
    const ro = new ResizeObserver(ajustar)
    ro.observe(el)
    return () => ro.disconnect()
  }, [children, minimo])

  return <span ref={ref} className={`block whitespace-nowrap overflow-hidden ${className}`}>{children}</span>
}
