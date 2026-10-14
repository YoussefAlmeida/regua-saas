import Link from 'next/link'
import type { SituacaoPlano } from '@/lib/planos'
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
            {plano.cancelada ? 'Conta cancelada.' : 'Seu teste grátis acabou.'} Dá pra ver tudo, mas não agendar nem lançar.
            {!souDono && ' Avisa o dono da barbearia.'}
          </p>
          {souDono && (
            <Link href="/painel/mais/plano" className="shrink-0 bg-amber text-accent-fg font-ui text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-button">
              Escolher plano
            </Link>
          )}
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
