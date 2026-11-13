import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { todasAsLinhas } from '@/lib/paginar'
import { limitesDoMes, mesVizinho } from '@/lib/periodo'
import { extrasDosProfissionais } from '@/lib/extras'
import ComissoesClient, { type LinhaComissao } from './comissoes-client'

export const metadata = { title: 'Comissões' }

/* Comissões por profissional no mês (só o dono) */
export default async function ComissoesPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sessao = await getSessao()
  if (!sessao) redirect('/entrar')
  if (sessao.papel !== 'dono') redirect('/painel/mais')

  const mesAtual = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' }).slice(0, 7)
  const pedido = (await searchParams).m
  const mes = pedido && /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido) && pedido <= mesAtual ? pedido : mesAtual
  const { de, ate } = limitesDoMes(mes)
  const T = 'T03:00:00Z'   // meia-noite na Bahia

  const db = criarClienteServico()
  const [{ data: profs }, extras, { data: ags }] = await Promise.all([
    db.from('profissionais').select('id, nome, ativo').eq('barbearia_id', sessao.barbearia_id).order('nome'),
    extrasDosProfissionais(db, sessao.barbearia_id),
    todasAsLinhas((a, b) => db.from('agendamentos').select('id, profissional_id, valor_servico')
      .eq('barbearia_id', sessao.barbearia_id).eq('status', 'concluido')
      .gte('inicio', `${de}${T}`).lt('inicio', `${ate}${T}`).order('id').range(a, b)),
  ])

  const soma = new Map<string, { n: number; v: number }>()
  for (const a of ags ?? []) {
    const s = soma.get(a.profissional_id) ?? { n: 0, v: 0 }
    s.n++; s.v += Number(a.valor_servico)
    soma.set(a.profissional_id, s)
  }
  // Quem está na agenda, ou saiu mas atendeu no mês
  const linhas: LinhaComissao[] = (profs ?? [])
    .filter(p => p.ativo || soma.has(p.id))
    .map(p => ({
      id: p.id, nome: p.nome, naAgenda: p.ativo,
      atendimentos: soma.get(p.id)?.n ?? 0,
      gerado: Math.round((soma.get(p.id)?.v ?? 0) * 100) / 100,
      comissao_pct: extras.mapa.get(p.id)?.comissao_pct ?? null,
      meta_mensal: extras.mapa.get(p.id)?.meta_mensal ?? null,
    }))
    .sort((x, y) => y.gerado - x.gerado)

  const nomeMes = new Date(`${mes}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <div className="px-4 md:px-8 py-6 max-w-lg md:max-w-3xl mx-auto space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="ds-titulo">Comissões</h1>
          <p className="font-body text-sm text-fg-muted">Quanto cada profissional gerou e quanto recebe</p>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/painel/mais/comissoes?m=${mesVizinho(mes, -1)}`} className="w-9 h-9 rounded-button border border-line flex items-center justify-center text-fg-muted hover:text-fg" aria-label="Mês anterior"><ChevronLeft size={16} /></Link>
          <span className="font-display text-sm font-semibold text-fg px-2 first-letter:uppercase">{nomeMes}</span>
          {mes < mesAtual
            ? <Link href={`/painel/mais/comissoes?m=${mesVizinho(mes, 1)}`} className="w-9 h-9 rounded-button border border-line flex items-center justify-center text-fg-muted hover:text-fg" aria-label="Próximo mês"><ChevronRight size={16} /></Link>
            : <span className="w-9 h-9" aria-hidden />}
        </div>
      </div>
      <ComissoesClient key={mes} linhasIniciais={linhas} liberado={extras.liberado} />
    </div>
  )
}
