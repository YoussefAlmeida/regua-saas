import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import FaqLanding from './_components/faq-landing'
import { Marca, Regua } from '@/components/marca'
import { CelularAgendamento, CartaoCaixa, PassosCliente } from './_components/landing/mockups'
import { linkSuporte } from '@/lib/empresa'
import { formatBRL } from '@/lib/utils'
import { LISTA_PLANOS } from '@/lib/planos'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'RÉGUA — Agenda e caixa da barbearia, sem app pra baixar' },
  description: 'Seu cliente marca pelo link, recebe lembrete no WhatsApp e você vê o caixa do dia no celular. Planos a partir de R$ 39,99. 14 dias grátis, sem cartão.',
  alternates: { canonical: '/' },
  openGraph: { title: 'RÉGUA — Sua barbearia na régua', url: '/' },
}

// Dados estruturados: o Google entende que é um app com preço
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'RÉGUA',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'Agendamento online, lembrete no WhatsApp e fluxo de caixa para barbearias.',
  offers: LISTA_PLANOS.map(p => ({ '@type': 'Offer', name: p.nome, price: p.preco.toFixed(2), priceCurrency: 'BRL' })),
}

// Planos vêm de lib/planos.ts (mesma tabela do painel e do admin)
const PLANOS = LISTA_PLANOS.map(p => ({
  id: p.id, label: p.nome, desc: p.resumo, preco: p.preco, destaque: !!p.destaque, funcionalidades: p.itens,
}))

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  // Veio pelo "Agendamento por RÉGUA" de uma barbearia: a indicação vai junto pro cadastro
  const { ref } = await searchParams
  const cadastro = ref && /^[a-z0-9-]{1,60}$/.test(ref) ? `/cadastro-barbearia?ref=${ref}` : '/cadastro-barbearia'

  return (
    <div className="min-h-screen bg-bg text-fg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, '\\u003c') }} />

      {/* ── Topo ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-bg/85 backdrop-blur-md border-b border-line/70">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" aria-label="RÉGUA, início"><Marca className="text-fg" /></Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-fg-muted">
            <a href="#como-funciona" className="hover:text-fg">Como funciona</a>
            <a href="#dono" className="hover:text-fg">Para o dono</a>
            <a href="#planos" className="hover:text-fg">Planos</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/entrar" className="px-3 py-2 text-sm font-semibold text-fg hover:text-amber">Entrar</Link>
            <Link href={cadastro} className="px-4 py-2.5 rounded-button bg-fg text-bg text-sm font-semibold hover:bg-fg/85 transition-colors">
              Testar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Abertura ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 pt-14 md:pt-20 pb-20 grid md:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
        <div>
          <div className="flex items-center gap-3 text-fg-muted">
            <Regua marcas={10} className="text-amber" />
            <p className="text-sm">Agenda e caixa para barbearias</p>
          </div>
          <h1 className="font-display text-[44px] leading-[1.02] sm:text-6xl lg:text-[76px] font-medium text-fg mt-6">
            A cadeira cheia e o caixa <em className="text-amber font-normal">em ordem.</em>
          </h1>
          <p className="mt-6 text-lg text-fg-muted max-w-xl leading-relaxed">
            Seu cliente marca o horário pelo link, recebe lembrete no WhatsApp e aparece. Você atende, e o dinheiro do dia
            já está no caixa, separado por barbeiro.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <Link href={cadastro} className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-button bg-amber text-amber-fg font-semibold hover:bg-amber-press transition-colors">
              Testar 14 dias grátis <ArrowRight size={18} />
            </Link>
            <a href="#como-funciona" className="inline-flex items-center justify-center px-6 py-4 rounded-button border border-fg/20 text-fg font-semibold hover:border-fg/50 transition-colors">
              Ver como o cliente marca
            </a>
          </div>
          <p className="mt-5 text-sm text-fg-muted">Sem cartão de crédito. Sem fidelidade. Pronto pra usar em 10 minutos.</p>
        </div>
        <div className="pb-6 md:pb-0">
          <CelularAgendamento />
        </div>
      </section>

      {/* ── O dia a dia ─────────────────────────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <h2 className="font-display text-[32px] sm:text-[44px] leading-tight font-medium max-w-2xl">
            Feito pra quem passa o dia em pé, atrás da cadeira.
          </h2>
          <div className="mt-14 grid md:grid-cols-3 gap-10 md:gap-12">
            {[
              ['01', 'O cliente marca sozinho', 'Chega de responder "tem horário hoje?" entre um corte e outro. O link mostra só o que está livre e já reserva.'],
              ['02', 'Ninguém esquece', 'Duas horas antes, o cliente recebe o lembrete no WhatsApp. Menos cadeira vazia, menos cliente esperando à toa.'],
              ['03', 'O caixa fecha certo', 'Concluiu o atendimento, a entrada já cai no caixa com o nome do barbeiro. No fim do mês, os números estão lá.'],
            ].map(([n, t, d]) => (
              <div key={n} className="border-t border-fg/80 pt-5">
                <p className="font-display text-amber text-[20px]">{n}</p>
                <h3 className="mt-2 text-[21px] font-semibold text-fg">{t}</h3>
                <p className="mt-3 text-fg-muted leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como o cliente marca ────────────────────────────── */}
      <section id="como-funciona" className="max-w-6xl mx-auto px-5 py-24 scroll-mt-16">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-amber">Para o seu cliente</p>
          <h2 className="font-display text-[32px] sm:text-[44px] leading-tight font-medium mt-3">Quatro toques e o horário está marcado.</h2>
          <p className="mt-5 text-lg text-fg-muted leading-relaxed">
            Sem baixar aplicativo. Você coloca o link na bio do Instagram e no status do WhatsApp, e a agenda começa a se preencher.
          </p>
        </div>
        <div className="mt-12"><PassosCliente /></div>
      </section>

      {/* ── Para o dono ─────────────────────────────────────── */}
      <section id="dono" className="bg-fg text-bg scroll-mt-16">
        <div className="max-w-6xl mx-auto px-5 py-24 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-sm font-semibold text-[#E2A27A]">Para o dono</p>
            <h2 className="font-display text-[32px] sm:text-[44px] leading-tight font-medium mt-3">
              Você sabe quanto entrou hoje. E quanto cada barbeiro fez no mês.
            </h2>
            <ul className="mt-8 space-y-4">
              {[
                'Caixa do dia, entradas e saídas, sem planilha',
                'Despesas fixas, como aluguel e luz, lançadas sozinhas',
                'Atendimentos e faturamento por barbeiro',
                'Histórico de quem lançou, apagou ou mudou valor',
                'Equipe com acesso próprio: cada barbeiro vê a agenda dele',
              ].map(t => (
                <li key={t} className="flex gap-3 text-bg/85">
                  <Check size={18} className="text-[#E2A27A] shrink-0 mt-0.5" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center md:justify-end">
            <CartaoCaixa />
          </div>
        </div>
      </section>

      {/* ── Planos ──────────────────────────────────────────── */}
      <section id="planos" className="max-w-6xl mx-auto px-5 py-24 scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-[32px] sm:text-[44px] leading-tight font-medium">Um preço justo pra cada tamanho de barbearia.</h2>
          <p className="mt-4 text-lg text-fg-muted">14 dias grátis em qualquer plano. Depois, por mês, sem fidelidade.</p>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-5 items-stretch">
          {PLANOS.map(p => (
            <article key={p.id} className={`relative flex flex-col rounded-2xl p-7 ${
              p.destaque ? 'bg-surface border-2 border-amber shadow-[0_24px_50px_-28px_rgb(154_74_26/0.55)]' : 'bg-surface border border-line'}`}>
              {p.destaque && (
                <span className="absolute -top-3 left-7 px-3 py-1 rounded-full bg-amber text-amber-fg text-xs font-semibold">Para equipes</span>
              )}
              <h3 className="font-display text-[28px] font-semibold">{p.label}</h3>
              <p className="mt-1 text-sm text-fg-muted">{p.desc}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-[44px] leading-none font-semibold tabular-nums">{formatBRL(p.preco)}</span>
                <span className="text-sm text-fg-muted">/mês</span>
              </p>
              <ul className="mt-6 space-y-2.5 flex-1">
                {p.funcionalidades.map(f => (
                  <li key={f} className="flex gap-2.5 text-sm text-fg">
                    <Check size={16} className="text-amber shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Link href={cadastro} className={`mt-8 inline-flex justify-center px-5 py-3.5 rounded-button font-semibold transition-colors ${
                p.destaque ? 'bg-amber text-amber-fg hover:bg-amber-press' : 'border border-fg/20 text-fg hover:border-fg/50'}`}>
                Começar com o {p.label}
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-fg-muted">
          Conta como profissional quem aparece na agenda. Se você é o dono e também corta, você conta.
        </p>
      </section>

      {/* ── Compromisso ─────────────────────────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="max-w-6xl mx-auto px-5 py-16 grid md:grid-cols-3 gap-10">
          {[
            ['Cancela quando quiser', 'Sem multa e sem fidelidade. Seus dados ficam disponíveis por 30 dias depois.'],
            ['Seus dados são seus', 'Servidores no Brasil, acesso separado por barbearia e LGPD levada a sério.'],
            ['Suporte de gente', 'Você fala direto com quem faz o RÉGUA, pelo WhatsApp. Feito em Feira de Santana.'],
          ].map(([t, d]) => (
            <div key={t}>
              <h3 className="font-semibold text-fg">{t}</h3>
              <p className="mt-2 text-sm text-fg-muted leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Perguntas ───────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-5 py-24">
        <h2 className="font-display text-[30px] sm:text-[40px] leading-tight font-medium text-center">Perguntas de quem está chegando</h2>
        <div className="mt-10"><FaqLanding /></div>
      </section>

      {/* ── Fechamento ──────────────────────────────────────── */}
      <section className="px-5 pb-24">
        <div className="max-w-6xl mx-auto rounded-3xl bg-fg text-bg px-6 py-16 sm:px-14 sm:py-20 text-center">
          <Regua marcas={31} className="text-[#E2A27A] justify-center mx-auto" />
          <h2 className="font-display text-[32px] sm:text-[48px] leading-tight font-medium mt-8 max-w-2xl mx-auto">
            Abra a agenda de amanhã já organizada.
          </h2>
          <p className="mt-5 text-bg/70 text-lg">Cadastre a barbearia hoje e mande o link pros clientes ainda nesta semana.</p>
          <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3">
            <Link href={cadastro} className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-button bg-bg text-fg font-semibold hover:bg-bg/90">
              Testar 14 dias grátis <ArrowRight size={18} />
            </Link>
            <a href={linkSuporte('Oi! Quero saber mais sobre o RÉGUA.')} target="_blank" rel="noreferrer"
              className="inline-flex items-center justify-center px-7 py-4 rounded-button border border-bg/30 font-semibold hover:border-bg/60">
              Falar com a gente
            </a>
          </div>
        </div>
      </section>

      {/* ── Rodapé ──────────────────────────────────────────── */}
      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div>
            <Marca className="text-fg" />
            <p className="mt-3 text-sm text-fg-muted">Agenda e caixa para barbearias.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
            <Link href="/entrar" className="hover:text-fg">Entrar</Link>
            <Link href={cadastro} className="hover:text-fg">Cadastrar barbearia</Link>
            <a href={linkSuporte()} target="_blank" rel="noreferrer" className="hover:text-fg">Suporte</a>
            <Link href="/termos" className="hover:text-fg">Termos</Link>
            <Link href="/privacidade" className="hover:text-fg">Privacidade</Link>
          </nav>
          <p className="text-sm text-fg-muted">© 2026 RÉGUA</p>
        </div>
      </footer>
    </div>
  )
}
