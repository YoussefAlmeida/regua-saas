import Link from 'next/link'
import {
  ArrowRight, Check, X, MessageCircle, CalendarX2, CircleHelp, Users, CalendarCheck, ShieldCheck, Wallet,
  BarChart3, UserRoundCheck, Palette,
} from 'lucide-react'
import FaqLanding from './_components/faq-landing'
import { Marca } from '@/components/marca'
import { PainelVitrine, CelularVitrine } from './_components/landing/vitrine'
import { linkSuporte } from '@/lib/empresa'
import { formatBRL } from '@/lib/utils'
import { LISTA_PLANOS } from '@/lib/planos'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'RÉGUA — Agenda online e caixa da barbearia, sem app pra baixar' },
  description: 'Seu cliente marca sozinho pelo link em menos de 1 minuto. Você vê a agenda da equipe e o dinheiro do dia no celular. Planos a partir de R$ 39,99. 14 dias grátis, sem cartão.',
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
  description: 'Agendamento online, agenda da equipe e fluxo de caixa para barbearias.',
  offers: LISTA_PLANOS.map(p => ({ '@type': 'Offer', name: p.nome, price: p.preco.toFixed(2), priceCurrency: 'BRL' })),
}

const DORES = [
  [MessageCircle, '“Tem horário hoje?” o dia inteiro', 'Você para o corte pra responder mensagem, e quem não foi respondido marca em outro lugar.'],
  [CalendarX2, 'Dois clientes no mesmo horário', 'Agenda no caderno ou de cabeça uma hora falha, e alguém fica esperando irritado.'],
  [CircleHelp, 'Fim do mês sem saber o lucro', 'Entrou dinheiro, saiu dinheiro, e você não sabe dizer quanto sobrou de verdade.'],
  [Users, 'Acerto com a equipe no achismo', 'Sem saber quanto cada barbeiro fez, a conversa sobre comissão vira discussão.'],
] as const

const SOLUCOES = [
  [CalendarCheck, 'Agenda aberta 24 horas', 'O cliente escolhe o serviço, o barbeiro e o horário e confirma sozinho, em menos de 1 minuto. Você só vê o horário entrar.'],
  [ShieldCheck, 'Conflito de horário não existe', 'O sistema não deixa dois clientes no mesmo horário com o mesmo barbeiro. Cancelou, o horário volta a ficar livre na hora.'],
  [Wallet, 'Caixa que se preenche sozinho', 'Concluiu o atendimento, a entrada cai no caixa com o nome do barbeiro. Você lança só as saídas.'],
  [BarChart3, 'Números pra decidir', 'Faturamento, clientes ativos, serviços mais procurados e ocupação da equipe numa tela só.'],
  [UserRoundCheck, 'Cada um com o seu acesso', 'O barbeiro vê a agenda e o desempenho dele. O financeiro da barbearia é só seu.'],
  [Palette, 'A página é da sua barbearia', 'Sua logo, sua capa e suas cores no link de agendamento. O cliente vê a sua marca.'],
] as const

const ANTES_DEPOIS = [
  ['Responder “tem horário?” no meio do corte', 'O cliente vê os horários livres e marca sozinho'],
  ['Caderno, memória e horário em dobro', 'Uma agenda por barbeiro, sem conflito'],
  ['Somar o caixa no fim do dia', 'Entrada lançada na hora que você conclui o atendimento'],
  ['“Acho que esse mês foi bom”', 'Faturamento do mês comparado com o mês anterior'],
] as const

const PASSOS = [
  ['1', 'Cadastre a barbearia', 'Nome, serviços com preço e duração, e quem corta. Leva uns 10 minutos.'],
  ['2', 'Divulgue o seu link', 'Coloque na bio do Instagram e mande pros clientes. Ninguém precisa baixar aplicativo.'],
  ['3', 'Atenda e acompanhe', 'Os horários entram na agenda e cada atendimento concluído aparece no caixa.'],
] as const

// Planos vêm de lib/planos.ts (mesma tabela do painel e do admin)
const PLANOS = LISTA_PLANOS.map(p => ({
  id: p.id, label: p.nome, desc: p.resumo, preco: p.preco, destaque: !!p.destaque, funcionalidades: p.itens,
}))

const btnOuro = 'inline-flex items-center justify-center gap-2 rounded-xl bg-amber text-accent-fg font-semibold shadow-[0_12px_40px_-14px_rgb(245_217_0/0.6)] hover:bg-accent-press transition-colors'
const btnLinha = 'inline-flex items-center justify-center gap-2 rounded-xl border border-fg/20 text-fg font-semibold hover:border-fg/50 transition-colors'
const olho = 'text-sm font-semibold uppercase tracking-[0.14em] text-amber'
const titulo = 'font-display text-[32px] sm:text-[44px] leading-[1.08] font-semibold text-fg'

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  // Veio pelo "Agendamento por RÉGUA" de uma barbearia: a indicação vai junto pro cadastro
  const { ref } = await searchParams
  const cadastro = ref && /^[a-z0-9-]{1,60}$/.test(ref) ? `/cadastro-barbearia?ref=${ref}` : '/cadastro-barbearia'

  return (
    <div className="min-h-screen bg-bg text-fg overflow-x-clip ds-grade">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, '\\u003c') }} />

      {/* ── Topo ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-md border-b border-line/60">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" aria-label="RÉGUA, início"><Marca className="text-fg" /></Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-fg-muted" aria-label="Seções">
            <a href="#resolve" className="hover:text-fg">O que resolve</a>
            <a href="#como-funciona" className="hover:text-fg">Como funciona</a>
            <a href="#planos" className="hover:text-fg">Planos</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/entrar" className="px-3 py-2 text-sm font-semibold text-fg hover:text-amber">Entrar</Link>
            <Link href={cadastro} className={`${btnOuro} px-4 py-2.5 text-sm whitespace-nowrap`}>Testar grátis</Link>
          </div>
        </div>
      </header>

      {/* ── Abertura ─────────────────────────────────────────── */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-[620px] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(245_217_0/0.09),transparent_70%)]" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-5 pt-16 md:pt-24 text-center">
          <p className={olho}>Agendamento e gestão para barbearias</p>
          <h1 className="font-display mt-5 text-[40px] leading-[1.05] sm:text-6xl lg:text-[72px] font-semibold text-fg max-w-4xl mx-auto">
            Agenda cheia e caixa organizado, <span className="block text-amber">sem viver no WhatsApp.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-fg-muted max-w-2xl mx-auto leading-relaxed">
            Seu cliente marca sozinho pelo seu link, em menos de 1 minuto. Você acompanha a agenda da equipe e o dinheiro do dia pelo celular.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3">
            <Link href={cadastro} className={`${btnOuro} px-7 py-4 text-base`}>Testar grátis por 14 dias <ArrowRight size={18} aria-hidden /></Link>
            <a href="#resolve" className={`${btnLinha} px-7 py-4 text-base`}>Ver o que resolve</a>
          </div>
          <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-fg-muted">
            {['Sem cartão de crédito', 'Sem fidelidade', 'Pronto em 10 minutos'].map(t => (
              <li key={t} className="flex items-center gap-1.5"><Check size={15} className="text-amber" aria-hidden /> {t}</li>
            ))}
          </ul>
        </div>

        {/* O produto: painel do dono + link do cliente */}
        <div className="relative max-w-5xl mx-auto px-5 mt-14 md:mt-20 pb-10">
          <PainelVitrine />
          <CelularVitrine className="hidden md:block absolute right-2 xl:-right-10 -bottom-2" />
          <p className="sr-only">Imagem do painel do dono com agendamentos, faturamento e próximos horários, e do link de agendamento no celular do cliente.</p>
        </div>
      </section>

      {/* ── As dores ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className={olho}>Parece o seu dia?</p>
          <h2 className={`${titulo} mt-3`}>Barbearia boa perde dinheiro por desorganização, não por falta de cliente.</h2>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DORES.map(([Icone, t, d]) => (
            <div key={t} className="rounded-2xl border border-line bg-surface p-6">
              <span className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-saida/10 text-saida"><Icone size={19} aria-hidden /></span>
              <h3 className="mt-4 font-semibold text-fg leading-snug">{t}</h3>
              <p className="mt-2 text-sm text-fg-muted leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── O que resolve ───────────────────────────────────── */}
      <section id="resolve" className="border-y border-line bg-surface/50 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-5 py-20 md:py-28">
          <div className="max-w-2xl">
            <p className={olho}>O que o RÉGUA resolve</p>
            <h2 className={`${titulo} mt-3`}>Você cuida do corte. A agenda e o caixa se organizam sozinhos.</h2>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SOLUCOES.map(([Icone, t, d]) => (
              <div key={t} className="rounded-2xl border border-line bg-bg p-6 hover:border-amber/50 transition-colors">
                <span className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-amber/15 text-amber"><Icone size={19} aria-hidden /></span>
                <h3 className="mt-4 text-lg font-semibold text-fg leading-snug">{t}</h3>
                <p className="mt-2 text-sm text-fg-muted leading-relaxed">{d}</p>
              </div>
            ))}
          </div>

          {/* Antes e depois */}
          <div className="mt-14 rounded-2xl border border-line bg-bg overflow-hidden">
            <div className="grid grid-cols-2 border-b border-line text-sm font-semibold">
              <p className="px-5 py-4 text-fg-muted">Hoje, sem sistema</p>
              <p className="px-5 py-4 text-amber border-l border-line">Com o RÉGUA</p>
            </div>
            {ANTES_DEPOIS.map(([antes, depois]) => (
              <div key={antes} className="grid grid-cols-2 border-b border-line last:border-b-0 text-sm sm:text-base">
                <p className="px-5 py-4 flex gap-2.5 text-fg-muted"><X size={17} className="text-saida shrink-0 mt-0.5" aria-hidden /> {antes}</p>
                <p className="px-5 py-4 flex gap-2.5 text-fg border-l border-line"><Check size={17} className="text-entrada shrink-0 mt-0.5" aria-hidden /> {depois}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ───────────────────────────────────── */}
      <section id="como-funciona" className="max-w-6xl mx-auto px-5 py-20 md:py-28 scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto">
          <p className={olho}>Como funciona</p>
          <h2 className={`${titulo} mt-3`}>Três passos e a agenda de amanhã já recebe horários.</h2>
        </div>
        <ol className="mt-12 grid md:grid-cols-3 gap-4">
          {PASSOS.map(([n, t, d]) => (
            <li key={n} className="relative rounded-2xl border border-line bg-surface p-7">
              <span className="font-display text-5xl font-semibold text-amber tabular-nums" aria-hidden>{n}</span>
              <h3 className="mt-4 text-lg font-semibold text-fg">{t}</h3>
              <p className="mt-2 text-sm text-fg-muted leading-relaxed">{d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 text-center">
          <Link href={cadastro} className={`${btnOuro} px-7 py-4 text-base`}>Começar agora, é grátis <ArrowRight size={18} aria-hidden /></Link>
        </div>
      </section>

      {/* ── Planos ──────────────────────────────────────────── */}
      <section id="planos" className="border-t border-line bg-surface/50 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-5 py-20 md:py-28">
          <div className="text-center max-w-2xl mx-auto">
            <p className={olho}>Planos</p>
            <h2 className={`${titulo} mt-3`}>Custa menos que um corte por semana.</h2>
            <p className="mt-4 text-lg text-fg-muted">14 dias grátis em qualquer plano, com tudo liberado. Depois, por mês, sem fidelidade.</p>
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-5 items-stretch">
            {PLANOS.map(p => (
              <article key={p.id} className={`relative flex flex-col rounded-2xl p-7 ${
                p.destaque ? 'bg-bg border-2 border-amber shadow-[0_30px_80px_-30px_rgb(245_217_0/0.35)]' : 'bg-bg border border-line'}`}>
                {p.destaque && (
                  <span className="absolute -top-3 left-7 px-3 py-1 rounded-full bg-amber text-accent-fg text-xs font-semibold">Mais escolhido por equipes</span>
                )}
                <h3 className="font-display text-[26px] font-semibold">{p.label}</h3>
                <p className="mt-1 text-sm text-fg-muted">{p.desc}</p>
                <p className="mt-6 flex flex-wrap items-baseline gap-1">
                  <span className="font-display text-[34px] lg:text-[42px] leading-none font-semibold tabular-nums whitespace-nowrap">{formatBRL(p.preco)}</span>
                  <span className="text-sm text-fg-muted">/mês</span>
                </p>
                <ul className="mt-6 space-y-2.5 flex-1">
                  {p.funcionalidades.map(f => (
                    <li key={f} className="flex gap-2.5 text-sm text-fg">
                      <Check size={16} className="text-amber shrink-0 mt-0.5" aria-hidden /> {f}
                    </li>
                  ))}
                </ul>
                <Link href={cadastro} className={`mt-8 px-5 py-3.5 ${p.destaque ? btnOuro : btnLinha}`}>
                  Testar o {p.label} grátis
                </Link>
              </article>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-fg-muted">
            Conta como profissional quem aparece na agenda. Se você é o dono e também corta, você conta.
          </p>
        </div>
      </section>

      {/* ── Compromisso ─────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 py-16 grid md:grid-cols-3 gap-4">
        {[
          ['Teste sem risco', '14 dias com tudo liberado e sem cadastrar cartão. Se não servir, é só não assinar.'],
          ['Cancela quando quiser', 'Sem multa e sem fidelidade. Seus dados ficam disponíveis por 30 dias depois.'],
          ['Seus dados são seus', 'Servidores no Brasil, acesso separado por barbearia e LGPD levada a sério.'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="font-semibold text-fg flex items-center gap-2"><ShieldCheck size={17} className="text-amber" aria-hidden /> {t}</h3>
            <p className="mt-2 text-sm text-fg-muted leading-relaxed">{d}</p>
          </div>
        ))}
      </section>

      {/* ── Perguntas ───────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-5 py-16 md:py-20">
        <h2 className={`${titulo} text-center`}>Perguntas de quem está chegando</h2>
        <div className="mt-10"><FaqLanding /></div>
      </section>

      {/* ── Fechamento ──────────────────────────────────────── */}
      <section className="px-5 pb-24">
        <div className="relative max-w-6xl mx-auto rounded-3xl border border-amber/30 bg-surface px-6 py-16 sm:px-14 sm:py-20 text-center overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgb(245_217_0/0.10),transparent_70%)]" aria-hidden />
          <div className="relative">
            <h2 className="font-display text-[32px] sm:text-[48px] leading-[1.08] font-semibold max-w-2xl mx-auto">
              Cadastre hoje. Amanhã seu cliente já marca pelo link.
            </h2>
            <p className="mt-5 text-fg-muted text-lg max-w-xl mx-auto">Você testa 14 dias com tudo liberado, sem cartão. Leva 10 minutos pra deixar pronto.</p>
            <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3">
              <Link href={cadastro} className={`${btnOuro} px-7 py-4 text-base`}>Testar grátis por 14 dias <ArrowRight size={18} aria-hidden /></Link>
              <a href={linkSuporte('Oi! Quero saber mais sobre o RÉGUA.')} target="_blank" rel="noreferrer" className={`${btnLinha} px-7 py-4 text-base`}>
                Falar com a gente
              </a>
            </div>
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
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted" aria-label="Rodapé">
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
