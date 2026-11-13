import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, Star } from 'lucide-react'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { todasAsLinhas } from '@/lib/paginar'
import { extrasDosProfissionais } from '@/lib/extras'
import { pode } from '@/lib/permissoes-equipe'
import { resumoAvaliacoes, notaTexto } from '@/lib/avaliacoes'

/* "Meu desempenho" — Módulo 5
   Só o próprio número: atendimentos feitos e valor gerado. Sem comparar
   com colegas e sem ver o financeiro da barbearia. O dono pode abrir o de
   qualquer barbeiro (?p=<profissional_id>). */

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function inicioLocalUTC(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d, 3, 0, 0))
}

export default async function DesempenhoPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel === 'cliente') redirect('/entrar')

  if (!(await pode(sessao, 'ver_valores'))) {
    return (
      <div className="px-4 py-16 max-w-lg mx-auto text-center space-y-2">
        <h1 className="ds-titulo">Meu desempenho</h1>
        <p className="font-body text-sm text-fg-muted">O dono da barbearia não liberou os valores pra equipe. Fala com ele se precisar ver seus números.</p>
      </div>
    )
  }

  const db = criarClienteServico()
  const pedido = (await searchParams).p
  const profissional_id = sessao.papel === 'barbeiro' ? sessao.profissional_id : pedido
  if (!profissional_id) redirect('/painel/mais/relatorios')

  const { data: prof } = await db
    .from('profissionais')
    .select('id, nome')
    .eq('id', profissional_id)
    .eq('barbearia_id', sessao.barbearia_id)
    .maybeSingle()
  if (!prof) redirect('/painel/mais')

  // Datas no fuso da Bahia
  const hojeIso = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
  const [y, m, d] = hojeIso.split('-').map(Number)
  const hoje = inicioLocalUTC(y, m, d)
  const diaSemana = new Date(Date.UTC(y, m - 1, d)).getUTCDay()          // 0 = domingo
  const semana = inicioLocalUTC(y, m, d - ((diaSemana + 6) % 7))         // segunda-feira
  const mes = inicioLocalUTC(y, m, 1)
  const seteDias = inicioLocalUTC(y, m, d - 6)
  const mesPassado = inicioLocalUTC(y, m - 1, 1)
  const desde = new Date(Math.min(semana.getTime(), mesPassado.getTime(), seteDias.getTime()))

  const { data: ags } = await todasAsLinhas((de, ate) => db
    .from('agendamentos')
    .select('id, inicio, status, valor_servico, servico:servicos!servico_id(nome)')
    .eq('profissional_id', profissional_id)
    .in('status', ['concluido', 'faltou'])
    .gte('inicio', desde.toISOString())
    .lt('inicio', inicioLocalUTC(y, m, d + 1).toISOString())
    .order('id').range(de, ate))

  const feitos = (ags ?? []).filter(a => a.status === 'concluido')
  const soma = (de: Date) => {
    const l = feitos.filter(a => new Date(a.inicio) >= de)
    return { qtd: l.length, valor: l.reduce((s, a) => s + Number(a.valor_servico), 0) }
  }
  const periodos = [
    { rotulo: 'Hoje', ...soma(hoje) },
    { rotulo: 'Semana', ...soma(semana) },
    { rotulo: 'Mês', ...soma(mes) },
  ]

  // Mês passado inteiro: referência pro anel de progresso do mês
  const doMesPassado = feitos.filter(a => { const t = new Date(a.inicio); return t >= mesPassado && t < mes })
  const totalMesPassado = doMesPassado.reduce((s, a) => s + Number(a.valor_servico), 0)
  // Com meta definida pelo dono, o anel mostra a meta; sem ela, compara com o mês passado
  const meu = (await extrasDosProfissionais(db, sessao.barbearia_id)).mapa.get(profissional_id)
  const meta = meu?.meta_mensal && meu.meta_mensal > 0 ? meu.meta_mensal : null
  const comissao = meu?.comissao_pct != null ? { pct: meu.comissao_pct, valor: periodos[2].valor * meu.comissao_pct / 100 } : null
  const progresso = meta ? Math.round((periodos[2].valor / meta) * 100)
    : totalMesPassado > 0 ? Math.round((periodos[2].valor / totalMesPassado) * 100) : null
  const nomeMesPassado = new Date(Date.UTC(y, m - 2, 1)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })
  const RAIO = 52, VOLTA = 2 * Math.PI * RAIO

  const avaliacao = (await resumoAvaliacoes(db, sessao.barbearia_id))?.porProfissional[profissional_id] ?? null

  const faltasMes = (ags ?? []).filter(a => a.status === 'faltou' && new Date(a.inicio) >= mes).length

  // Últimos 7 dias
  const dias = Array.from({ length: 7 }, (_, i) => {
    const ini = inicioLocalUTC(y, m, d - 6 + i)
    const fim = inicioLocalUTC(y, m, d - 5 + i)
    const l = feitos.filter(a => { const t = new Date(a.inicio); return t >= ini && t < fim })
    return {
      rotulo: new Date(Date.UTC(y, m - 1, d - 6 + i)).toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', ''),
      valor: l.reduce((s, a) => s + Number(a.valor_servico), 0),
      qtd: l.length,
    }
  })
  const maxDia = Math.max(1, ...dias.map(x => x.valor))

  // Serviços mais feitos no mês
  const porServico = new Map<string, number>()
  for (const a of feitos) {
    if (new Date(a.inicio) < mes) continue
    const s = Array.isArray(a.servico) ? a.servico[0] : a.servico
    const nome = (s as { nome?: string } | null)?.nome ?? 'Serviço'
    porServico.set(nome, (porServico.get(nome) ?? 0) + 1)
  }
  const top = [...porServico.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const nomeMes = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })

  return (
    <div className="px-4 md:px-8 py-6 max-w-lg md:max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={sessao.papel === 'dono' ? '/painel/mais/relatorios' : '/painel/mais'} className="text-fg-muted hover:text-fg" aria-label="Voltar">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="ds-titulo">{sessao.papel === 'dono' ? prof.nome : 'Meu desempenho'}</h1>
          {sessao.papel === 'dono' && <p className="font-body text-xs text-fg-muted">Desempenho do barbeiro</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 md:gap-4 md:items-stretch">
      {/* Mês em andamento contra o mês passado inteiro */}
      <section className="ds-card p-5 flex items-center gap-5">
        <div className="relative w-[124px] h-[124px] shrink-0" role="img" aria-label={progresso === null ? 'Sem mês anterior pra comparar' : meta ? `${progresso}% da meta do mês` : `${progresso}% do valor de ${nomeMesPassado}`}>
          <svg viewBox="0 0 124 124" className="w-full h-full -rotate-90" aria-hidden>
            <circle cx="62" cy="62" r={RAIO} fill="none" stroke="rgb(var(--surface-2-rgb))" strokeWidth="10" />
            {progresso !== null && progresso > 0 && (
              <circle cx="62" cy="62" r={RAIO} fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(Math.min(progresso, 100) / 100) * VOLTA} ${VOLTA}`} />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-xl font-semibold text-fg leading-none">{progresso === null ? '—' : `${progresso}%`}</span>
            <span className="font-body text-[11px] text-fg-muted mt-1">{meta ? 'da meta' : `de ${nomeMesPassado}`}</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="ds-eyebrow">Em {nomeMes}</p>
          <p className="font-mono text-xl font-semibold text-fg whitespace-nowrap mt-1">{brl(periodos[2].valor)}</p>
          <p className="font-body text-xs text-fg-muted mt-0.5">{periodos[2].qtd} atendimento{periodos[2].qtd !== 1 ? 's' : ''}</p>
          {comissao && (
            <p className="font-body text-sm text-fg mt-2">Comissão: <strong className="font-display font-semibold text-amber tabular-nums">{brl(comissao.valor)}</strong> <span className="text-fg-muted">({String(comissao.pct).replace('.', ',')}%)</span></p>
          )}
          <p className="font-body text-xs text-fg-muted mt-2">
            {meta
              ? `Meta do mês: ${brl(meta)}.`
              : progresso === null
              ? 'Sem atendimento concluído no mês passado pra comparar.'
              : `${nomeMesPassado[0].toUpperCase()}${nomeMesPassado.slice(1)} inteiro fechou em ${brl(totalMesPassado)}.`}
          </p>
        </div>
      </section>

      {/* Hoje em destaque, semana e mês embaixo */}
      <section className="ds-card p-5">
        <p className="ds-eyebrow">Gerado hoje</p>
        <p className="font-mono text-5xl text-entrada leading-tight mt-1">{brl(periodos[0].valor)}</p>
        <p className="font-body text-sm text-fg-muted mt-1">
          {periodos[0].qtd} atendimento{periodos[0].qtd !== 1 ? 's' : ''} concluído{periodos[0].qtd !== 1 ? 's' : ''}
        </p>
      </section>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {periodos.slice(1).map(p => (
          <div key={p.rotulo} className="ds-card p-4">
            <p className="ds-eyebrow">{p.rotulo === 'Mês' ? `Em ${nomeMes}` : 'Nesta semana'}</p>
            <p className="font-mono text-2xl text-fg mt-1">{brl(p.valor)}</p>
            <p className="font-body text-xs text-fg-muted mt-0.5">{p.qtd} atendimento{p.qtd !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {/* Últimos 7 dias */}
      <section className="ds-card p-4">
        <p className="ds-eyebrow mb-4">Últimos 7 dias</p>
        <div className="flex items-end gap-2 h-32" role="img" aria-label="Valor gerado por dia nos últimos 7 dias">
          {dias.map((x, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="font-mono text-[10px] text-fg-muted">{x.qtd || ''}</span>
              <div
                className={`w-full rounded-t-[3px] ${i === 6 ? 'bg-amber' : 'bg-entrada/60'}`}
                style={{ height: `${Math.max(x.valor ? 4 : 1, (x.valor / maxDia) * 100)}%` }}
                title={`${x.rotulo}: ${brl(x.valor)}`}
              />
              <span className={`font-ui text-[10px] uppercase ${i === 6 ? 'text-amber' : 'text-fg-muted'}`}>{x.rotulo}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className="ds-card p-4">
          <p className="ds-eyebrow">Faltas no mês</p>
          <p className={`font-mono text-2xl mt-1 ${faltasMes ? 'text-saida' : 'text-fg'}`}>{faltasMes}</p>
          <p className="font-body text-xs text-fg-muted mt-0.5">cliente não apareceu</p>
        </div>
        <div className="ds-card p-4">
          <p className="ds-eyebrow">Ticket médio</p>
          <p className="font-mono text-2xl text-fg mt-1">{periodos[2].qtd ? brl(periodos[2].valor / periodos[2].qtd) : '—'}</p>
          <p className="font-body text-xs text-fg-muted mt-0.5">por atendimento no mês</p>
        </div>
      </div>

      {avaliacao && (
        <section className="ds-card p-4 flex items-center gap-4">
          <Star size={26} className="text-amber shrink-0" fill="currentColor" aria-hidden />
          <div>
            <p className="font-display text-xl font-semibold text-fg tabular-nums">{notaTexto(avaliacao.media)}</p>
            <p className="font-body text-xs text-fg-muted">avaliação média · {avaliacao.total} avaliaç{avaliacao.total === 1 ? 'ão' : 'ões'} de clientes</p>
          </div>
        </section>
      )}

      {top.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold font-ui text-sm text-fg-muted">Mais feitos em {nomeMes}</h2>
          <ul className="ds-card divide-y divide-line">
            {top.map(([nome, qtd]) => (
              <li key={nome} className="flex items-center justify-between px-4 py-3">
                <span className="font-body text-sm text-fg">{nome}</span>
                <span className="font-mono text-sm text-fg-muted">{qtd}×</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="font-body text-xs text-fg-muted text-center">
        Só conta atendimento marcado como <strong>concluído</strong>. Esqueceu de marcar? Resolve na tela Hoje.
      </p>
    </div>
  )
}
