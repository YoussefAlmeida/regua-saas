'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, LayoutDashboard, DollarSign, MoreHorizontal } from 'lucide-react'

const ITENS = [
  { href: '/painel/hoje', label: 'Hoje', icon: LayoutDashboard },
  { href: '/painel/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/painel/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/painel/mais', label: 'Mais', icon: MoreHorizontal },
]

export default function NavInferior({ papel }: { papel: string }) {
  const pathname = usePathname()

  // Esconde financeiro p/ não-donos
  const itens = papel === 'dono' ? ITENS : ITENS.filter(i => i.href !== '/painel/financeiro')

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line z-20">
      <div className="flex">
        {itens.map(({ href, label, icon: Icon }) => {
          const ativo = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                ativo ? 'text-amber' : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Icon size={20} strokeWidth={ativo ? 2 : 1.5} />
              <span className="font-ui text-[10px] uppercase tracking-wider">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
