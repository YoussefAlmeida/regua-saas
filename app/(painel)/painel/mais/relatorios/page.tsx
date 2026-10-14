import Link from 'next/link'
import { headers } from 'next/headers'
import { criarClienteAutenticado } from '@/lib/supabase/usuario'
import { formatBRL } from '@/lib/utils'
import { limitesDoMes, mesVizinho } from '@/lib/periodo'
import { planoDaBarbearia } from '@/lib/plano-servidor'
import RecursoBloqueado from '@/components/recurso-bloqueado'

export default async function RelatoriosPage() {
  const h = await headers()
  const barbearia_id = h.get('x-barbearia-id')!
  const db = await criarClienteAutenticado()

  const mesAtual = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' }).slice(0, 7)
  const { de: inicioMes, ate: fimMes } = limitesDoMes(mesAtual)
  const inicioMesAnt = limitesDoMes(mesVizinho(mesAtual, -1)).de
  // Meia-noite na Bahia = 03:00 UTC
  const T = 'T03:00:00Z'
  const plano = await planoDaBarbearia(barbearia_id)
  const avancado = plano.recursos.relatoriosAvancados

  const [{ data: agMes }, { data: agMesAnt }] = await Promise.all([
    db
      .from('agendamentos')
      .select('id, valor_servico, status, criado_em, cliente_id, profissional_id, profissional:profissionais!profissional_id(nome)')
      .eq('barbearia_id', barbearia_id)
      .gte('inicio', `${inicioMes}${T}`)
      .lt('inicio', `${fimMes}${T}`),
    db
      .from('agendamentos')
      .select('id, status')
      .eq('barbearia_id', barbearia_id)
      .gte('inicio', `${inicioMesAnt}${T}`)
      .lt('inicio', `${inicioMes}${T}`),
  ])

  const concluidos = (agMes ?? []).filter(a => a.status === 'concluido')
  const totalAtendimentos = concluidos.length
  const totalReceita = concluidos.reduce((s, a) => s + (a.valor_servico ?? 0), 0)
  const ticketMedio = totalAtendimentos > 0 ? totalReceita / totalAtendimentos : 0

  const concluidosAnt = (agMesAnt ?? []).filter(a => a.status === 'concluido').length
  const variacaoAts = concluidosAnt > 0
    ? Math.round(((totalAtendimentos - concluidosAnt) / concluidosAnt) * 100)
    : null

  // Ranking por profissional
  const rankingMap: Record<string, { id: string; nome: string; atendimentos: number; receita: number }> = {}
  for (const ag of concluidos) {
    const prof = Array.isArray(ag.profissional) ? ag.profissional[0] : ag.profissional
    const pid = ag.profissional_id
    if (!pid) continue
    if (!rankingMap[pid]) rankingMap[pid] = { id: pid, nome: (prof as { nome?: string } | null)?.nome ?? 'Barbeiro', atendimentos: 0, receita: 0 }
    rankingMap[pid].atendimentos++
    rankingMap[pid].receita += ag.valor_servico ?? 0
  }
  const ranking = Object.values(rankingMap).sort((a, b) => b.atendimentos - a.atendimentos)

  // Clientes novos vs retorno
  const clientesDoMes = new Set(concluidos.map(a => a.cliente_id))
  const clientesAnteriores = await db
    .from('agendamentos')
    .select('cliente_id')
    .eq('barbearia_id', barbearia_id)
    .lt('inicio', `${inicioMes}${T}`)
    .eq('status', 'concluido')
    .in('cliente_id', [...clientesDoMes].filter(Boolean) as string[])

  const clientesRetorno = new Set((clientesAnteriores.data ?? []).map(a => a.cliente_id))
  const novos = [...clientesDoMes].filter(id => id && !clientesRetorno.has(id)).length
  const retorno = [...clientesDoMes].filter(id => id && clientesRetorno.has(id)).length

  const nomeMes = new Date(`${mesAtual}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-ui text-xl uppercase tracking-widest text-fg">Relatórios</h1>
        <span className="font-body text-xs text-fg-muted inline-block first-letter:uppercase">{nomeMes}</span>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface border border-line rounded-card p-4">
          <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-1">Atendimentos</p>
          <p className="font-mono text-2xl text-fg">{totalAtendimentos}</p>
          {variacaoAts !== null && (
            <p className={`font-body text-xs mt-1 ${variacaoAts >= 0 ? 'text-entrada' : 'text-saida'}`}>
              {variacaoAts >= 0 ? '+' : ''}{variacaoAts}% vs mês ant.
            </p>
          )}
        </div>
        <div className="bg-surface border border-line rounded-card p-4">
          <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-1">Receita</p>
          <p className="font-mono text-2xl text-entrada">{formatBRL(totalReceita)}</p>
        </div>
        <div className="bg-surface border border-line rounded-card p-4">
          <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-1">Ticket médio</p>
          <p className="font-mono text-2xl text-amber">{formatBRL(ticketMedio)}</p>
        </div>
        <div className="bg-surface border border-line rounded-card p-4">
          <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-1">Clientes únicos</p>
          <p className="font-mono text-2xl text-fg">{clientesDoMes.size}</p>
        </div>
      </div>

      {!avancado && (
        <RecursoBloqueado
          titulo="Relatórios avançados"
          texto="Clientes novos x quem voltou e o ranking de cada barbeiro fazem parte do plano Barbearia."
        />
      )}

      {/* Novos vs Retorno */}
      {avancado && clientesDoMes.size > 0 && (
        <div className="bg-surface border border-line rounded-card p-4 space-y-3">
          <p className="font-ui text-xs uppercase tracking-wider text-fg-muted">Clientes</p>
          <div className="flex gap-4">
            <div className="flex-1 text-center">
              <p className="font-mono text-xl text-entrada">{novos}</p>
              <p className="font-body text-xs text-fg-muted mt-1">Novos</p>
            </div>
            <div className="w-px bg-line" />
            <div className="flex-1 text-center">
              <p className="font-mono text-xl text-info">{retorno}</p>
              <p className="font-body text-xs text-fg-muted mt-1">Retorno</p>
            </div>
          </div>
          {/* Barra de proporção */}
          {(novos + retorno) > 0 && (
            <div className="h-2 rounded-full bg-surface-alt overflow-hidden flex">
              <div
                className="bg-entrada h-full"
                style={{ width: `${Math.round((novos / (novos + retorno)) * 100)}%` }}
              />
              <div className="bg-info h-full flex-1" />
            </div>
          )}
        </div>
      )}

      {/* Ranking barbeiros */}
      {avancado && ranking.length > 0 && (
        <div className="bg-surface border border-line rounded-card overflow-hidden">
          <p className="font-ui text-xs uppercase tracking-wider text-fg-muted px-4 py-3 border-b border-line">
            Ranking da equipe
          </p>
          <div className="divide-y divide-line">
            {ranking.map((prof, i) => (
              <Link key={prof.id} href={`/painel/mais/desempenho?p=${prof.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-alt transition-colors">
                <span className="font-mono text-sm text-fg-muted w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-ui text-sm text-fg truncate">{prof.nome}</p>
                  <p className="font-body text-xs text-fg-muted">{prof.atendimentos} atendimentos</p>
                </div>
                <span className="font-mono text-sm text-entrada shrink-0">{formatBRL(prof.receita)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {totalAtendimentos === 0 && (
        <p className="font-body text-sm text-fg-muted text-center py-8">
          Nenhum atendimento concluído neste mês.
        </p>
      )}
    </div>
  )
}
