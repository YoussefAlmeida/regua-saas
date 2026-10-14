/* A "régua": fileira de marcações finas — o detalhe de ofício que assina a marca */
export function Regua({ className = '', marcas = 24 }: { className?: string; marcas?: number }) {
  return (
    <div className={`flex items-end gap-[5px] h-3 ${className}`} aria-hidden>
      {Array.from({ length: marcas }, (_, i) => (
        <span key={i} className={`w-px bg-current ${i % 6 === 0 ? 'h-3' : i % 3 === 0 ? 'h-2' : 'h-1.5'}`} />
      ))}
    </div>
  )
}

/* Logotipo: nome em serifa com a régua por baixo */
export function Marca({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className="font-display text-[22px] font-semibold tracking-[0.14em]">RÉGUA</span>
      <Regua className="mt-1 text-amber" marcas={19} />
    </span>
  )
}
