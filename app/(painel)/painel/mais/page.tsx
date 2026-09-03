import { headers } from 'next/headers'
import Link from 'next/link'
import { Scissors, Users, Users2, Settings, CreditCard, BarChart3, LogOut } from 'lucide-react'

export default async function MaisPage() {
  const h = await headers()
  const papel = h.get('x-papel') as 'dono' | 'barbeiro' | 'cliente'

  const ITENS_DONO = [
    { href: '/painel/mais/servicos', label: 'Serviços', desc: 'Preços e duração', icon: Scissors },
    { href: '/painel/mais/barbeiros', label: 'Equipe', desc: 'Barbeiros e aprovações', icon: Users },
    { href: '/painel/mais/clientes', label: 'Clientes', desc: 'Histórico de clientes', icon: Users2 },
    { href: '/painel/mais/relatorios', label: 'Relatórios', desc: 'Desempenho e métricas', icon: BarChart3 },
    { href: '/painel/mais/configuracoes', label: 'Configurações', desc: 'Horários e dados da barbearia', icon: Settings },
    { href: '/painel/mais/plano', label: 'Plano', desc: 'Assinatura e fatura', icon: CreditCard },
  ]

  const ITENS_BARBEIRO = [
    { href: '/painel/mais/configuracoes', label: 'Meu perfil', desc: 'Foto e especialidade', icon: Settings },
  ]

  const itens = papel === 'dono' ? ITENS_DONO : ITENS_BARBEIRO

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="font-ui text-xl uppercase tracking-widest text-fg mb-6">Mais</h1>

      <div className="space-y-2">
        {itens.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 bg-surface rounded-card border border-line px-4 py-4 hover:border-amber/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-button bg-surface-alt flex items-center justify-center text-amber shrink-0">
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-ui text-sm uppercase tracking-wider text-fg">{label}</p>
              <p className="font-body text-xs text-fg-muted">{desc}</p>
            </div>
            <span className="text-fg-muted text-lg">›</span>
          </Link>
        ))}
      </div>

      {/* Logout */}
      <LogoutBtn />
    </div>
  )
}

function LogoutBtn() {
  return (
    <form
      action={async () => {
        'use server'
        const { cookies } = await import('next/headers')
        const { COOKIE_SESSION } = await import('@/lib/auth')
        const cookieStore = await cookies()
        cookieStore.delete(COOKIE_SESSION)
        const { redirect } = await import('next/navigation')
        redirect('/entrar')
      }}
      className="mt-8"
    >
      <button
        type="submit"
        className="flex items-center gap-3 text-saida font-ui text-sm uppercase tracking-wider hover:opacity-80 transition-opacity"
      >
        <LogOut size={16} />
        Sair
      </button>
    </form>
  )
}
