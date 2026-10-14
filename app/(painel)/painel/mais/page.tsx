import { headers } from 'next/headers'
import Link from 'next/link'
import { Scissors, Users, Users2, Settings, CreditCard, BarChart3, LogOut, Clock, ShieldCheck, Lock } from 'lucide-react'
import { planoDaBarbearia } from '@/lib/plano-servidor'

export default async function MaisPage() {
  const h = await headers()
  const papel = h.get('x-papel') as 'dono' | 'barbeiro' | 'cliente'
  const plano = await planoDaBarbearia(h.get('x-barbearia-id')!)

  const ITENS_DONO = [
    { href: '/painel/mais/servicos', label: 'Serviços', desc: 'Preços e duração', icon: Scissors },
    { href: '/painel/mais/barbeiros', label: 'Equipe', desc: 'Barbeiros e aprovações', icon: Users },
    { href: '/painel/mais/horarios', label: 'Horários e bloqueios', desc: 'Expediente, almoço e folgas da equipe', icon: Clock },
    { href: '/painel/mais/clientes', label: 'Clientes', desc: 'Histórico de clientes', icon: Users2 },
    { href: '/painel/mais/relatorios', label: 'Relatórios', desc: 'Desempenho e métricas', icon: BarChart3 },
    { href: '/painel/mais/historico', label: 'Histórico', desc: 'Quem lançou, apagou ou mudou valor', icon: ShieldCheck, bloqueado: !plano.recursos.historico },
    { href: '/painel/mais/configuracoes', label: 'Configurações', desc: 'Horários e dados da barbearia', icon: Settings },
    { href: '/painel/mais/plano', label: 'Plano', desc: plano.emTeste ? `Teste grátis · ${plano.diasTeste} dia${plano.diasTeste === 1 ? '' : 's'}` : plano.nome, icon: CreditCard },
  ]

  const ITENS_BARBEIRO = [
    { href: '/painel/mais/horarios', label: 'Meu horário', desc: 'Dias, almoço e bloqueios', icon: Clock },
    { href: '/painel/mais/desempenho', label: 'Meu desempenho', desc: 'Quanto você fez hoje, na semana e no mês', icon: BarChart3 },
    { href: '/painel/mais/perfil', label: 'Meu perfil', desc: 'Foto e especialidade', icon: Settings },
  ]

  const itens: { href: string; label: string; desc: string; icon: typeof Lock; bloqueado?: boolean }[] = papel === 'dono' ? ITENS_DONO : ITENS_BARBEIRO

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="font-ui text-xl uppercase tracking-widest text-fg mb-6">Mais</h1>

      <div className="space-y-2">
        {itens.map(({ href, label, desc, icon: Icon, bloqueado }) => (
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
            {bloqueado
              ? <span className="flex items-center gap-1 font-ui text-[10px] uppercase tracking-wider text-amber"><Lock size={11} /> Barbearia</span>
              : <span className="text-fg-muted text-lg">›</span>}
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
