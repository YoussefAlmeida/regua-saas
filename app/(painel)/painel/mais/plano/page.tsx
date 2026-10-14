import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, CheckCircle2, MessageCircle, Users, AlertTriangle } from 'lucide-react'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { formatBRL } from '@/lib/utils'
import { LISTA_PLANOS, planoParaProfissionais } from '@/lib/planos'
import { planoDaBarbearia, contarProfissionais } from '@/lib/plano-servidor'

const SUPORTE = process.env.SUPORTE_WHATSAPP ?? '75982727760'
const wa = (texto: string) => `https://wa.me/55${SUPORTE.replace(/\D/g, '').replace(/^55/, '')}?text=${encodeURIComponent(texto)}`

export default async function PlanoPage() {
  const sessao = await getSessao()
  if (!sessao) redirect('/entrar')
  if (sessao.papel !== 'dono') redirect('/painel/mais')

  const [plano, nProfs, { data: barbearia }] = await Promise.all([
    planoDaBarbearia(sessao.barbearia_id),
    contarProfissionais(sessao.barbearia_id),
    criarClienteServico().from('barbearias').select('nome').eq('id', sessao.barbearia_id).single(),
  ])
  const ideal = planoParaProfissionais(Math.max(1, nProfs))
  const acimaDoLimite = plano.maxProfissionais !== null && nProfs > plano.maxProfissionais
  const nome = barbearia?.nome ?? 'minha barbearia'

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/painel/mais" className="text-fg-muted hover:text-fg" aria-label="Voltar"><ChevronLeft size={20} /></Link>
        <h1 className="font-ui text-xl uppercase tracking-widest text-fg">Plano</h1>
      </div>

      {/* Situação agora */}
      <section className={`rounded-card border p-5 space-y-3 ${plano.somenteLeitura ? 'border-saida/40 bg-saida/5' : 'border-line bg-surface'}`}>
        <p className="font-ui text-xs uppercase tracking-wider text-fg-muted">Seu plano</p>
        {plano.emTeste ? (
          <>
            <p className="font-display text-3xl uppercase text-amber">Teste grátis</p>
            <p className="font-body text-sm text-fg">
              {plano.diasTeste <= 1 ? 'Acaba hoje.' : `Faltam ${plano.diasTeste} dias.`} Tudo liberado até lá.
            </p>
          </>
        ) : plano.somenteLeitura ? (
          <>
            <p className="font-display text-3xl uppercase text-saida">{plano.cancelada ? 'Cancelada' : 'Teste acabou'}</p>
            <p className="font-body text-sm text-fg">
              Seus dados estão guardados e dá pra ver tudo, mas agendar, lançar no caixa e a página de agendamento ficam pausados até escolher um plano.
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-3xl uppercase text-entrada">{plano.nome}</p>
            <p className="font-body text-sm text-fg-muted">{formatBRL(LISTA_PLANOS.find(p => p.id === plano.plano)?.preco ?? 0)} por mês</p>
          </>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-line">
          <Users size={14} className="text-fg-muted" />
          <p className="font-body text-sm text-fg">
            {nProfs} profissional{nProfs === 1 ? '' : 'is'} na agenda
            {plano.maxProfissionais !== null && !plano.emTeste && <span className="text-fg-muted"> · seu plano vai até {plano.maxProfissionais}</span>}
          </p>
        </div>
        {acimaDoLimite && (
          <p className="flex gap-2 font-body text-xs text-amber">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>
              Você tem mais gente na agenda do que o plano permite.{' '}
              <Link href="/painel/mais/ajustar-equipe" className="underline">Escolher quem fica</Link> ou mude de plano aqui embaixo.
            </span>
          </p>
        )}
      </section>

      <p className="font-body text-xs text-fg-muted -mt-2">
        Conta como profissional quem aparece na agenda. Se você é dono e também corta, você conta; se só administra, não.
      </p>

      {/* Planos */}
      <section className="space-y-3">
        <h2 className="font-ui text-sm uppercase tracking-wider text-fg-muted">Planos</h2>
        {LISTA_PLANOS.map(p => {
          const atual = !plano.emTeste && !plano.somenteLeitura && plano.plano === p.id
          const recomendado = !atual && p.id === ideal
          const naoCabe = p.maxProfissionais !== null && nProfs > p.maxProfissionais
          return (
            <article key={p.id} className={`rounded-card border p-5 space-y-4 ${atual ? 'border-entrada/50 bg-entrada/5' : recomendado ? 'border-amber/60 bg-surface' : 'border-line bg-surface'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-ui text-lg uppercase tracking-wider text-fg">{p.nome}</p>
                    {atual && <span className="px-2 py-0.5 rounded-full border border-entrada/40 text-entrada font-ui text-[10px] uppercase tracking-wider">Seu plano</span>}
                    {recomendado && <span className="px-2 py-0.5 rounded-full bg-amber text-accent-fg font-ui text-[10px] uppercase tracking-wider">Ideal pra você</span>}
                  </div>
                  <p className="font-body text-xs text-fg-muted">{p.resumo}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-2xl text-amber whitespace-nowrap">{formatBRL(p.preco)}</p>
                  <p className="font-body text-[11px] text-fg-muted">por mês</p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {p.itens.map(item => (
                  <li key={item} className="flex gap-2 font-body text-sm text-fg">
                    <CheckCircle2 size={14} className="text-entrada shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
              {naoCabe ? (
                <p className="font-body text-xs text-fg-muted">Não comporta os {nProfs} profissionais que você tem hoje.</p>
              ) : !atual && (
                <a
                  href={wa(`Oi! Quero o plano ${p.nome} (${formatBRL(p.preco)}/mês) pra ${nome}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full flex items-center justify-center gap-2 font-ui text-xs uppercase tracking-wider py-3 rounded-button transition-colors ${
                    recomendado ? 'bg-amber hover:bg-accent-press text-accent-fg' : 'border border-line text-fg hover:border-amber/50'}`}
                >
                  <MessageCircle size={14} /> Quero o {p.nome}
                </a>
              )}
            </article>
          )
        })}
      </section>

      <section className="bg-surface border border-line rounded-card p-4 space-y-2">
        <p className="font-ui text-xs uppercase tracking-wider text-fg-muted">Como funciona</p>
        <ul className="space-y-1.5 font-body text-sm text-fg-muted list-disc pl-4">
          <li>Os 14 dias de teste têm tudo liberado, sem limite.</li>
          <li>Se o teste acabar sem plano, a conta fica só leitura na hora: nada se perde, mas pausa agenda e caixa.</li>
          <li>Pagou, voltou tudo no mesmo instante, com todos os seus dados.</li>
          <li>Dá pra mudar de plano quando quiser.</li>
        </ul>
      </section>
    </div>
  )
}
