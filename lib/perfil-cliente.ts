import { notFound, redirect } from 'next/navigation'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { carregarBarbeariaPublica } from '@/lib/barbearia-publica'
import { temaDaBarbearia } from '@/lib/tema'

/* O que toda tela do Perfil do cliente precisa: a barbearia do link e a
   conta de quem está logado nela. Sem login, `cliente` vem null. */
export async function carregarPerfil(slug: string) {
  const dados = await carregarBarbeariaPublica(slug)
  if (!dados) notFound()
  const b = dados.barbearia
  const base = {
    barbearia: { id: b.id, nome: b.nome, slug: b.slug, telefone: b.telefone, endereco: b.endereco },
    tema: temaDaBarbearia(b).vars as React.CSSProperties,
    servicos: dados.servicos,
  }
  const sessao = await getSessao()
  if (sessao?.papel !== 'cliente' || sessao.barbearia_id !== b.id) return { ...base, cliente: null }
  const db = criarClienteServico()
  const { data: u } = await db.from('usuarios').select('nome, whatsapp').eq('id', sessao.usuario_id).eq('barbearia_id', b.id).maybeSingle()
  if (!u) return { ...base, cliente: null }
  return { ...base, cliente: { id: sessao.usuario_id, nome: u.nome as string, whatsapp: (u.whatsapp ?? '') as string } }
}

/** Telas internas: sem login, volta pro Perfil (que mostra a entrada) */
export async function carregarPerfilLogado(slug: string) {
  const p = await carregarPerfil(slug)
  if (!p.cliente) redirect(`/${slug}/perfil`)
  return { ...p, cliente: p.cliente }
}
