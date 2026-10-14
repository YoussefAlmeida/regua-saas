import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Search, ChevronRight, AlertTriangle } from 'lucide-react'
import { criarClienteServico } from '@/lib/supabase/server'
import { adminLogado, PLANOS_ADMIN, STATUS_ADMIN, type PlanoPago } from '@/lib/admin'
import { formatBRL } from '@/lib/utils'
import SairAdmin from './sair'
import SaudeSistema from './saude'

const DIA = 86_400_000

function haQuanto(iso: string | null): string {
  if (!iso) return 'nunca'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / DIA)
  if (d <= 0) return 'hoje'
  if (d === 1) return 'ontem'
  return `há ${d} dias`
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string; s?: string }> }) {
  if (!(await adminLogado())) redirect('/admin/login')

  const { q = '', s = '' } = await searchParams
  const db = criarClienteServico()
  const trintaDias = new Date(Date.now() - 30 * DIA).toISOString()

  const [{ data: barbearias }, { data: usuarios }, { data: ags }] = await Promise.all([
    db.from('barbearias').select('id, nome, slug, plano, status, trial_fim, criado_em').order('criado_em', { ascending: false }),
    db.from('usuarios').select('barbearia_id, papel, ultimo_acesso').in('papel', ['dono', 'barbeiro']),
    db.from('agendamentos').select('barbearia_id').gte('inicio', trintaDias).neq('status', 'cancelado'),
  ])

  const lista = (barbearias ?? []).map(b => {
    const equipe = (usuarios ?? []).filter(u => u.barbearia_id === b.id)
    const ultimo = equipe.map(u => u.ultimo_acesso).filter(Boolean).sort().pop() ?? null
    return {
      ...b,
      ultimoAcesso: ultimo as string | null,
      agendamentos30: (ags ?? []).filter(a => a.barbearia_id === b.id).length,
    }
  })

  const conta = (st: string) => lista.filter(b => b.status === st).length
  const mrr = lista.filter(b => b.status === 'ativo').reduce((t, b) => t + (PLANOS_ADMIN[b.plano as PlanoPago]?.preco ?? 0), 0)
  const acabando = lista.filter(b => b.status === 'trial' && new Date(b.trial_fim).getTime() - Date.now() < 3 * DIA)
  const novas7 = lista.filter(b => Date.now() - new Date(b.criado_em).getTime() < 7 * DIA).length

  const termo = q.trim().toLowerCase()
  const filtradas = lista.filter(b =>
    (!s || b.status === s) && (!termo || b.nome.toLowerCase().includes(termo) || b.slug.includes(termo)))

  const chip = (ativo: boolean) => `shrink-0 px-3 py-1.5 rounded-full border font-ui text-[11px] uppercase tracking-wider ${ativo ? 'bg-amber text-accent-fg border-amber' : 'border-line text-fg-muted hover:text-fg'}`
  const filtroUrl = (st: string) => `/admin?${new URLSearchParams({ ...(q ? { q } : {}), ...(st ? { s: st } : {}) })}`

  return (
    <div className="min-h-screen bg-bg px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-amber tracking-widest uppercase">Régua Admin</h1>
            <p className="font-body text-xs text-fg-muted">{lista.length} barbearia{lista.length !== 1 ? 's' : ''} · {novas7} nova{novas7 !== 1 ? 's' : ''} nos últimos 7 dias</p>
          </div>
          <SairAdmin />
        </div>

        <SaudeSistema />

        {/* Números do negócio */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 bg-surface border border-amber/30 rounded-card p-4">
            <p className="font-ui text-xs uppercase tracking-wider text-fg-muted">Receita mensal (MRR)</p>
            <p className="font-mono text-4xl text-amber mt-1">{formatBRL(mrr)}</p>
            <p className="font-body text-xs text-fg-muted mt-1">{conta('ativo')} pagando</p>
          </div>
          {[
            { st: 'trial', n: conta('trial') },
            { st: 'leitura', n: conta('leitura') },
          ].map(c => (
            <Link key={c.st} href={filtroUrl(c.st)} className="bg-surface border border-line rounded-card p-4 hover:border-amber/40">
              <p className="font-ui text-xs uppercase tracking-wider text-fg-muted">{STATUS_ADMIN[c.st].rotulo}</p>
              <p className="font-mono text-3xl text-fg mt-1">{c.n}</p>
            </Link>
          ))}
        </section>

        {acabando.length > 0 && (
          <section className="bg-amber/5 border border-amber/40 rounded-card p-4">
            <p className="flex items-center gap-1.5 font-ui text-xs uppercase tracking-wider text-amber mb-2">
              <AlertTriangle size={13} /> Teste acabando (até 3 dias) — hora de ligar
            </p>
            <ul className="flex flex-wrap gap-2">
              {acabando.map(b => (
                <li key={b.id}>
                  <Link href={`/admin/${b.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-amber/40 font-body text-sm text-fg hover:bg-amber/10">
                    {b.nome} <ChevronRight size={13} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Busca e filtros */}
        <div className="space-y-3">
          <form action="/admin" className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nome ou link"
              className="w-full bg-surface border border-line rounded-button pl-9 pr-3 py-2.5 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber"
            />
            {s && <input type="hidden" name="s" value={s} />}
          </form>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Link href={filtroUrl('')} className={chip(!s)}>Todas ({lista.length})</Link>
            {Object.entries(STATUS_ADMIN).map(([st, info]) => (
              <Link key={st} href={filtroUrl(st)} className={chip(s === st)}>{info.rotulo} ({conta(st)})</Link>
            ))}
          </div>
        </div>

        {/* Lista */}
        {filtradas.length === 0 ? (
          <p className="font-body text-sm text-fg-muted text-center py-12">Nenhuma barbearia com esse filtro.</p>
        ) : (
          <ul className="bg-surface border border-line rounded-card divide-y divide-line">
            {filtradas.map(b => {
              const st = STATUS_ADMIN[b.status] ?? { rotulo: b.status, cor: 'text-fg-muted border-line' }
              const diasTeste = Math.ceil((new Date(b.trial_fim).getTime() - Date.now()) / DIA)
              const parada = !b.ultimoAcesso || Date.now() - new Date(b.ultimoAcesso).getTime() > 7 * DIA
              return (
                <li key={b.id}>
                  <Link href={`/admin/${b.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-alt transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-ui text-sm uppercase tracking-wider text-fg truncate">{b.nome}</p>
                        <span className={`px-2 py-0.5 rounded-full border font-ui text-[10px] uppercase tracking-wider ${st.cor}`}>
                          {b.status === 'ativo' ? PLANOS_ADMIN[b.plano as PlanoPago]?.nome ?? st.rotulo : st.rotulo}
                        </span>
                      </div>
                      <p className="font-body text-xs text-fg-muted mt-0.5">
                        /{b.slug}
                        {b.status === 'trial' && ` · ${diasTeste > 0 ? `${diasTeste} dia${diasTeste > 1 ? 's' : ''} de teste` : 'teste acabou'}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm text-fg">{b.agendamentos30}</p>
                      <p className="font-body text-[10px] text-fg-muted">agend. 30d</p>
                    </div>
                    <div className="text-right shrink-0 w-20 hidden sm:block">
                      <p className={`font-body text-xs ${parada ? 'text-saida' : 'text-fg'}`}>{haQuanto(b.ultimoAcesso)}</p>
                      <p className="font-body text-[10px] text-fg-muted">último acesso</p>
                    </div>
                    <ChevronRight size={16} className="text-fg-muted shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
