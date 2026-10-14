import { NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'

/** Dono viu o aviso de "seu plano mudou" — some do painel */
export async function DELETE() {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  await criarClienteServico().from('barbearias').update({ aviso_mudanca: null }).eq('id', sessao.barbearia_id)
  return NextResponse.json({ ok: true })
}
