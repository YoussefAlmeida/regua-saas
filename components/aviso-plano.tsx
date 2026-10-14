import Link from 'next/link'
import { CARENCIA_DIAS, type SituacaoPlano } from '@/lib/planos'
import CancelarMudanca from '@/components/cancelar-mudanca'

/* Faixa no topo do painel: equipe acima do plano, pedido de mudança,
   teste acabando ou conta só leitura */
export default function AvisoPlano({ plano, souDono, excedente = 0, agendado = null }: {
  plano: SituacaoPlano
  souDono: boolean
  excedente?: number
  agendado?: { nome: string; em: string } | null
}) {
  if (excedente > 0 && souDono && !plano.somenteLeitura) {
    return (
      <div className="bg-saida/10 border-b border-saida/30 px-4 py-2.5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <p className="flex-1 font-body text-xs text-fg">
            Seu plano {plano.nome} vai até {plano.maxProfissionais} na agenda e tem {excedente} a mais. Escolha quem fica.
          </p>
          <Link href="/painel/mais/ajustar-equipe" className="shrink-0 bg-amber text-accent-fg font-ui text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-button">
            Ajustar
          </Link>
        </div>
      </div>
    )
  }
  if (agendado && souDono && !plano.somenteLeitura) {
    return (
      <div className="bg-amber/10 border-b border-amber/30 px-4 py-2.5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <p className="flex-1 font-body text-xs text-fg">
            Você pediu o <Link href="/painel/mais/plano" className="underline">{agendado.nome}</Link>. A troca acontece quando o pagamento for confirmado.
          </p>
          <CancelarMudanca className="shrink-0 border border-amber/50 text-amber px-3 py-1.5 rounded-button" />
        </div>
      </div>
    )
  }
  if (plano.somenteLeitura) {
    return (
      <div className="bg-saida/10 border-b border-saida/30 px-4 py-2.5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <p className="flex-1 font-body text-xs text-fg">
            {plano.cancelada ? 'Conta cancelada.' : plano.nome === 'Pagamento atrasado' ? 'O pagamento do plano está atrasado.' : 'Seu teste grátis acabou.'} Dá pra ver tudo, mas não agendar nem lançar.
            {!souDono && ' Avisa o dono da barbearia.'}
          </p>
          {souDono && (
            <Link href="/painel/mais/plano" className="shrink-0 bg-amber text-accent-fg font-ui text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-button">
              {plano.nome === 'Pagamento atrasado' ? 'Pagar' : 'Escolher plano'}
            </Link>
          )}
        </div>
      </div>
    )
  }
  // Plano pago vencendo ou vencido (na carência)
  if (souDono && plano.diasParaVencer !== null && plano.diasParaVencer <= 3) {
    const d = plano.diasParaVencer
    const limite = plano.pagoAte
      ? new Date(new Date(plano.pagoAte).getTime() + CARENCIA_DIAS * 86_400_000).toLocaleDateString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: '2-digit' })
      : ''
    return (
      <div className={`${plano.emCarencia ? 'bg-saida/10 border-saida/30' : 'bg-amber/10 border-amber/30'} border-b px-4 py-2.5`}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <p className="flex-1 font-body text-xs text-fg">
            {plano.emCarencia
              ? `O pagamento do plano venceu. Pague até ${limite} pra agenda não parar.`
              : d <= 0 ? 'Seu plano vence hoje.' : `Seu plano vence em ${d} dia${d > 1 ? 's' : ''}.`}
          </p>
          <Link href="/painel/mais/plano" className="shrink-0 bg-amber text-accent-fg font-ui text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-button">
            Pagar
          </Link>
        </div>
      </div>
    )
  }
  if (plano.emTeste && plano.diasTeste <= 3 && souDono) {
    return (
      <div className="bg-amber/10 border-b border-amber/30 px-4 py-2.5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <p className="flex-1 font-body text-xs text-fg">
            {plano.diasTeste <= 1 ? 'Seu teste grátis acaba hoje.' : `Faltam ${plano.diasTeste} dias de teste grátis.`} Escolha um plano pra não parar.
          </p>
          <Link href="/painel/mais/plano" className="shrink-0 border border-amber/50 text-amber font-ui text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-button">
            Ver planos
          </Link>
        </div>
      </div>
    )
  }
  return null
}
