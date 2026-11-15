import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

/* Topo das telas internas do Perfil: voltar, título e subtítulo */
export default function TopoInterno({ voltar, titulo, subtitulo }: { voltar: string; titulo: string; subtitulo: string }) {
  return (
    <header className="flex items-start gap-2">
      <Link href={voltar} aria-label="Voltar" className="-ml-2 -mt-1 w-10 h-10 shrink-0 flex items-center justify-center rounded-full text-fg hover:bg-surface transition-colors">
        <ChevronLeft size={22} aria-hidden />
      </Link>
      <div className="min-w-0">
        <h1 className="font-display text-[22px] leading-tight font-semibold text-fg break-words">{titulo}</h1>
        <p className="font-body text-sm text-fg-muted mt-0.5">{subtitulo}</p>
      </div>
    </header>
  )
}
