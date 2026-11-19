import { cache } from 'react'
import { NextResponse } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'
import { situacaoPlano, PLANOS, planoParaProfissionais, ehSolo, type SituacaoPlano, type Recursos } from '@/lib/planos'

/** Situação do plano da barbearia (uma consulta por requisição) */
export const planoDaBarbearia = cache(async (barbearia_id: string): Promise<SituacaoPlano> => {
  const { data } = await criarClienteServico()
    .from('barbearias').select('plano, status, trial_fim, plano_ciclo_fim').eq('id', barbearia_id).maybeSingle()
  return situacaoPlano(data ?? { plano: 'trial', status: 'leitura', trial_fim: null })
})

const NOME_RECURSO: Record<keyof Recursos, string> = {
  relatoriosAvancados: 'Os relatórios avançados',
  despesasFixas: 'As despesas fixas automáticas',
}

/** 403 com explicação se o plano não tem o recurso; null se pode */
export async function exigirRecurso(barbearia_id: string, recurso: keyof Recursos): Promise<NextResponse | null> {
  const p = await planoDaBarbearia(barbearia_id)
  if (p.recursos[recurso]) return null
  return NextResponse.json(
    { erro: `${NOME_RECURSO[recurso]} fazem parte do plano Barbearia. Veja em Mais → Plano.`, upgrade: true },
    { status: 403 },
  )
}

/** Quantos estão na agenda agora (profissionais ativos) */
export async function contarProfissionais(barbearia_id: string): Promise<number> {
  const { count } = await criarClienteServico()
    .from('profissionais').select('id', { count: 'exact', head: true })
    .eq('barbearia_id', barbearia_id).eq('ativo', true)
  return count ?? 0
}

/** Bloqueia colocar mais alguém na agenda além do limite do plano */
export async function exigirVagaProfissional(barbearia_id: string): Promise<NextResponse | null> {
  const p = await planoDaBarbearia(barbearia_id)
  if (p.maxProfissionais === null) return null
  const atuais = await contarProfissionais(barbearia_id)
  if (atuais < p.maxProfissionais) return null
  const sugerido = PLANOS[planoParaProfissionais(atuais + 1)]
  return NextResponse.json({
    erro: `Seu plano ${p.nome} vai até ${p.maxProfissionais} profissional${p.maxProfissionais > 1 ? 'is' : ''} na agenda. Pra colocar mais um, mude pro plano ${sugerido.nome} em Mais → Plano.`,
    upgrade: true,
  }, { status: 403 })
}

export interface ProfissionalAgenda { id: string; nome: string; usuario_id: string; criado_em: string }

/** Quem está na agenda agora e quanto passa do limite do plano */
export const agendaDoPlano = cache(async (barbearia_id: string): Promise<{
  profissionais: ProfissionalAgenda[]; max: number | null; excedente: number
}> => {
  const [p, { data }] = await Promise.all([
    planoDaBarbearia(barbearia_id),
    criarClienteServico().from('profissionais')
      .select('id, nome, usuario_id, criado_em')
      .eq('barbearia_id', barbearia_id).eq('ativo', true)
      .order('criado_em', { ascending: true }),
  ])
  const lista = data ?? []
  const max = p.maxProfissionais
  return { profissionais: lista, max, excedente: max === null ? 0 : Math.max(0, lista.length - max) }
})

export interface PessoaDaEquipe { usuario_id: string; nome: string; naAgenda: boolean; souDono: boolean }

/** Dono + barbeiros aprovados e ativos, com quem está na agenda agora */
export async function pessoasDaEquipe(barbearia_id: string): Promise<PessoaDaEquipe[]> {
  const db = criarClienteServico()
  const [{ data: us }, { data: profs }] = await Promise.all([
    db.from('usuarios').select('id, nome, papel, criado_em')
      .eq('barbearia_id', barbearia_id).in('papel', ['dono', 'barbeiro'])
      .eq('ativo', true).eq('status', 'aprovado')
      .order('criado_em', { ascending: true }),
    db.from('profissionais').select('usuario_id, ativo').eq('barbearia_id', barbearia_id),
  ])
  const ativo = new Set((profs ?? []).filter(p => p.ativo).map(p => p.usuario_id))
  return (us ?? [])
    .map(u => ({ usuario_id: u.id, nome: u.nome, naAgenda: ativo.has(u.id), souDono: u.papel === 'dono' }))
    .sort((a, b) => Number(b.souDono) - Number(a.souDono))
}

/** Barbearia de um barbeiro só: as telas e rotas de equipe ficam escondidas */
export const modoSolo = cache(async (barbearia_id: string): Promise<boolean> => {
  const { max, profissionais } = await agendaDoPlano(barbearia_id)
  return ehSolo(max, profissionais.length)
})

/** 403 nas rotas de equipe quando a barbearia é de um barbeiro só; null se pode */
export async function bloquearNoSolo(barbearia_id: string): Promise<NextResponse | null> {
  if (!(await modoSolo(barbearia_id))) return null
  return NextResponse.json(
    { erro: 'Equipe faz parte do plano para barbearias com mais de um barbeiro. Fala com a gente pelo WhatsApp.', upgrade: true },
    { status: 403 },
  )
}

/**
 * Coloca o dono na agenda (é ele quem corta). Não faz nada se já está.
 * Usado no cadastro e nos primeiros passos do modo solo.
 */
export async function garantirDonoNaAgenda(barbearia_id: string, usuario_id: string, nome: string): Promise<void> {
  const db = criarClienteServico()
  const { data: existente } = await db.from('profissionais')
    .select('id, ativo').eq('usuario_id', usuario_id).maybeSingle()
  if (existente?.ativo) return
  if (existente) { await db.from('profissionais').update({ ativo: true }).eq('id', existente.id); return }
  // O banco aceita um profissional por usuário: clique duplo não duplica
  await db.from('profissionais').insert({ barbearia_id, usuario_id, nome })
}
