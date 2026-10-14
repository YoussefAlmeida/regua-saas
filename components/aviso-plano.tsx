import Link from 'next/link'
import type { SituacaoPlano } from '@/lib/planos'

/* Faixa no topo do painel: teste acabando ou conta só leitura */
export default function AvisoPlano({ plano, souDono }: { plano: SituacaoPlano; souDono: boolean }) {
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
