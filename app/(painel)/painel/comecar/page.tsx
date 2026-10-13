import { redirect } from 'next/navigation'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import ComecarClient from './comecar-client'

export const metadata = { title: 'Primeiros passos' }

export default async function ComecarPage() {
  const sessao = await getSessao()
  if (!sessao) redirect('/entrar')
  if (sessao.papel !== 'dono') redirect('/painel/hoje')

  const db = criarClienteServico()
  const [{ data: barbearia }, { data: servicos }, { data: profissionais }, { data: dono }] = await Promise.all([
    db.from('barbearias').select('nome, slug').eq('id', sessao.barbearia_id).single(),
    db.from('servicos').select('id, nome, preco, duracao_min').eq('barbearia_id', sessao.barbearia_id).eq('ativo', true).order('preco'),
    db.from('profissionais').select('id, nome, usuario_id').eq('barbearia_id', sessao.barbearia_id).eq('ativo', true),
    db.from('usuarios').select('nome').eq('id', sessao.usuario_id).single(),
  ])

  return (
    <ComecarClient
      barbearia={{ nome: barbearia?.nome ?? '', slug: barbearia?.slug ?? '' }}
      donoNome={dono?.nome ?? ''}
      servicosIniciais={servicos ?? []}
      temEquipe={(profissionais ?? []).length > 0}
      donoCorta={(profissionais ?? []).some(p => p.usuario_id === sessao.usuario_id)}
      siteUrl={(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://regua.app').replace(/\/+$/, '')}
    />
  )
}
