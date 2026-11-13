import type { SupabaseClient } from '@supabase/supabase-js'

/* Avaliações dos clientes (tabela da migração 20261115000000).
   Sem a tabela, tudo aqui devolve "nada" e as telas só não mostram estrelas. */

export interface ResumoAvaliacoes {
  media: number
  total: number
  porProfissional: Record<string, { media: number; total: number }>
  recentes: { nota: number; comentario: string; nome: string; quando: string }[]
}

export async function resumoAvaliacoes(db: SupabaseClient, barbearia_id: string): Promise<ResumoAvaliacoes | null> {
  const { data, error } = await db.from('avaliacoes')
    .select('nota, comentario, criado_em, profissional_id, cliente:usuarios!cliente_id(nome)')
    .eq('barbearia_id', barbearia_id).order('criado_em', { ascending: false }).limit(1000)
  if (error || !data?.length) return null
  const linhas = data as unknown as { nota: number; comentario: string | null; criado_em: string; profissional_id: string | null; cliente: { nome: string } | { nome: string }[] | null }[]
  const soma = new Map<string, { s: number; n: number }>()
  let total = 0
  for (const a of linhas) {
    total += a.nota
    if (!a.profissional_id) continue
    const p = soma.get(a.profissional_id) ?? { s: 0, n: 0 }
    p.s += a.nota; p.n++
    soma.set(a.profissional_id, p)
  }
  const um = (v: { nome: string } | { nome: string }[] | null) => (Array.isArray(v) ? v[0] : v)?.nome ?? 'Cliente'
  return {
    media: total / linhas.length,
    total: linhas.length,
    porProfissional: Object.fromEntries([...soma].map(([id, p]) => [id, { media: p.s / p.n, total: p.n }])),
    // Só o primeiro nome aparece em público
    recentes: linhas.filter(a => a.comentario).slice(0, 6).map(a => ({ nota: a.nota, comentario: a.comentario!, nome: um(a.cliente).split(' ')[0], quando: a.criado_em })),
  }
}

/** Notas que o cliente já deu, por agendamento */
export async function minhasAvaliacoes(db: SupabaseClient, cliente_id: string): Promise<{ liberado: boolean; notas: Record<string, number> }> {
  const { data, error } = await db.from('avaliacoes').select('agendamento_id, nota').eq('cliente_id', cliente_id)
  return { liberado: !error, notas: Object.fromEntries(((data ?? []) as { agendamento_id: string; nota: number }[]).map(a => [a.agendamento_id, a.nota])) }
}

export const notaTexto = (media: number) => media.toFixed(1).replace('.', ',')
