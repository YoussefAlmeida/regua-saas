'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Home, Wallet, MoreHorizontal } from 'lucide-react'

const ITENS = [
  { href: '/painel/hoje', label: 'Hoje', icon: Home },
  { href: '/painel/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/painel/financeiro', label: 'Caixa', icon: Wallet },
  { href: '/painel/mais', label: 'Mais', icon: MoreHorizontal },
]

export default function NavInferior({ papel }: { papel: string }) {
  const pathname = usePathname()

  // Esconde financeiro p/ não-donos
  const itens = papel === 'dono' ? ITENS : ITENS.filter(i => i.href !== '/painel/financeiro')

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur border-t border-line z-20 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto flex">
        {itens.map(({ href, label, icon: Icon }) => {
          const ativo = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={ativo ? 'page' : undefined}
              className={`relative flex-1 flex flex-col items-center gap-1 pt-3 pb-2.5 transition-colors ${
                ativo ? 'text-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {ativo && <span className="absolute top-0 inset-x-6 h-0.5 rounded-full bg-amber" aria-hidden />}
              <Icon size={21} strokeWidth={ativo ? 2.2 : 1.6} className={ativo ? 'text-amber' : ''} />
              <span className={`font-body text-xs ${ativo ? 'font-semibold' : ''}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
