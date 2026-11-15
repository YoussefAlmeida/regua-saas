/* Foto do cliente (ou as iniciais dele, quando não tem foto) */
export default function Avatar({ foto, nome, className = 'w-20 h-20 text-[24px]' }: { foto: string | null; nome: string; className?: string }) {
  const iniciais = nome.trim().split(/\s+/).slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('')
  return (
    <span className={`relative rounded-full overflow-hidden border-2 border-amber bg-surface-alt flex items-center justify-center font-display font-semibold text-amber shrink-0 ${className}`}>
      {foto
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={foto} alt="" className="absolute inset-0 w-full h-full object-cover" />
        : <span aria-hidden>{iniciais || '?'}</span>}
    </span>
  )
}
