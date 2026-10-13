import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { criarClienteServico } from '@/lib/supabase/server'
import { formatBRL } from '@/lib/utils'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get('regua-admin')?.value

  if (adminToken !== process.env.ADMIN_TOKEN) {
    redirect(`/admin/login`)
  }

  const db = criarClienteServico()

  const { data: barbearias } = await db
    .from('barbearias')
    .select(`
      id, nome, slug, plano, status, trial_fim, criado_em,
      usuarios:usuarios(count)
    `)
    .order('criado_em', { ascending: false })

  const total    = barbearias?.length ?? 0
  const ativas   = barbearias?.filter(b => b.status === 'ativo').length ?? 0
  const trial    = barbearias?.filter(b => b.status === 'trial').length ?? 0
  const leitura  = barbearias?.filter(b => b.status === 'leitura').length ?? 0

  const STATUS_COR: Record<string, string> = {
    trial:    'text-amber',
    ativo:    'text-entrada',
    leitura:  'text-info',
    cancelado:'text-saida',
  }

  const PLANO_PRECO: Record<string, number> = {
    cadeira:   39.99,
    barbearia: 79.99,
    rede:      129.99,
    trial:     0,
  }

  const mrr = barbearias
    ?.filter(b => b.status === 'ativo')
    .reduce((s, b) => s + (PLANO_PRECO[b.plano] ?? 0), 0) ?? 0

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-4xl text-amber tracking-widest">RÉGUA Admin</h1>
          <form action={async () => {
            'use server'
            const { cookies: c } = await import('next/headers')
            ;(await c()).delete('regua-admin')
            const { redirect: r } = await import('next/navigation')
            r('/admin/login')
          }}>
            <button type="submit" className="font-ui text-xs uppercase tracking-wider text-fg-muted hover:text-fg">
              Sair
            </button>
          </form>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: total, cor: 'text-fg' },
            { label: 'Ativas', value: ativas, cor: 'text-entrada' },
            { label: 'Trial', value: trial, cor: 'text-amber' },
            { label: 'Leitura', value: leitura, cor: 'text-info' },
          ].map(m => (
            <div key={m.label} className="bg-surface border border-line rounded-card p-4 text-center">
              <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-1">{m.label}</p>
              <p className={`font-mono text-2xl ${m.cor}`}>{m.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-surface border border-amber/30 rounded-card p-4 flex items-center justify-between">
          <span className="font-ui text-sm uppercase tracking-wider text-fg-muted">MRR</span>
          <span className="font-mono text-2xl text-amber">{formatBRL(mrr)}</span>
        </div>

        {/* Tabela de barbearias */}
        <div className="bg-surface border border-line rounded-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                {['Barbearia', 'Plano', 'Status', 'Trial fim', 'Desde'].map(h => (
                  <th key={h} className="font-ui text-xs uppercase tracking-wider text-fg-muted px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(barbearias ?? []).map((b, i) => (
                <tr key={b.id} className={`border-b border-line last:border-0 ${i % 2 === 0 ? '' : 'bg-surface-alt/30'}`}>
                  <td className="px-4 py-3">
                    <p className="font-ui text-sm text-fg">{b.nome}</p>
                    <p className="font-body text-xs text-fg-muted">/{b.slug}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-fg-muted uppercase">{b.plano}</td>
                  <td className={`px-4 py-3 font-ui text-xs uppercase tracking-wider ${STATUS_COR[b.status] ?? 'text-fg-muted'}`}>
                    {b.status}
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-fg-muted">
                    {new Date(b.trial_fim).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-fg-muted">
                    {new Date(b.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!barbearias?.length && (
            <p className="font-body text-sm text-fg-muted text-center py-8">Nenhuma barbearia ainda.</p>
          )}
        </div>
      </div>
    </div>
  )
}
