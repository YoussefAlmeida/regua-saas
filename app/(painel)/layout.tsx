import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { criarClienteServico } from '@/lib/supabase/server'
import { criarClienteAutenticado } from '@/lib/supabase/usuario'
import { getSessao } from '@/lib/auth'
import NavInferior from '@/components/nav-inferior'
import Avisos from '@/components/aviso'
import ConfirmarSenha from '@/components/confirmar-senha'
import AvisoPlano from '@/components/aviso-plano'
import PlanoDono from '@/components/plano-dono'
import { planoDaBarbearia, agendaDoPlano } from '@/lib/plano-servidor'
import { PLANOS, type PlanoPagoId } from '@/lib/planos'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const usuarioId = h.get('x-usuario-id')
  // Confere no banco: conta desativada ou barbeiro removido sai na hora
  const sessao = await getSessao()
  if (!usuarioId || !sessao || sessao.usuario_id !== usuarioId) redirect('/entrar')

  const barbearia_id = h.get('x-barbearia-id')!
  const papel = h.get('x-papel') as 'dono' | 'barbeiro' | 'cliente'

  const db = await criarClienteAutenticado()

  const { data: barbearia } = await db
    .from('barbearias')
    .select('nome, slug')
    .eq('id', barbearia_id)
    .single()

  // Cliente não tem painel — vai pros agendamentos dele
  if (papel === 'cliente') redirect(barbearia?.slug ? `/${barbearia.slug}/meus-agendamentos` : '/entrar')

  const souDono = papel === 'dono'
  const [{ data: usuario }, plano, agenda, { data: mudanca }] = await Promise.all([
    db.from('usuarios').select('nome').eq('id', usuarioId).single(),
    planoDaBarbearia(barbearia_id),
    agendaDoPlano(barbearia_id),
    // Sem a migração do ciclo, só não mostra os avisos de mudança
    souDono
      ? criarClienteServico().from('barbearias')
        .select('plano_agendado, plano_agendado_em, aviso_mudanca').eq('id', barbearia_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const agendado = mudanca?.plano_agendado && mudanca.plano_agendado_em
    ? { nome: PLANOS[mudanca.plano_agendado as PlanoPagoId]?.nome ?? mudanca.plano_agendado, em: mudanca.plano_agendado_em }
    : null

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Topo */}
      <header className="bg-surface/95 backdrop-blur border-b border-line sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <span className="font-display text-[19px] font-semibold text-fg truncate">{barbearia?.nome ?? 'RÉGUA'}</span>
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right leading-tight">
              <span className="font-body text-[13px] font-semibold text-fg block">{usuario?.nome?.split(' ')[0]}</span>
              <span className="font-body text-xs text-fg-muted">{papel === 'dono' ? 'Dono' : 'Barbeiro'}</span>
            </div>
            <span className="w-9 h-9 rounded-full bg-fg text-bg flex items-center justify-center font-display text-base font-semibold" aria-hidden>
              {usuario?.nome?.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <AvisoPlano plano={plano} souDono={souDono} excedente={agenda.excedente} agendado={agendado} />

      {/* Conteúdo */}
      <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] overflow-y-auto">{children}</main>

      {/* Nav inferior */}
      <NavInferior papel={papel} />
      <Avisos />
      <ConfirmarSenha />
      {souDono && !plano.somenteLeitura && (
        <PlanoDono aviso={mudanca?.aviso_mudanca ?? null} excedente={agenda.excedente} max={agenda.max} plano={plano.nome} />
      )}
    </div>
  )
}
