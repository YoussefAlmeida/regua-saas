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
      <header className="bg-surface border-b border-line px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <span className="font-display text-xl text-amber tracking-wider">{barbearia?.nome ?? 'RÉGUA'}</span>
        </div>
        <div className="text-right">
          <span className="font-body text-xs text-fg-muted block">{usuario?.nome}</span>
          <span className="font-ui text-xs text-fg-muted uppercase tracking-wider">{papel}</span>
        </div>
      </header>

      <AvisoPlano plano={plano} souDono={souDono} excedente={agenda.excedente} agendado={agendado} />

      {/* Conteúdo */}
      <main className="flex-1 pb-20 overflow-y-auto">{children}</main>

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
