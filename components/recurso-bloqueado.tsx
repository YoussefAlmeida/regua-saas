import Link from 'next/link'
import { Lock } from 'lucide-react'

/* Cartão que aparece no lugar de um recurso que o plano não tem */
export default function RecursoBloqueado({ titulo, texto, plano = 'Barbearia' }: { titulo: string; texto: string; plano?: string }) {
  return (
    <div className="bg-surface border border-amber/30 rounded-card p-5 text-center space-y-3">
      <div className="w-10 h-10 rounded-full bg-amber/10 text-amber flex items-center justify-center mx-auto">
        <Lock size={16} />
      </div>
      <p className="font-ui text-sm uppercase tracking-wider text-fg">{titulo}</p>
      <p className="font-body text-sm text-fg-muted">{texto}</p>
      <Link href="/painel/mais/plano" className="inline-block bg-amber hover:bg-accent-press text-accent-fg font-ui text-xs uppercase tracking-wider px-5 py-2.5 rounded-button transition-colors">
        Ver plano {plano}
      </Link>
    </div>
  )
}
