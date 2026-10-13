import { redirect } from 'next/navigation'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import PerfilClient from './perfil-client'

export default async function PerfilPage() {
  const sessao = await getSessao()
  if (!sessao) redirect('/entrar')
  if (sessao.papel !== 'barbeiro' || !sessao.profissional_id) redirect('/painel/mais')

  const { data: prof } = await criarClienteServico()
    .from('profissionais')
    .select('nome, especialidade, foto_url')
    .eq('id', sessao.profissional_id)
    .single()

  return <PerfilClient inicial={{ nome: prof?.nome ?? '', especialidade: prof?.especialidade ?? '', foto_url: prof?.foto_url ?? null }} />
}
