/* As iniciais do cliente num círculo (cliente não tem foto de perfil) */
export default function Avatar({ nome, className = 'w-20 h-20 text-[24px]' }: { nome: string; className?: string }) {
  const iniciais = nome.trim().split(/\s+/).slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('')
  return (
    <span className={`rounded-full border-2 border-amber bg-surface-alt flex items-center justify-center font-display font-semibold text-amber shrink-0 ${className}`} aria-hidden>
      {iniciais || '?'}
    </span>
  )
}
