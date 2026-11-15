'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { MENU_DONO, ATALHOS_DONO, MENU_BARBEIRO } from '@/components/menu'

/* Barra de baixo no celular. Dono: Início, Agenda, Financeiro e Mais
   (o resto do menu). Barbeiro: Hoje, Agenda e Perfil. */
export default function NavInferior({ papel }: { papel: string }) {
  const pathname = usePathname()
  const itens = papel === 'dono'
    ? [...MENU_DONO.flatMap(g => g.itens).filter(i => ATALHOS_DONO.includes(i.href)), { href: '/painel/mais', label: 'Mais', icon: MoreHorizontal }]
    : MENU_BARBEIRO

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur border-t border-line z-20 pb-[env(safe-area-inset-bottom)]" aria-label="Navegação">
      <div className="max-w-lg mx-auto flex">
        {itens.map(({ href, label, icon: Icon }) => {
          const ativo = pathname === href || pathname.startsWith(`${href}/`)
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
