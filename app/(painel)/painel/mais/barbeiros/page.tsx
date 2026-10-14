import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { criarClienteAutenticado, criarClienteServico } from '@/lib/supabase/server'
import { COOKIE_SESSION, getSessao } from '@/lib/auth'
import { planoDaBarbearia } from '@/lib/plano-servidor'
import BarbeirosClient from './barbeiros-client'

export default async function BarbeirosPage() {
  const h = await headers()
  const papel = h.get('x-papel')
  if (papel !== 'dono') redirect('/painel/mais')
  const sessao = await getSessao()
  if (!sessao) redirect('/entrar')

  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_SESSION)!.value
  const db = criarClienteAutenticado(token)

  const [{ data: barbeiros }, { data: eu }, { data: dono }, plano] = await Promise.all([
    db.from('usuarios')
      .select('id, nome, whatsapp, status, ativo, criado_em, profissionais(id, ativo)')
      .eq('papel', 'barbeiro')
      .order('criado_em', { ascending: false }),
    criarClienteServico().from('profissionais').select('ativo').eq('usuario_id', sessao.usuario_id).maybeSingle(),
    criarClienteServico().from('usuarios').select('nome').eq('id', sessao.usuario_id).single(),
    planoDaBarbearia(sessao.barbearia_id),
  ])

  return (
    <BarbeirosClient
      barbeirosIniciais={barbeiros ?? []}
      dono={{ nome: dono?.nome ?? 'Você', naAgenda: !!eu?.ativo }}
      max={plano.maxProfissionais}
    />
  )
}
