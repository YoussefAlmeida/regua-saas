'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Marca } from '@/components/marca'
import { menuDono, MENU_BARBEIRO } from '@/components/menu'

/* Menu lateral no computador (no celular fica a barra de baixo).
   Dono: três blocos. Barbeiro: Hoje, Agenda e Perfil. */

export default function NavLateral({ papel, barbearia, plano, solo = false }: { papel: string; barbearia: string; plano: string; solo?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const grupos = papel === 'dono' ? menuDono(solo) : [{ grupo: '', itens: MENU_BARBEIRO }]

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    router.replace('/entrar')
  }

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-60 flex-col bg-surface border-r border-line">
      <div className="px-5 pt-5 pb-4">
        <Marca className="text-fg" />
      </div>

      <div className="mx-3 mb-3 rounded-card bg-surface-alt border border-line px-3 py-2.5">
        <p className="font-ui text-sm font-semibold text-fg truncate">{barbearia}</p>
        <p className="font-body text-xs text-fg-muted truncate">{plano}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5" aria-label="Painel">
        {grupos.map(({ grupo, itens }) => (
          <div key={grupo} className="space-y-0.5">
            {grupo && <p className="ds-eyebrow px-3 pt-3 pb-1">{grupo}</p>}
            {itens.map(({ href, label, icon: Icon }) => {
          const ativo = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              aria-current={ativo ? 'page' : undefined}
              className={`relative flex items-center gap-3 rounded-button px-3 py-2.5 font-ui text-sm transition-colors ${
                ativo ? 'bg-surface-alt text-fg font-semibold' : 'text-fg-muted hover:text-fg hover:bg-surface-alt'
              }`}
            >
              {ativo && <span className="absolute -left-3 top-2 bottom-2 w-0.5 rounded-full bg-amber" aria-hidden />}
              <Icon size={17} strokeWidth={ativo ? 2.2 : 1.7} className={ativo ? 'text-amber' : ''} />
              {label}
            </Link>
          )
        })}
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <button
          onClick={sair}
          className="w-full flex items-center gap-3 rounded-button px-3 py-2.5 font-ui text-sm text-fg-muted hover:text-saida hover:bg-surface-alt transition-colors"
        >
          <LogOut size={17} strokeWidth={1.7} /> Sair
        </button>
      </div>
    </aside>
  )
}
