import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, CheckCircle2, MessageCircle, Users, AlertTriangle, ArrowDown, CalendarClock } from 'lucide-react'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { formatBRL } from '@/lib/utils'
import { LISTA_PLANOS, PLANOS, planoParaProfissionais, type PlanoPagoId } from '@/lib/planos'
import CancelarMudanca from '@/components/cancelar-mudanca'
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
    criarClienteServico().from('barbearias')
      .select('nome, status, plano_ciclo_fim, plano_agendado, plano_agendado_em')
      .eq('id', sessao.barbearia_id).single(),
  ])
  const ideal = planoParaProfissionais(Math.max(1, nProfs))
  const acimaDoLimite = plano.maxProfissionais !== null && nProfs > plano.maxProfissionais
  const nome = barbearia?.nome ?? 'minha barbearia'
  const pago = barbearia?.status === 'ativo' && !plano.somenteLeitura && !plano.emTeste
  const ordemAtual = LISTA_PLANOS.findIndex(p => p.id === plano.plano)
  const data = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
  const agendado = barbearia?.plano_agendado ? PLANOS[barbearia.plano_agendado as PlanoPagoId] : null

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/painel/mais" className="text-fg-muted hover:text-fg" aria-label="Voltar"><ChevronLeft size={20} /></Link>
        <h1 className="font-display text-[28px] font-semibold leading-tight text-fg">Plano</h1>
      </div>

      {/* Situação agora */}
      <section className={`rounded-card border p-5 space-y-3 ${plano.somenteLeitura ? 'border-saida/40 bg-saida/5' : 'border-line bg-surface'}`}>
        <p className="font-ui text-xs uppercase tracking-wider text-fg-muted">Seu plano</p>
        {plano.emTeste ? (
          <>
            <p className="font-display text-3xl text-amber">Teste grátis</p>
            <p className="font-body text-sm text-fg">
              {plano.diasTeste <= 1 ? 'Acaba hoje.' : `Faltam ${plano.diasTeste} dias.`} Tudo liberado até lá.
            </p>
          </>
        ) : plano.somenteLeitura ? (
          <>
            <p className="font-display text-3xl text-saida">{plano.nome}</p>
            <p className="font-body text-sm text-fg">
              Seus dados estão guardados e dá pra ver tudo, mas agendar, lançar no caixa e a página de agendamento ficam parados até {plano.nome === 'Pagamento atrasado' ? 'o pagamento ser confirmado' : 'escolher um plano'}.
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-3xl text-entrada">{plano.nome}</p>
            <p className="font-body text-sm text-fg-muted">
              {formatBRL(LISTA_PLANOS.find(p => p.id === plano.plano)?.preco ?? 0)} por mês
              {barbearia?.plano_ciclo_fim && ` · pago até ${data(barbearia.plano_ciclo_fim)}`}
            </p>
          </>
        )}

        {agendado && (
          <div className="rounded-button bg-amber/10 border border-amber/30 px-3 py-3 space-y-2.5">
            <div className="flex items-start gap-2">
              <CalendarClock size={14} className="text-amber shrink-0 mt-0.5" />
              <p className="flex-1 font-body text-xs text-fg">
                Você pediu o <strong>{agendado.nome}</strong>. A troca acontece quando o pagamento de {formatBRL(agendado.preco)} for confirmado.
                Até lá, tudo continua como está.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a href={wa(`Oi! Quero pagar o plano ${agendado.nome} (${formatBRL(agendado.preco)}/mês) pra ${nome}.`)} target="_blank" rel="noopener noreferrer"
                className="font-semibold flex-1 flex items-center justify-center gap-2 bg-amber text-accent-fg font-ui text-[11px] py-2.5 rounded-button">
                <MessageCircle size={13} /> Pagar o {agendado.nome}
              </a>
              <CancelarMudanca className="text-amber hover:underline shrink-0" />
            </div>
          </div>
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
        <h2 className="font-semibold font-ui text-sm text-fg-muted">Planos</h2>
        {LISTA_PLANOS.map(p => {
          const atual = !plano.emTeste && !plano.somenteLeitura && plano.plano === p.id
          const recomendado = !atual && p.id === ideal
          const naoCabe = p.maxProfissionais !== null && nProfs > p.maxProfissionais
          return (
            <article key={p.id} className={`rounded-card border p-5 space-y-4 ${atual ? 'border-entrada/50 bg-entrada/5' : recomendado ? 'border-amber/60 bg-surface' : 'border-line bg-surface'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold font-ui text-lg text-fg">{p.nome}</p>
                    {atual && <span className="font-semibold px-2 py-0.5 rounded-full border border-entrada/40 text-entrada font-ui text-[10px]">Seu plano</span>}
                    {recomendado && <span className="font-semibold px-2 py-0.5 rounded-full bg-amber text-accent-fg font-ui text-[10px]">Ideal pra você</span>}
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
              {pago && LISTA_PLANOS.indexOf(p) < ordemAtual ? (
                agendado?.id === p.id ? (
                  <p className="font-body text-xs text-amber text-center">Pedido feito · a troca acontece no pagamento</p>
                ) : (
                  <Link
                    href={`/painel/mais/plano/mudar?para=${p.id}`}
                    className="font-semibold w-full flex items-center justify-center gap-2 font-ui text-sm py-3 rounded-button border border-line text-fg hover:border-amber/50 transition-colors"
                  >
                    <ArrowDown size={14} /> Mudar pro {p.nome}
                  </Link>
                )
              ) : naoCabe ? (
                <p className="font-body text-xs text-fg-muted">Não comporta os {nProfs} profissionais que você tem hoje.</p>
              ) : !atual && (
                <a
                  href={wa(`Oi! Quero o plano ${p.nome} (${formatBRL(p.preco)}/mês) pra ${nome}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-semibold w-full flex items-center justify-center gap-2 font-ui text-sm py-3 rounded-button transition-colors ${
                    recomendado ? 'bg-amber hover:bg-accent-press text-accent-fg' : 'border border-line text-fg hover:border-amber/50'}`}
                >
                  <MessageCircle size={14} /> Quero o {p.nome}
                </a>
              )}
              {pago && LISTA_PLANOS.indexOf(p) > ordemAtual && (
                <p className="font-body text-[11px] text-fg-muted text-center">Paga o valor cheio do {p.nome}; vale na hora e o mês novo começa no dia do pagamento.</p>
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
          <li>O plano só muda quando o pagamento é confirmado.</li>
          <li>Subir: paga o valor cheio do plano novo, mesmo que o mês atual ainda não tenha vencido. Vale na hora e o mês novo começa no dia do pagamento.</li>
          <li>Descer: você faz o pedido e escolhe quem fica na agenda. Quando pagar o plano menor, a troca acontece. Quem sai atende os horários já marcados, só não recebe horário novo.</li>
        </ul>
      </section>
    </div>
  )
}
