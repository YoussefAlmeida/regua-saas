import Link from 'next/link'
import { headers, cookies } from 'next/headers'
import { criarClienteAutenticado } from '@/lib/supabase/server'
import { COOKIE_SESSION } from '@/lib/auth'

export default async function RelatoriosPage() {
  const h = await headers()
  const barbearia_id = h.get('x-barbearia-id')!
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_SESSION)!.value
  const db = criarClienteAutenticado(token)

  const mesAtual = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' }).slice(0, 7)
  const [y, m] = mesAtual.split('-').map(Number)
  const inicioMes = `${mesAtual}-01`
  const fimMes = `${y}-${String(m + 1).padStart(2, '0')}-01`

  const mesAnteriorDate = new Date(y, m - 2, 1)
  const mesAnterior = mesAnteriorDate.toLocaleDateString('sv-SE').slice(0, 7)
  const inicioMesAnt = `${mesAnterior}-01`

  const [{ data: agMes }, { data: agMesAnt }] = await Promise.all([
    db
      .from('agendamentos')
      .select('id, valor_servico, status, criado_em, cliente_id, profissional_id, profissional:profissionais!profissional_id(nome)')
      .eq('barbearia_id', barbearia_id)
      .gte('inicio', `${inicioMes}T00:00:00`)
      .lt('inicio', `${fimMes}T00:00:00`),
    db
      .from('agendamentos')
      .select('id, status')
      .eq('barbearia_id', barbearia_id)
      .gte('inicio', `${inicioMesAnt}T00:00:00`)
      .lt('inicio', `${inicioMes}T00:00:00`),
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
    .lt('inicio', `${inicioMes}T00:00:00`)
    .eq('status', 'concluido')
    .in('cliente_id', [...clientesDoMes].filter(Boolean) as string[])

  const clientesRetorno = new Set((clientesAnteriores.data ?? []).map(a => a.cliente_id))
  const novos = [...clientesDoMes].filter(id => id && !clientesRetorno.has(id)).length
  const retorno = [...clientesDoMes].filter(id => id && clientesRetorno.has(id)).length

  const nomeMes = new Date(`${mesAtual}-15`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-ui text-xl uppercase tracking-widest text-fg">Relatórios</h1>
        <span className="font-body text-xs text-fg-muted capitalize">{nomeMes}</span>
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
          <p className="font-mono text-2xl text-entrada">R$ {totalReceita.toFixed(2)}</p>
        </div>
        <div className="bg-surface border border-line rounded-card p-4">
          <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-1">Ticket médio</p>
          <p className="font-mono text-2xl text-amber">R$ {ticketMedio.toFixed(2)}</p>
        </div>
        <div className="bg-surface border border-line rounded-card p-4">
          <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-1">Clientes únicos</p>
          <p className="font-mono text-2xl text-fg">{clientesDoMes.size}</p>
        </div>
      </div>

      {/* Novos vs Retorno */}
      {clientesDoMes.size > 0 && (
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
      {ranking.length > 0 && (
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
                <span className="font-mono text-sm text-entrada shrink-0">R$ {prof.receita.toFixed(2)}</span>
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
