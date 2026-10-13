'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Copy, MessageCircle, Scissors, UserPlus, ExternalLink, ChevronRight, Plus, X } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'

/* Primeiro uso do dono — seção 6.1.2
   1. Quem corta  2. Serviços  3. Link pronto  4. Agendamento de teste */

type Passo = 'equipe' | 'servicos' | 'link' | 'teste'
const PASSOS: { id: Passo; t: string }[] = [
  { id: 'equipe', t: 'Quem corta' },
  { id: 'servicos', t: 'Serviços' },
  { id: 'link', t: 'Seu link' },
  { id: 'teste', t: 'Teste' },
]

interface Servico { id: string; nome: string; preco: number; duracao_min: number }

const SUGESTOES = [
  { nome: 'Corte', preco: '30', duracao_min: 30, cor: '#E8B04B' },
  { nome: 'Barba', preco: '20', duracao_min: 20, cor: '#6BA3D6' },
  { nome: 'Corte + barba', preco: '45', duracao_min: 50, cor: '#4FB477' },
  { nome: 'Pezinho', preco: '10', duracao_min: 10, cor: '#A1A1A8' },
  { nome: 'Sobrancelha', preco: '10', duracao_min: 10, cor: '#A1A1A8' },
  { nome: 'Pigmentação', preco: '25', duracao_min: 30, cor: '#E2564D' },
]

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ComecarClient({
  barbearia, donoNome, servicosIniciais, temEquipe, donoCorta, siteUrl,
}: {
  barbearia: { nome: string; slug: string }
  donoNome: string
  servicosIniciais: Servico[]
  temEquipe: boolean
  donoCorta: boolean
  siteUrl: string
}) {
  const router = useRouter()
  const [passo, setPasso] = useState<Passo>(temEquipe ? (servicosIniciais.length ? 'link' : 'servicos') : 'equipe')
  const [euCorto, setEuCorto] = useState(donoCorta)
  const [conviteLink, setConviteLink] = useState('')
  const [servicos, setServicos] = useState<Servico[]>(servicosIniciais)
  const [rascunho, setRascunho] = useState<{ nome: string; preco: string; duracao_min: number; cor: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const linkPublico = `${siteUrl}/${barbearia.slug}`
  const idx = PASSOS.findIndex(p => p.id === passo)

  async function souEuQueCorto() {
    setOcupado(true)
    const res = await fetch('/api/painel/onboarding/eu-corto', { method: 'POST' }).catch(() => null)
    setOcupado(false)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    setEuCorto(true)
    avisar('Pronto, você aparece na agenda.', 'sucesso')
  }

  async function gerarConvite() {
    setOcupado(true)
    const res = await fetch('/api/painel/equipe', { method: 'POST' }).catch(() => null)
    setOcupado(false)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    setConviteLink((await res.json()).link)
  }

  async function salvarServico() {
    if (!rascunho) return
    const preco = Number(rascunho.preco.replace(',', '.'))
    if (!rascunho.nome.trim() || isNaN(preco) || preco < 0) { avisar('Confere nome e preço.', 'erro'); return }
    setOcupado(true)
    const res = await fetch('/api/painel/servicos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: rascunho.nome.trim(), preco, duracao_min: rascunho.duracao_min, cor: rascunho.cor }),
    }).catch(() => null)
    setOcupado(false)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    const s = await res.json()
    setServicos(prev => [...prev, s])
    setRascunho(null)
  }

  async function copiar() {
    await navigator.clipboard.writeText(linkPublico).catch(() => null)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const textoDivulgar = `Agora dá pra marcar horário na ${barbearia.nome} direto pelo celular, sem baixar app: ${linkPublico}`
  const inputCls = 'w-full bg-bg border border-line rounded-button px-3 py-2.5 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber'
  const primario = 'w-full flex items-center justify-center gap-2 bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm uppercase tracking-wider py-3.5 rounded-button transition-colors disabled:opacity-40'

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div>
        <p className="font-ui text-xs uppercase tracking-wider text-amber">Primeiros passos</p>
        <h1 className="font-display text-3xl uppercase tracking-wide text-fg mt-1">
          {passo === 'equipe' && `Bem-vindo, ${donoNome.split(' ')[0]}`}
          {passo === 'servicos' && 'O que vocês fazem?'}
          {passo === 'link' && 'Seu link tá pronto'}
          {passo === 'teste' && 'Agora testa'}
        </h1>
      </div>

      {/* Progresso */}
      <ol className="flex gap-2">
        {PASSOS.map((p, i) => (
          <li key={p.id} className="flex-1">
            <div className={`h-1 rounded-full ${i <= idx ? 'bg-amber' : 'bg-line'}`} />
            <p className={`font-ui text-[10px] uppercase tracking-wider mt-1.5 ${i === idx ? 'text-fg' : 'text-fg-muted'}`}>{p.t}</p>
          </li>
        ))}
      </ol>

      {/* 1 — Quem corta */}
      {passo === 'equipe' && (
        <section className="space-y-3">
          <p className="font-body text-sm text-fg-muted">Quem atende os clientes? Dá pra fazer os dois.</p>

          <button onClick={souEuQueCorto} disabled={ocupado || euCorto} className={`w-full flex items-center gap-4 rounded-card border px-4 py-4 text-left transition-colors ${euCorto ? 'border-entrada/40 bg-entrada/5' : 'border-line bg-surface hover:border-amber/50'}`}>
            <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${euCorto ? 'bg-entrada/15 text-entrada' : 'bg-surface-alt text-amber'}`}>
              {euCorto ? <Check size={18} /> : <Scissors size={18} />}
            </span>
            <span className="flex-1">
              <span className="block font-ui text-sm uppercase tracking-wider text-fg">Sou eu que corto</span>
              <span className="block font-body text-xs text-fg-muted">{euCorto ? 'Você já aparece na agenda' : 'Você aparece como barbeiro na agenda'}</span>
            </span>
          </button>

          <div className="rounded-card border border-line bg-surface p-4 space-y-3">
            <div className="flex items-center gap-4">
              <span className="w-10 h-10 rounded-full bg-surface-alt text-amber flex items-center justify-center shrink-0"><UserPlus size={18} /></span>
              <span className="flex-1">
                <span className="block font-ui text-sm uppercase tracking-wider text-fg">Convidar barbeiro</span>
                <span className="block font-body text-xs text-fg-muted">Ele cria a conta pelo link e você aprova</span>
              </span>
            </div>
            {conviteLink ? (
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Fala! Te adicionei na equipe da ${barbearia.nome} no RÉGUA. Cria sua conta por aqui (vale 7 dias): ${conviteLink}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-entrada/10 border border-entrada/30 text-entrada font-ui text-xs uppercase tracking-wider py-3 rounded-button"
              >
                <MessageCircle size={14} /> Enviar convite no WhatsApp
              </a>
            ) : (
              <button onClick={gerarConvite} disabled={ocupado} className="w-full border border-line text-fg font-ui text-xs uppercase tracking-wider py-3 rounded-button hover:border-amber/50">
                Gerar convite
              </button>
            )}
          </div>

          <button onClick={() => setPasso('servicos')} disabled={!euCorto && !conviteLink} className={primario}>
            Continuar <ChevronRight size={16} />
          </button>
          {!euCorto && !conviteLink && <p className="font-body text-xs text-fg-muted text-center">Escolha pelo menos uma opção.</p>}
        </section>
      )}

      {/* 2 — Serviços */}
      {passo === 'servicos' && (
        <section className="space-y-4">
          <p className="font-body text-sm text-fg-muted">Toca nos que vocês fazem e ajusta o preço. Dá pra mudar depois em Mais → Serviços.</p>

          {servicos.length > 0 && (
            <ul className="bg-surface border border-line rounded-card divide-y divide-line">
              {servicos.map(s => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <Check size={14} className="text-entrada shrink-0" />
                  <span className="flex-1 font-body text-sm text-fg">{s.nome} <span className="text-fg-muted">· {s.duracao_min} min</span></span>
                  <span className="font-mono text-sm text-amber">{brl(Number(s.preco))}</span>
                </li>
              ))}
            </ul>
          )}

          {rascunho ? (
            <div className="bg-surface border border-amber/40 rounded-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-ui text-xs uppercase tracking-wider text-amber">Novo serviço</p>
                <button onClick={() => setRascunho(null)} aria-label="Cancelar"><X size={16} className="text-fg-muted" /></button>
              </div>
              <input value={rascunho.nome} onChange={e => setRascunho({ ...rascunho, nome: e.target.value })} placeholder="Nome" className={inputCls} aria-label="Nome do serviço" />
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="font-ui text-[10px] uppercase tracking-wider text-fg-muted">Preço (R$)</span>
                  <input inputMode="decimal" value={rascunho.preco} onChange={e => setRascunho({ ...rascunho, preco: e.target.value.replace(/[^\d,.]/g, '') })} className={inputCls} />
                </label>
                <label className="block">
                  <span className="font-ui text-[10px] uppercase tracking-wider text-fg-muted">Duração</span>
                  <select value={rascunho.duracao_min} onChange={e => setRascunho({ ...rascunho, duracao_min: Number(e.target.value) })} className={inputCls}>
                    {[10, 15, 20, 30, 40, 45, 50, 60, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </label>
              </div>
              <button onClick={salvarServico} disabled={ocupado} className={primario}>Adicionar</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.filter(s => !servicos.some(x => x.nome.toLowerCase() === s.nome.toLowerCase())).map(s => (
                <button key={s.nome} onClick={() => setRascunho({ ...s })} className="flex items-center gap-1 px-3 py-2 rounded-full border border-line bg-surface font-ui text-xs uppercase tracking-wider text-fg hover:border-amber/50">
                  <Plus size={12} /> {s.nome}
                </button>
              ))}
              <button onClick={() => setRascunho({ nome: '', preco: '', duracao_min: 30, cor: '#E8B04B' })} className="px-3 py-2 rounded-full border border-dashed border-line font-ui text-xs uppercase tracking-wider text-fg-muted hover:text-amber">
                Outro…
              </button>
            </div>
          )}

          <button onClick={() => setPasso('link')} disabled={servicos.length === 0} className={primario}>
            Continuar <ChevronRight size={16} />
          </button>
          {servicos.length === 0 && <p className="font-body text-xs text-fg-muted text-center">Cadastre pelo menos 1 — sem serviço não tem o que agendar.</p>}
        </section>
      )}

      {/* 3 — Link */}
      {passo === 'link' && (
        <section className="space-y-4">
          <p className="font-body text-sm text-fg-muted">É por esse link que o cliente marca. Coloca na bio do Instagram e manda no WhatsApp.</p>
          <div className="bg-surface border border-amber/40 rounded-card p-4">
            <p className="font-mono text-base text-amber break-all">{linkPublico.replace(/^https?:\/\//, '')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={copiar} className="flex items-center justify-center gap-2 border border-line text-fg font-ui text-xs uppercase tracking-wider py-3 rounded-button hover:border-amber/50">
              {copiado ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(textoDivulgar)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-entrada/10 border border-entrada/30 text-entrada font-ui text-xs uppercase tracking-wider py-3 rounded-button">
              <MessageCircle size={14} /> WhatsApp
            </a>
          </div>
          <button onClick={() => setPasso('teste')} className={primario}>Continuar <ChevronRight size={16} /></button>
        </section>
      )}

      {/* 4 — Teste */}
      {passo === 'teste' && (
        <section className="space-y-4">
          <p className="font-body text-sm text-fg-muted">
            Faz de conta que você é cliente: abre o link, marca um horário com outro número de WhatsApp e volta aqui. O horário aparece na Agenda na hora.
          </p>
          <a href={`/${barbearia.slug}`} target="_blank" rel="noopener noreferrer" className={primario}>
            <ExternalLink size={15} /> Abrir minha página
          </a>
          <button onClick={() => { router.push('/painel/agenda'); router.refresh() }} className="w-full border border-line text-fg font-ui text-xs uppercase tracking-wider py-3 rounded-button hover:border-amber/50">
            Já marquei — ver na agenda
          </button>
          <p className="font-body text-xs text-fg-muted text-center">
            Próximos passos: ajuste o horário em <Link href="/painel/mais/configuracoes" className="text-amber hover:underline">Configurações</Link> e cadastre aluguel e contas em <Link href="/painel/financeiro" className="text-amber hover:underline">Financeiro → Fixas</Link>.
          </p>
        </section>
      )}

      {passo !== 'teste' && (
        <Link href="/painel/hoje" className="block text-center font-ui text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg">
          Fazer isso depois
        </Link>
      )}
    </div>
  )
}
