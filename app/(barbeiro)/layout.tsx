import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { criarClienteServico } from '@/lib/supabase/server'
import { getSessao } from '@/lib/auth'
import NavInferior from '@/components/nav-inferior'
import NavLateral from '@/components/nav-lateral'
import Avisos from '@/components/aviso'
import ConfirmarSenha from '@/components/confirmar-senha'
import Confirmar from '@/components/confirmar'
import AvisoPlano from '@/components/aviso-plano'
import { planoDaBarbearia, agendaDoPlano } from '@/lib/plano-servidor'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/* Área do barbeiro (/barbeiro): Hoje, Agenda e Perfil. Só entra barbeiro;
   o dono tem o painel dele e o cliente, a página da barbearia. */
export default async function BarbeiroLayout({ children }: { children: React.ReactNode }) {
  // Confere no banco: conta desativada ou barbeiro removido sai na hora
  const sessao = await getSessao()
  if (!sessao) redirect('/entrar')
  if (sessao.papel === 'dono') redirect('/painel/inicio')

  const db = criarClienteServico()
  const { data: barbearia } = await db.from('barbearias').select('nome, slug').eq('id', sessao.barbearia_id).single()
  if (sessao.papel !== 'barbeiro') redirect(barbearia?.slug ? `/${barbearia.slug}/perfil` : '/entrar')

  const [{ data: usuario }, plano, agenda] = await Promise.all([
    db.from('usuarios').select('nome').eq('id', sessao.usuario_id).single(),
    planoDaBarbearia(sessao.barbearia_id),
    agendaDoPlano(sessao.barbearia_id),
  ])

  return (
    <div className="min-h-screen bg-bg flex flex-col md:pl-60">
      <NavLateral papel="barbeiro" barbearia={barbearia?.nome ?? 'CUBO'} plano="Área do barbeiro" />
      <header className="bg-surface/95 backdrop-blur border-b border-line sticky top-0 z-10">
        <div className="max-w-lg md:max-w-none mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-3">
          <span className="font-display text-[19px] font-semibold text-fg truncate md:invisible">{barbearia?.nome ?? 'CUBO'}</span>
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right leading-tight">
              <span className="font-body text-[13px] font-semibold text-fg block">{usuario?.nome?.split(' ')[0]}</span>
              <span className="font-body text-xs text-fg-muted">Barbeiro</span>
            </div>
            <span className="w-9 h-9 rounded-full bg-fg text-bg flex items-center justify-center font-display text-base font-semibold" aria-hidden>
              {usuario?.nome?.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <AvisoPlano plano={plano} souDono={false} excedente={agenda.excedente} agendado={null} />

      <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-10 overflow-y-auto">{children}</main>

      <NavInferior papel="barbeiro" />
      <Avisos />
      <ConfirmarSenha />
      <Confirmar />
    </div>
  )
}
