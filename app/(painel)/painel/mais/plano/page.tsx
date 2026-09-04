import { headers, cookies } from 'next/headers'
import { criarClienteAutenticado } from '@/lib/supabase/server'
import { COOKIE_SESSION } from '@/lib/auth'
import { CheckCircle2, Circle } from 'lucide-react'

const PLANOS = [
  {
    id: 'cadeira',
    label: 'Cadeira',
    preco: 39.99,
    descricao: 'Ideal para profissional solo',
    funcionalidades: [
      'Agenda online',
      'Link de agendamento público',
      'WhatsApp automático',
      'Relatórios básicos',
      '1 profissional',
    ],
  },
  {
    id: 'barbearia',
    label: 'Barbearia',
    preco: 79.99,
    descricao: 'Para barbearias com equipe',
    funcionalidades: [
      'Tudo do Cadeira',
      'Até 5 profissionais',
      'Financeiro completo',
      'Despesas fixas',
      'Relatórios avançados',
    ],
  },
  {
    id: 'rede',
    label: 'Rede',
    preco: 129.99,
    descricao: 'Para redes e franquias',
    funcionalidades: [
      'Tudo do Barbearia',
      'Profissionais ilimitados',
      'Multi-unidades (em breve)',
      'Suporte prioritário',
    ],
  },
]

const STATUS_LABEL: Record<string, string> = {
  trial: 'Trial',
  ativo: 'Ativo',
  leitura: 'Vencido',
  cancelado: 'Cancelado',
}

const STATUS_COR: Record<string, string> = {
  trial: 'text-amber',
  ativo: 'text-entrada',
  leitura: 'text-info',
  cancelado: 'text-saida',
}

export default async function PlanoPage() {
  const h = await headers()
  const barbearia_id = h.get('x-barbearia-id')!
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_SESSION)!.value
  const db = criarClienteAutenticado(token)

  const { data: barbearia } = await db
    .from('barbearias')
    .select('plano, status, trial_fim')
    .eq('id', barbearia_id)
    .single()

  const diasRestantesTrial = barbearia?.trial_fim
    ? Math.max(0, Math.ceil((new Date(barbearia.trial_fim).getTime() - Date.now()) / 86400000))
    : 0

  const planoAtual = barbearia?.plano ?? 'trial'
  const status = barbearia?.status ?? 'trial'

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <h1 className="font-ui text-xl uppercase tracking-widest text-fg">Plano</h1>

      {/* Status atual */}
      <div className="bg-surface border border-line rounded-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-ui text-xs uppercase tracking-wider text-fg-muted">Status</span>
          <span className={`font-ui text-sm uppercase tracking-wider ${STATUS_COR[status] ?? 'text-fg-muted'}`}>
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>
        {status !== 'trial' && (
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs uppercase tracking-wider text-fg-muted">Plano atual</span>
            <span className="font-ui text-sm uppercase tracking-wider text-fg capitalize">{planoAtual}</span>
          </div>
        )}
        {status === 'trial' && (
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs uppercase tracking-wider text-fg-muted">Trial restante</span>
            <span className={`font-ui text-sm ${diasRestantesTrial <= 2 ? 'text-saida' : 'text-amber'}`}>
              {diasRestantesTrial} {diasRestantesTrial === 1 ? 'dia' : 'dias'}
            </span>
          </div>
        )}
        {status === 'leitura' && (
          <p className="font-body text-xs text-saida">
            Pagamento vencido. Regularize para retomar o acesso completo.
          </p>
        )}
        {status === 'cancelado' && (
          <p className="font-body text-xs text-saida">
            Assinatura cancelada. Escolha um plano para reativar.
          </p>
        )}
      </div>

      {/* Comparativo de planos */}
      <h2 className="font-ui text-sm uppercase tracking-wider text-fg-muted">Planos disponíveis</h2>

      <div className="space-y-3">
        {PLANOS.map(plano => {
          const ativo = planoAtual === plano.id && status === 'ativo'
          return (
            <div
              key={plano.id}
              className={`bg-surface border rounded-card p-4 space-y-3 ${ativo ? 'border-amber/60' : 'border-line'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-ui text-base uppercase tracking-wider text-fg">{plano.label}</span>
                    {ativo && (
                      <span className="font-ui text-xs uppercase tracking-wider text-amber border border-amber/40 rounded-full px-2 py-0.5">
                        Atual
                      </span>
                    )}
                  </div>
                  <p className="font-body text-xs text-fg-muted mt-0.5">{plano.descricao}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-xl text-amber">R$ {plano.preco.toFixed(2)}</p>
                  <p className="font-body text-xs text-fg-muted">/mês</p>
                </div>
              </div>

              <ul className="space-y-1.5">
                {plano.funcionalidades.map(f => (
                  <li key={f} className="flex items-center gap-2">
                    {ativo ? (
                      <CheckCircle2 size={14} className="text-entrada shrink-0" />
                    ) : (
                      <Circle size={14} className="text-fg-muted shrink-0" />
                    )}
                    <span className="font-body text-xs text-fg-muted">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="bg-surface border border-amber/20 rounded-card p-4">
        <p className="font-body text-xs text-fg-muted text-center">
          Para assinar ou alterar seu plano, entre em contato via WhatsApp.
        </p>
        <a
          href="https://wa.me/5575982727760?text=Olá! Quero assinar o RÉGUA."
          target="_blank"
          rel="noreferrer"
          className="mt-3 block w-full bg-amber text-bg font-ui text-sm uppercase tracking-wider rounded-button py-2 text-center hover:opacity-90 transition-opacity"
        >
          Falar no WhatsApp
        </a>
      </div>
    </div>
  )
}
