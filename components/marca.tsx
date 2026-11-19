/* ================================================================
   Marca CUBO — símbolo do cubo em linha neon + nome.
   O símbolo usa a cor de destaque (var(--regua-accent)), então nas
   páginas das barbearias ele acompanha a cor que o dono escolheu.
   ================================================================ */

/** Cubo isométrico em linha, com uma moldura menor em cada face */
export function SimboloCubo({ className = '', brilho = true }: { className?: string; brilho?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`${brilho ? 'cubo-brilho' : ''} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Contorno e arestas do cubo */}
      <path d="M32 4 56 18v28L32 60 8 46V18z" />
      <path d="M8 18 32 32 56 18M32 32v28" />
      {/* Moldura interna de cada face */}
      <path strokeWidth={2.4} d="M32 11 44 18 32 25 20 18z" />
      <path strokeWidth={2.4} d="M14 28.5 26 35.5v14L14 42.5z" />
      <path strokeWidth={2.4} d="M38 35.5 50 28.5v14L38 49.5z" />
    </svg>
  )
}

/** Logotipo: símbolo + CUBO. `sub` mostra "Gestão para barbearias" embaixo. */
export function Marca({ className = '', sub = false }: { className?: string; sub?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 leading-none ${className}`}>
      <SimboloCubo className="w-7 h-7 text-amber shrink-0" />
      <span className="inline-flex flex-col">
        <span className="font-display text-[22px] font-extrabold tracking-[0.06em]">CUBO</span>
        {sub && <span className="font-body text-[8px] font-semibold uppercase tracking-[0.32em] text-fg-muted mt-1">Gestão para barbearias</span>}
      </span>
    </span>
  )
}
