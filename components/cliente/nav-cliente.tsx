import Link from 'next/link'
import { CalendarPlus, CalendarCheck, UserRound } from 'lucide-react'

/* Barra inferior do cliente: as três áreas do app dele */
export default function NavCliente({ slug, ativo }: { slug: string; ativo: 'agendar' | 'horarios' | 'perfil' }) {
  const itens = [
    { id: 'agendar', href: `/${slug}`, rotulo: 'Agendar', Icone: CalendarPlus },
    { id: 'horarios', href: `/${slug}/meus-agendamentos`, rotulo: 'Meus horários', Icone: CalendarCheck },
    { id: 'perfil', href: `/${slug}/perfil`, rotulo: 'Perfil', Icone: UserRound },
  ] as const
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]" aria-label="Navegação">
      <div className="max-w-lg mx-auto flex">
        {itens.map(({ id, href, rotulo, Icone }) => (
          <Link key={id} href={href} aria-current={ativo === id ? 'page' : undefined}
            className={`relative flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 font-body text-[11px] transition-colors ${ativo === id ? 'text-fg font-semibold' : 'text-fg-muted hover:text-fg'}`}>
            {ativo === id && <span className="absolute top-0 w-7 h-0.5 bg-amber rounded-full" aria-hidden />}
            <Icone size={20} strokeWidth={ativo === id ? 2.2 : 1.7} className={ativo === id ? 'text-amber' : ''} aria-hidden />
            {rotulo}
          </Link>
        ))}
      </div>
    </nav>
  )
}
