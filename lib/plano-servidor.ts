import { cache } from 'react'
import { NextResponse } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'
import { situacaoPlano, PLANOS, planoParaProfissionais, type SituacaoPlano, type Recursos } from '@/lib/planos'

/** Situação do plano da barbearia (uma consulta por requisição) */
export const planoDaBarbearia = cache(async (barbearia_id: string): Promise<SituacaoPlano> => {
  const { data } = await criarClienteServico()
    .from('barbearias').select('plano, status, trial_fim, plano_ciclo_fim').eq('id', barbearia_id).maybeSingle()
  return situacaoPlano(data ?? { plano: 'trial', status: 'leitura', trial_fim: null })
})

const NOME_RECURSO: Record<keyof Recursos, string> = {
  historico: 'O Histórico',
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
