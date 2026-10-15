import { redirect } from 'next/navigation'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import HorariosClient from './horarios-client'

export default async function HorariosPage() {
  const sessao = await getSessao()
  if (!sessao || sessao.papel === 'cliente') redirect('/entrar')

  const db = criarClienteServico()

  let query = db
    .from('profissionais')
    .select('id, nome')
    .eq('barbearia_id', sessao.barbearia_id)
    .eq('ativo', true)
    .order('nome')
  // Cada um cuida só da própria agenda; o dono, se também corta, da dele
  query = query.eq('usuario_id', sessao.usuario_id)

  const [{ data: profissionais }, { data: barbearia }] = await Promise.all([
    query,
    db.from('barbearias').select('horario_funcionamento').eq('id', sessao.barbearia_id).single(),
  ])

  return (
    <HorariosClient
      profissionais={profissionais ?? []}
      horarioBarbearia={(barbearia?.horario_funcionamento ?? {}) as Record<string, { ativo?: boolean; inicio?: string; fim?: string }>}
      souDono={sessao.papel === 'dono'}
    />
  )
}
