import Link from 'next/link'
import {
  CalendarCheck, BellRing, TrendingUp, Users, BarChart3, Scissors,
  CheckCircle2, ArrowRight, Zap, Shield,
} from 'lucide-react'
import FaqLanding from './_components/faq-landing'
import { formatBRL } from '@/lib/utils'
import { LISTA_PLANOS } from '@/lib/planos'

// Planos vêm de lib/planos.ts (mesma tabela do painel e do admin)
const PLANOS = LISTA_PLANOS.map(p => ({
  id: p.id, label: p.nome, desc: p.resumo, preco: p.preco, destaque: !!p.destaque, funcionalidades: p.itens,
}))

const FUNCIONALIDADES = [
  {
    icon: CalendarCheck,
    titulo: 'Agendamento online',
    desc: 'Link personalizado para compartilhar no Instagram. Cliente escolhe barbeiro, serviço e horário sozinho.',
  },
  {
    icon: BellRing,
    titulo: 'Lembrete automático',
    desc: 'WhatsApp 2h antes do horário. Reduz falta sem você precisar fazer nada.',
  },
  {
    icon: TrendingUp,
    titulo: 'Financeiro claro',
    desc: 'Veja entradas, saídas e saldo do mês. Sem planilha, sem confusão.',
  },
  {
    icon: Users,
    titulo: 'Gestão de equipe',
    desc: 'Convida barbeiros por link, controla horários e aprovações em segundos.',
  },
  {
    icon: BarChart3,
    titulo: 'Relatórios reais',
    desc: 'Quanto cada barbeiro faturou, clientes novos vs retorno, ticket médio.',
  },
  {
    icon: Scissors,
    titulo: 'Agenda visual',
    desc: 'Veja o dia inteiro de um olhar. Cria ou cancela agendamentos em dois toques.',
  },
]

const DORES = [
  {
    emoji: '😤',
    problema: 'Agendamento bagunçado no WhatsApp',
    solucao: 'Link público: cliente agenda, você só aparece.',
  },
  {
    emoji: '😤',
    problema: 'Cliente falhou e você perdeu a hora',
    solucao: 'Lembrete automático cai no WhatsApp do cliente 2h antes.',
  },
  {
    emoji: '😤',
    problema: 'Não sabe quanto ganhou no mês',
    solucao: 'Financeiro em tempo real: entradas, saídas, saldo.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-fg">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-bg/90 backdrop-blur border-b border-line px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-display text-2xl text-amber tracking-widest">RÉGUA</span>
          <div className="flex items-center gap-3">
            <Link
              href="/entrar"
              className="font-ui text-xs uppercase tracking-wider text-fg-muted hover:text-fg transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro-barbearia"
              className="bg-amber text-bg font-ui text-xs uppercase tracking-wider px-4 py-2 rounded-button hover:opacity-90 transition-opacity"
            >
              Grátis 14 dias
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="px-4 pt-20 pb-24 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-amber/10 border border-amber/20 rounded-full px-4 py-1.5 mb-8">
          <Zap size={12} className="text-amber" />
          <span className="font-ui text-xs uppercase tracking-wider text-amber">14 dias grátis · sem cartão</span>
        </div>

        <h1 className="font-display text-5xl md:text-7xl text-fg uppercase tracking-wide leading-none mb-6">
          Sua barbearia<br />
          <span className="text-amber">sempre cheia.</span><br />
          Sem caos.
        </h1>

        <p className="font-body text-lg text-fg-muted max-w-xl mx-auto mb-10">
          Agendamento online, lembretes automáticos no WhatsApp e controle financeiro em um só lugar.
          Feito para barbearia de verdade.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/cadastro-barbearia"
            className="inline-flex items-center justify-center gap-2 bg-amber text-bg font-ui uppercase tracking-wider text-sm px-8 py-4 rounded-button hover:opacity-90 transition-opacity"
          >
            Começar grátis agora
            <ArrowRight size={16} />
          </Link>
          <Link
            href="#planos"
            className="inline-flex items-center justify-center font-ui uppercase tracking-wider text-sm px-8 py-4 rounded-button border border-line text-fg-muted hover:text-fg hover:border-fg/20 transition-colors"
          >
            Ver planos e preços
          </Link>
        </div>

        <p className="font-body text-xs text-fg-muted mt-5">
          Sem cartão de crédito · Cancele quando quiser · Configura em 2 minutos
        </p>
      </section>

      {/* ── Dores → Soluções ────────────────────────────────── */}
      <section className="px-4 py-20 bg-surface border-y border-line">
        <div className="max-w-4xl mx-auto">
          <p className="font-ui text-xs uppercase tracking-widest text-fg-muted text-center mb-3">
            Você se identifica?
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-fg text-center uppercase mb-12">
            Chega de perder dinheiro<br />
            <span className="text-amber">por falta de organização</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            {DORES.map((d, i) => (
              <div key={i} className="bg-bg border border-line rounded-card p-5 space-y-4">
                <div className="space-y-2">
                  <span className="text-2xl">{d.emoji}</span>
                  <p className="font-ui text-sm text-saida/90 line-through">{d.problema}</p>
                </div>
                <div className="h-px bg-line" />
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-entrada shrink-0 mt-0.5" />
                  <p className="font-body text-sm text-fg">{d.solucao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ───────────────────────────────────── */}
      <section className="px-4 py-20 max-w-4xl mx-auto">
        <p className="font-ui text-xs uppercase tracking-widest text-fg-muted text-center mb-3">Simples assim</p>
        <h2 className="font-display text-3xl md:text-4xl text-fg text-center uppercase mb-12">
          3 passos para<br /><span className="text-amber">dobrar sua organização</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: '01', titulo: 'Cadastre sua barbearia', desc: 'Nome, horários e serviços. Pronto em menos de 2 minutos.' },
            { n: '02', titulo: 'Compartilhe seu link', desc: 'Coloca no Instagram, no WhatsApp, onde quiser. Seu cliente agenda sem te chamar.' },
            { n: '03', titulo: 'Gerencie no painel', desc: 'Agenda, financeiro e equipe em um só lugar. Acessa do celular, onde estiver.' },
          ].map(step => (
            <div key={step.n} className="relative">
              <div className="font-display text-6xl text-amber/10 leading-none mb-3">{step.n}</div>
              <h3 className="font-ui text-base uppercase tracking-wider text-fg mb-2">{step.titulo}</h3>
              <p className="font-body text-sm text-fg-muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Funcionalidades ─────────────────────────────────── */}
      <section className="px-4 py-20 bg-surface border-y border-line">
        <div className="max-w-5xl mx-auto">
          <p className="font-ui text-xs uppercase tracking-widest text-fg-muted text-center mb-3">Tudo incluso</p>
          <h2 className="font-display text-3xl md:text-4xl text-fg text-center uppercase mb-12">
            Cada ferramenta<br /><span className="text-amber">pensada para barbearia</span>
          </h2>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {FUNCIONALIDADES.map(({ icon: Icon, titulo, desc }) => (
              <div
                key={titulo}
                className="bg-bg border border-line rounded-card p-5 hover:border-amber/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-button bg-amber/10 flex items-center justify-center text-amber mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="font-ui text-sm uppercase tracking-wider text-fg mb-2">{titulo}</h3>
                <p className="font-body text-xs text-fg-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compromisso (sem depoimento inventado: entra quando houver clientes reais) ── */}
      <section className="px-4 py-16 max-w-4xl mx-auto text-center space-y-6">
        <p className="font-ui text-xs uppercase tracking-widest text-fg-muted">Feito na Bahia, pra barbearia de verdade</p>
        <h2 className="font-display text-2xl md:text-3xl text-fg uppercase max-w-2xl mx-auto">
          Sem fidelidade, sem letra miúda. <span className="text-amber">Seus dados são seus.</span>
        </h2>
        <div className="grid sm:grid-cols-3 gap-3 text-left">
          {[
            ['Cancela quando quiser', 'Sem multa e sem fidelidade. Seus dados ficam disponíveis por 30 dias.'],
            ['Teste de 14 dias', 'Tudo liberado, sem cartão. Só paga se fizer sentido pra você.'],
            ['Suporte de gente', 'Fala direto com quem faz o RÉGUA, pelo WhatsApp.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-surface border border-line rounded-card p-4">
              <p className="font-ui text-sm uppercase tracking-wider text-fg mb-1">{t}</p>
              <p className="font-body text-xs text-fg-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Planos ──────────────────────────────────────────── */}
      <section id="planos" className="px-4 py-20 bg-surface border-y border-line">
        <div className="max-w-5xl mx-auto">
          <p className="font-ui text-xs uppercase tracking-widest text-fg-muted text-center mb-3">Preços</p>
          <h2 className="font-display text-3xl md:text-4xl text-fg text-center uppercase mb-3">
            Plano honesto,<br /><span className="text-amber">sem pegadinha</span>
          </h2>
          <p className="font-body text-sm text-fg-muted text-center mb-12">
            14 dias grátis em qualquer plano. Sem cartão de crédito para começar.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {PLANOS.map(plano => (
              <div
                key={plano.id}
                className={`rounded-card p-6 flex flex-col relative ${
                  plano.destaque
                    ? 'bg-amber/5 border-2 border-amber'
                    : 'bg-bg border border-line'
                }`}
              >
                {plano.destaque && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-amber text-bg font-ui text-xs uppercase tracking-wider px-4 py-1 rounded-full whitespace-nowrap">
                      Recomendado
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-1">{plano.desc}</p>
                  <p className="font-display text-2xl text-fg uppercase">{plano.label}</p>
                </div>

                <div className="mb-6">
                  <span className="font-mono text-4xl text-amber">{formatBRL(plano.preco)}</span>
                  <span className="font-body text-sm text-fg-muted">/mês</span>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plano.funcionalidades.map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-entrada shrink-0" />
                      <span className="font-body text-sm text-fg-muted">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/cadastro-barbearia"
                  className={`w-full text-center font-ui text-sm uppercase tracking-wider py-3 rounded-button transition-opacity ${
                    plano.destaque
                      ? 'bg-amber text-bg hover:opacity-90'
                      : 'border border-line text-fg-muted hover:text-fg hover:border-fg/30'
                  }`}
                >
                  Começar grátis
                </Link>
              </div>
            ))}
          </div>

          <p className="font-body text-xs text-fg-muted text-center mt-6">
            Precisa de algo diferente?{' '}
            <a
              href="https://wa.me/5575982727760?text=Quero+saber+mais+sobre+o+RÉGUA"
              target="_blank"
              rel="noreferrer"
              className="text-amber hover:underline"
            >
              Fale com a gente no WhatsApp
            </a>
          </p>
        </div>
      </section>

      {/* ── Garantia ────────────────────────────────────────── */}
      <section className="px-4 py-16 max-w-3xl mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-entrada/10 flex items-center justify-center mx-auto mb-5">
          <Shield size={28} className="text-entrada" />
        </div>
        <h2 className="font-display text-2xl md:text-3xl text-fg uppercase mb-3">
          Sem risco nenhum
        </h2>
        <p className="font-body text-fg-muted max-w-xl mx-auto">
          14 dias grátis, sem cartão de crédito. Se não gostar — e vai gostar — cancela com um clique
          e não cobra nada. Simples assim.
        </p>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="px-4 py-20 bg-surface border-y border-line">
        <div className="max-w-2xl mx-auto">
          <p className="font-ui text-xs uppercase tracking-widest text-fg-muted text-center mb-3">Dúvidas</p>
          <h2 className="font-display text-3xl text-fg text-center uppercase mb-10">
            Perguntas frequentes
          </h2>
          <FaqLanding />
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────── */}
      <section className="px-4 py-24 text-center max-w-2xl mx-auto">
        <h2 className="font-display text-4xl md:text-5xl text-fg uppercase mb-6">
          Sua barbearia merece<br />
          <span className="text-amber">estar na régua.</span>
        </h2>
        <p className="font-body text-fg-muted mb-10">
          Pare de perder cliente e dinheiro por falta de organização.
        </p>
        <Link
          href="/cadastro-barbearia"
          className="inline-flex items-center gap-2 bg-amber text-bg font-ui uppercase tracking-wider text-sm px-10 py-4 rounded-button hover:opacity-90 transition-opacity"
        >
          Quero começar agora — é grátis
          <ArrowRight size={16} />
        </Link>
        <p className="font-body text-xs text-fg-muted mt-4">
          14 dias grátis · Sem cartão · Cancele quando quiser
        </p>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-line px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display text-xl text-amber tracking-widest">RÉGUA</span>
          <div className="flex gap-6">
            <Link href="/entrar" className="font-ui text-xs uppercase tracking-wider text-fg-muted hover:text-fg">
              Entrar
            </Link>
            <Link href="/cadastro-barbearia" className="font-ui text-xs uppercase tracking-wider text-fg-muted hover:text-fg">
              Cadastrar
            </Link>
            <a
              href="https://wa.me/5575982727760"
              target="_blank"
              rel="noreferrer"
              className="font-ui text-xs uppercase tracking-wider text-fg-muted hover:text-fg"
            >
              Suporte
            </a>
          </div>
          <p className="font-body text-xs text-fg-muted">© 2026 RÉGUA</p>
        </div>
      </footer>

    </div>
  )
}
