import { headers } from 'next/headers'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { menuDono } from '@/components/menu'
import { planoDaBarbearia, modoSolo } from '@/lib/plano-servidor'

export default async function MaisPage() {
  const h = await headers()
  const barbearia_id = h.get('x-barbearia-id')!
  const [plano, solo] = await Promise.all([planoDaBarbearia(barbearia_id), modoSolo(barbearia_id)])

  const textoPlano = plano.emTeste ? `Teste grátis · ${plano.diasTeste} dia${plano.diasTeste === 1 ? '' : 's'}` : `Plano ${plano.nome}`

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="ds-titulo mb-6">Mais</h1>

      <div className="space-y-6">
        {menuDono(solo).map(({ grupo, itens }) => (
          <section key={grupo} className="space-y-2">
            <h2 className="ds-eyebrow">{grupo}</h2>
            {itens.map(({ href, label, desc, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-4 bg-surface rounded-card border border-line px-4 py-3.5 hover:border-amber/40 transition-colors">
                <div className="w-10 h-10 rounded-button bg-surface-alt flex items-center justify-center text-amber shrink-0"><Icon size={18} /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold font-ui text-sm text-fg">{label}</p>
                  <p className="font-body text-xs text-fg-muted">{href === '/painel/mais/plano' ? textoPlano : desc}</p>
                </div>
                <span className="text-fg-muted text-lg" aria-hidden>›</span>
              </Link>
            ))}
          </section>
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
        className="font-semibold flex items-center gap-3 text-saida font-ui text-sm hover:opacity-80 transition-opacity"
      >
        <LogOut size={16} />
        Sair
      </button>
    </form>
  )
}
