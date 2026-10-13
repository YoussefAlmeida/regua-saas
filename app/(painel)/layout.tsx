import type { Metadata } from 'next'
import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { criarClienteAutenticado } from '@/lib/supabase/server'
import { COOKIE_SESSION, getSessao } from '@/lib/auth'
import NavInferior from '@/components/nav-inferior'
import Avisos from '@/components/aviso'
import ConfirmarSenha from '@/components/confirmar-senha'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const usuarioId = h.get('x-usuario-id')
  // Confere no banco: conta desativada ou barbeiro removido sai na hora
  const sessao = await getSessao()
  if (!usuarioId || !sessao || sessao.usuario_id !== usuarioId) redirect('/entrar')

  const barbearia_id = h.get('x-barbearia-id')!
  const papel = h.get('x-papel') as 'dono' | 'barbeiro' | 'cliente'

  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_SESSION)!.value
  const db = criarClienteAutenticado(token)

  const { data: barbearia } = await db
    .from('barbearias')
    .select('nome, slug')
    .eq('id', barbearia_id)
    .single()

  // Cliente não tem painel — vai pros agendamentos dele
  if (papel === 'cliente') redirect(barbearia?.slug ? `/${barbearia.slug}/meus-agendamentos` : '/entrar')

  const { data: usuario } = await db
    .from('usuarios')
    .select('nome')
    .eq('id', usuarioId)
    .single()

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

      {/* Conteúdo */}
      <main className="flex-1 pb-20 overflow-y-auto">{children}</main>

      {/* Nav inferior */}
      <NavInferior papel={papel} />
      <Avisos />
      <ConfirmarSenha />
    </div>
  )
}
