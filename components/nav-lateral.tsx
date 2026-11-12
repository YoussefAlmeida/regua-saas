'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Home, CalendarDays, Wallet, Users2, Users, Scissors, Clock,
  BarChart3, ShieldCheck, Settings, CreditCard, LogOut, UserRound,
} from 'lucide-react'
import { Marca } from '@/components/marca'

/* Menu lateral do painel no computador (no celular fica o menu inferior).
   Os itens seguem o papel: o barbeiro não vê nada de gestão. */

const DONO = [
  { href: '/painel/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/painel/hoje', label: 'Hoje', icon: Home },
  { href: '/painel/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/painel/mais/clientes', label: 'Clientes', icon: Users2 },
  { href: '/painel/mais/barbeiros', label: 'Equipe', icon: Users },
  { href: '/painel/mais/servicos', label: 'Serviços', icon: Scissors },
  { href: '/painel/mais/horarios', label: 'Horários', icon: Clock },
  { href: '/painel/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/painel/mais/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/painel/mais/historico', label: 'Histórico', icon: ShieldCheck },
  { href: '/painel/mais/configuracoes', label: 'Configurações', icon: Settings },
  { href: '/painel/mais/plano', label: 'Plano', icon: CreditCard },
]

const BARBEIRO = [
  { href: '/painel/hoje', label: 'Hoje', icon: Home },
  { href: '/painel/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/painel/mais/horarios', label: 'Meu horário', icon: Clock },
  { href: '/painel/mais/desempenho', label: 'Meu desempenho', icon: BarChart3 },
  { href: '/painel/mais/perfil', label: 'Meu perfil', icon: UserRound },
]

export default function NavLateral({ papel, barbearia, plano }: { papel: string; barbearia: string; plano: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const itens = papel === 'dono' ? DONO : BARBEIRO

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
        {itens.map(({ href, label, icon: Icon }) => {
          const ativo = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              aria-current={ativo ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-button px-3 py-2.5 font-ui text-sm transition-colors ${
                ativo ? 'bg-amber/15 text-amber font-semibold' : 'text-fg-muted hover:text-fg hover:bg-surface-alt'
              }`}
            >
              <Icon size={17} strokeWidth={ativo ? 2.2 : 1.7} />
              {label}
            </Link>
          )
        })}
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
