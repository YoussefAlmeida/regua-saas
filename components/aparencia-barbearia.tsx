'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Check, ImagePlus, Trash2, AlertTriangle, ExternalLink } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'
import { temaDaBarbearia, PRIMARIA_PADRAO, SECUNDARIA_PADRAO } from '@/lib/tema'

/* Aparência da página de agendamento: logo, capa, cores e texto "sobre".
   As cores passam pelo mesmo ajuste de contraste que a página usa, então
   a prévia mostra exatamente o que o cliente vai ver. */

export interface Marca {
  nome: string
  slug: string
  logo_url: string | null
  capa_url: string | null
  sobre: string | null
  cor_primaria: string | null
  cor_secundaria: string | null
}

export default function AparenciaBarbearia({ marca, liberada }: { marca: Marca; liberada: boolean }) {
  const [logo, setLogo] = useState(marca.logo_url)
  const [capa, setCapa] = useState(marca.capa_url)
  const [primaria, setPrimaria] = useState(marca.cor_primaria ?? PRIMARIA_PADRAO)
  const [secundaria, setSecundaria] = useState(marca.cor_secundaria ?? SECUNDARIA_PADRAO)
  const [sobre, setSobre] = useState(marca.sobre ?? '')
  const [enviando, setEnviando] = useState<'logo' | 'capa' | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const inputLogo = useRef<HTMLInputElement>(null), inputCapa = useRef<HTMLInputElement>(null)

  const tema = temaDaBarbearia({ cor_primaria: primaria, cor_secundaria: secundaria })
  const padrao = primaria.toUpperCase() === PRIMARIA_PADRAO && secundaria.toUpperCase() === SECUNDARIA_PADRAO

  async function enviar(tipo: 'logo' | 'capa', arquivo: File | undefined) {
    if (!arquivo) return
    setEnviando(tipo)
    const fd = new FormData()
    fd.append('tipo', tipo); fd.append('arquivo', arquivo)
    const res = await fetch('/api/painel/barbearia/imagem', { method: 'POST', body: fd }).catch(() => null)
    setEnviando(null)
    if (!res) { avisar('Sem conexão. Confere a internet e tenta de novo.', 'erro'); return }
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    const { url } = await res.json()
    if (tipo === 'logo') setLogo(url); else setCapa(url)
    avisar(tipo === 'logo' ? 'Logo atualizado.' : 'Capa atualizada.', 'sucesso')
  }

  async function remover(tipo: 'logo' | 'capa') {
    setEnviando(tipo)
    const res = await fetch(`/api/painel/barbearia/imagem?tipo=${tipo}`, { method: 'DELETE' }).catch(() => null)
    setEnviando(null)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    if (tipo === 'logo') setLogo(null); else setCapa(null)
  }

  async function salvar() {
    setSalvando(true)
    const res = await fetch('/api/painel/barbearia', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Paleta oficial = sem cor própria gravada
        cor_primaria: primaria.toUpperCase() === PRIMARIA_PADRAO ? null : primaria,
        cor_secundaria: secundaria.toUpperCase() === SECUNDARIA_PADRAO ? null : secundaria,
        sobre: sobre.trim() || null,
      }),
    }).catch(() => null)
    setSalvando(false)
    if (!res) { avisar('Sem conexão. Confere a internet e tenta de novo.', 'erro'); return }
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    setSalvo(true); setTimeout(() => setSalvo(false), 3000)
    avisar('Aparência salva. Já vale na sua página de agendamento.', 'sucesso')
  }

  const labelCls = 'font-ui text-sm font-medium text-fg block mb-1.5'
  const btnSec = 'font-semibold inline-flex items-center gap-1.5 border border-line text-fg hover:border-amber/50 font-ui text-xs px-3 py-2 rounded-button transition-colors disabled:opacity-50'

  return (
    <div className="px-4 md:px-8 pb-10 max-w-lg md:max-w-5xl mx-auto">
    <section className="space-y-5 md:max-w-lg" aria-labelledby="titulo-aparencia">
      <div className="border-t border-line pt-8 flex items-center justify-between gap-3">
        <div>
          <h2 id="titulo-aparencia" className="font-display text-xl font-semibold text-fg">Aparência da página</h2>
          <p className="font-body text-xs text-fg-muted">O que o cliente vê no seu link de agendamento.</p>
        </div>
        <a href={`/${marca.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-body text-xs text-amber hover:underline shrink-0">
          Ver página <ExternalLink size={12} aria-hidden />
        </a>
      </div>

      {!liberada ? (
        <p className="flex gap-2 font-body text-sm text-fg bg-surface border border-line rounded-card p-4">
          <AlertTriangle size={16} className="text-amber shrink-0 mt-0.5" aria-hidden />
          A personalização ainda não foi liberada nesta conta. Fala com o suporte do RÉGUA.
        </p>
      ) : (
        <>
          {/* Capa + logo */}
          <div>
            <span className={labelCls}>Capa e logo</span>
            <div className="relative h-36 rounded-card border border-line bg-surface-alt overflow-hidden">
              {capa
                ? <Image src={capa} alt="" fill sizes="512px" className="object-cover" />
                : <p className="absolute inset-x-0 top-5 px-4 text-center font-body text-xs text-fg-muted">Sem capa: aparece só o nome da barbearia</p>}
              <div className="absolute left-4 bottom-3 w-16 h-16 rounded-full border-2 border-bg bg-surface overflow-hidden flex items-center justify-center font-display text-xl font-semibold text-amber">
                {logo ? <Image src={logo} alt="" width={64} height={64} className="w-full h-full object-cover" /> : marca.nome.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <input ref={inputCapa} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => { enviar('capa', e.target.files?.[0]); e.target.value = '' }} />
              <input ref={inputLogo} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => { enviar('logo', e.target.files?.[0]); e.target.value = '' }} />
              <button type="button" className={btnSec} disabled={!!enviando} onClick={() => inputCapa.current?.click()}>
                <ImagePlus size={13} aria-hidden /> {enviando === 'capa' ? 'Enviando…' : capa ? 'Trocar capa' : 'Enviar capa'}
              </button>
              {capa && <button type="button" className={btnSec} disabled={!!enviando} onClick={() => remover('capa')}><Trash2 size={13} aria-hidden /> Tirar capa</button>}
              <button type="button" className={btnSec} disabled={!!enviando} onClick={() => inputLogo.current?.click()}>
                <ImagePlus size={13} aria-hidden /> {enviando === 'logo' ? 'Enviando…' : logo ? 'Trocar logo' : 'Enviar logo'}
              </button>
              {logo && <button type="button" className={btnSec} disabled={!!enviando} onClick={() => remover('logo')}><Trash2 size={13} aria-hidden /> Tirar logo</button>}
            </div>
            <p className="font-body text-xs text-fg-muted mt-2">JPG, PNG ou WEBP, até 2 MB. A capa fica melhor deitada; o logo, quadrado.</p>
          </div>

          {/* Cores */}
          <div className="grid grid-cols-2 gap-3">
            {([['Cor principal', primaria, setPrimaria, 'Botões, destaques e horário escolhido'], ['Cor secundária', secundaria, setSecundaria, 'Botão de confirmar e aviso de sucesso']] as const).map(([rotulo, valor, set, ajuda]) => (
              <label key={rotulo} className="block bg-surface border border-line rounded-card p-3 cursor-pointer">
                <span className="font-ui text-sm font-medium text-fg block">{rotulo}</span>
                <span className="flex items-center gap-2 mt-2">
                  <input type="color" value={valor} onChange={e => set(e.target.value.toUpperCase())} className="w-9 h-9 rounded-button bg-transparent border border-line cursor-pointer p-0.5" />
                  <span className="font-mono text-sm text-fg-muted">{valor.toUpperCase()}</span>
                </span>
                <span className="font-body text-xs text-fg-muted block mt-2">{ajuda}</span>
              </label>
            ))}
          </div>

          {/* Prévia com as cores já ajustadas */}
          <div className="rounded-card border border-line bg-bg p-4 space-y-3" style={tema.vars as React.CSSProperties} aria-label="Prévia das cores">
            <p className="font-ui text-xs uppercase tracking-wider text-fg-muted">Prévia</p>
            <div className="flex items-center justify-between bg-surface border border-line rounded-card px-4 py-3">
              <span className="font-ui text-sm font-semibold text-fg">Corte masculino</span>
              <span className="font-mono text-base text-amber">R$ 40,00</span>
            </div>
            <div className="flex gap-2">
              <span className="flex-1 text-center bg-amber text-accent-fg font-ui text-sm font-semibold py-2.5 rounded-button">Continuar</span>
              <span className="flex-1 text-center bg-verde text-verde-fg font-ui text-sm font-semibold py-2.5 rounded-button">Confirmar horário</span>
            </div>
          </div>
          {tema.ajustada && (
            <p className="flex gap-2 font-body text-xs text-fg-muted">
              <AlertTriangle size={13} className="text-amber shrink-0 mt-0.5" aria-hidden />
              A cor escolhida é escura demais pro fundo da página. Ela foi clareada na prévia pra continuar legível, e é assim que o cliente vê.
            </p>
          )}
          {!padrao && (
            <button type="button" onClick={() => { setPrimaria(PRIMARIA_PADRAO); setSecundaria(SECUNDARIA_PADRAO) }} className="font-body text-xs text-fg-muted underline underline-offset-2 hover:text-fg">
              Voltar pras cores padrão do RÉGUA
            </button>
          )}

          <div>
            <label className={labelCls} htmlFor="sobre">Sobre a barbearia</label>
            <textarea
              id="sobre" rows={3} maxLength={300} value={sobre} onChange={e => setSobre(e.target.value)}
              placeholder="Ambiente moderno, profissionais experientes e o melhor atendimento da região."
              className="w-full bg-surface border border-line rounded-button px-4 py-3 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber"
            />
            <p className="font-body text-xs text-fg-muted text-right">{sobre.length}/300</p>
          </div>

          <button type="button" onClick={salvar} disabled={salvando} className="font-semibold w-full flex items-center justify-center gap-2 bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm py-3 rounded-button transition-colors disabled:opacity-50">
            {salvo ? <><Check size={14} /> Salvo</> : salvando ? 'Salvando…' : 'Salvar cores e texto'}
          </button>
        </>
      )}
    </section>
    </div>
  )
}
