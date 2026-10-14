import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { PLANOS, LISTA_PLANOS, type PlanoPagoId, type Recursos } from '@/lib/planos'
import { pessoasDaEquipe } from '@/lib/plano-servidor'
import MudarPlano from './mudar-plano'

const NOMES: Record<keyof Recursos, string> = {
  historico: 'Histórico (quem lançou, apagou ou mudou valor)',
  relatoriosAvancados: 'Relatórios por barbeiro e de clientes',
  despesasFixas: 'Despesas fixas lançadas sozinhas todo mês',
}

export default async function MudarPlanoPage({ searchParams }: { searchParams: Promise<{ para?: string }> }) {
  const sessao = await getSessao()
  if (!sessao) redirect('/entrar')
  if (sessao.papel !== 'dono') redirect('/painel/mais')

  const { para } = await searchParams
  const db = criarClienteServico()
  const { data: b } = await db.from('barbearias')
    .select('plano, status, plano_ciclo_fim').eq('id', sessao.barbearia_id).single()

  const atual = b ? PLANOS[b.plano as PlanoPagoId] : undefined
  const novo = PLANOS[para as PlanoPagoId]
  if (!b || b.status !== 'ativo' || !atual || !novo || LISTA_PLANOS.indexOf(novo) >= LISTA_PLANOS.indexOf(atual)) {
    redirect('/painel/mais/plano')
  }

  // Quem está na agenda e quantos horários já marcados cada um tem (continuam)
  const pessoas = (await pessoasDaEquipe(sessao.barbearia_id)).filter(p => p.naAgenda)
  const { data: profs } = await db.from('profissionais')
    .select('id, usuario_id').eq('barbearia_id', sessao.barbearia_id).eq('ativo', true)
  const idDe = new Map((profs ?? []).map(p => [p.id, p.usuario_id]))
  const { data: ags } = idDe.size
    ? await db.from('agendamentos').select('profissional_id')
      .in('profissional_id', [...idDe.keys()]).in('status', ['agendado', 'confirmado'])
      .gte('inicio', new Date().toISOString())
    : { data: [] as { profissional_id: string }[] }
  const futuros: Record<string, number> = {}
  for (const a of ags ?? []) {
    const u = idDe.get(a.profissional_id)
    if (u) futuros[u] = (futuros[u] ?? 0) + 1
  }

  const perde = (Object.keys(NOMES) as (keyof Recursos)[])
    .filter(k => atual.recursos[k] && !novo.recursos[k]).map(k => NOMES[k])
  if (atual.suporte !== novo.suporte) perde.push(`${atual.suporte} (passa a ser: ${novo.suporte.toLowerCase()})`)

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/painel/mais/plano" className="text-fg-muted hover:text-fg" aria-label="Voltar"><ChevronLeft size={20} /></Link>
        <h1 className="font-display text-[28px] font-semibold leading-tight text-fg">Mudar pro {novo.nome}</h1>
      </div>
      <MudarPlano
        de={{ nome: atual.nome, preco: atual.preco }}
        para={{ id: novo.id, nome: novo.nome, preco: novo.preco, max: novo.maxProfissionais }}
        pagoAte={b.plano_ciclo_fim && new Date(b.plano_ciclo_fim).getTime() > Date.now() ? b.plano_ciclo_fim : null}
        perde={perde}
        pessoas={pessoas.map(p => ({ id: p.usuario_id, nome: p.nome, souEu: p.souDono, futuros: futuros[p.usuario_id] ?? 0 }))}
      />
    </div>
  )
}
