import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Clock, BarChart3, ChevronRight } from 'lucide-react'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import PerfilBarbeiro from '@/components/perfil-barbeiro'
import Sair from '@/components/sair'

export const metadata = { title: 'Perfil' }

/* Perfil do barbeiro: foto e especialidade, e as portas pra Meu horário e Meu desempenho */
export default async function PerfilBarbeiroPage() {
  const sessao = await getSessao()
  if (!sessao) redirect('/entrar')
  if (!sessao.profissional_id) redirect('/barbeiro/hoje')

  const { data: prof } = await criarClienteServico()
    .from('profissionais')
    .select('nome, especialidade, foto_url')
    .eq('id', sessao.profissional_id)
    .single()

  const linha = 'flex items-center gap-4 px-4 py-4 hover:bg-surface-alt/60 transition-colors'
  return (
    <>
      <PerfilBarbeiro inicial={{ nome: prof?.nome ?? '', especialidade: prof?.especialidade ?? '', foto_url: prof?.foto_url ?? null }} />
      <div className="px-4 pb-6 max-w-lg mx-auto space-y-4">
        <nav className="ds-card divide-y divide-line overflow-hidden" aria-label="Mais do seu perfil">
          <Link href="/barbeiro/perfil/horario" className={linha}>
            <Clock size={22} className="text-amber shrink-0" strokeWidth={1.7} aria-hidden />
            <span className="flex-1 min-w-0"><span className="block font-display text-base font-semibold text-fg">Meu horário</span><span className="block font-body text-sm text-fg-muted">Dias, almoço e bloqueios</span></span>
            <ChevronRight size={18} className="text-fg-muted shrink-0" aria-hidden />
          </Link>
          <Link href="/barbeiro/perfil/desempenho" className={linha}>
            <BarChart3 size={22} className="text-amber shrink-0" strokeWidth={1.7} aria-hidden />
            <span className="flex-1 min-w-0"><span className="block font-display text-base font-semibold text-fg">Meu desempenho</span><span className="block font-body text-sm text-fg-muted">Quanto você fez hoje, na semana e no mês</span></span>
            <ChevronRight size={18} className="text-fg-muted shrink-0" aria-hidden />
          </Link>
        </nav>
        <Sair />
      </div>
    </>
  )
}
