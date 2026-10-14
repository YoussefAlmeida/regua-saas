'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, MinusCircle, CalendarX } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'
import { pedirSenha } from '@/components/confirmar-senha'
import { formatBRL } from '@/lib/utils'

interface Pessoa { id: string; nome: string; souEu: boolean; futuros: number }

const PASSOS = ['O que muda', 'Quem fica', 'Confirmar'] as const

/* Assistente: o que você perde → quem fica na agenda → resumo e senha */
export default function MudarPlano({ de, para, em, imediato, perde, pessoas }: {
  de: { nome: string; preco: number }
  para: { id: string; nome: string; preco: number; max: number | null }
  em: string
  imediato: boolean
  perde: string[]
  pessoas: Pessoa[]
}) {
  const router = useRouter()
  const precisaEscolher = para.max !== null && pessoas.length > para.max
  const [passo, setPasso] = useState(0)
  const [ficam, setFicam] = useState<string[]>(() => pessoas.slice(0, para.max ?? pessoas.length).map(p => p.id))
  const [enviando, setEnviando] = useState(false)

  const quando = new Date(em).toLocaleDateString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: 'long' })
  const saem = pessoas.filter(p => !ficam.includes(p.id))
  const horariosCancelados = saem.reduce((s, p) => s + p.futuros, 0)
  const passos = precisaEscolher ? PASSOS : PASSOS.filter(p => p !== 'Quem fica')
  const etapa = passos[passo]

  function alternar(id: string) {
    setFicam(prev => prev.includes(id)
      ? prev.filter(x => x !== id)
      : para.max !== null && prev.length >= para.max ? prev : [...prev, id])
  }

  async function confirmar() {
    const senha = await pedirSenha(`Mudar pro ${para.nome}`, imediato ? 'A mudança vale agora.' : `A mudança vale em ${quando}. Dá pra desistir até lá.`)
    if (!senha) return
    setEnviando(true)
    const res = await fetch('/api/painel/plano/mudanca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ para: para.id, manter: ficam, senha }),
    }).catch(() => null)
    setEnviando(false)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    avisar(imediato ? `Pronto, você está no ${para.nome}.` : `Agendado: você muda pro ${para.nome} em ${quando}.`, 'sucesso')
    router.push('/painel/mais/plano')
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {/* Passos */}
      <ol className="flex gap-2">
        {passos.map((p, i) => (
          <li key={p} className={`flex-1 h-1 rounded-full ${i <= passo ? 'bg-amber' : 'bg-surface-alt'}`} aria-label={p} />
        ))}
      </ol>
      <p className="font-ui text-xs uppercase tracking-wider text-fg-muted">Passo {passo + 1} de {passos.length} · {etapa}</p>

      {etapa === 'O que muda' && (
        <section className="space-y-4">
          <div className="bg-surface border border-line rounded-card p-4 space-y-1">
            <p className="font-body text-sm text-fg">
              De <strong>{de.nome}</strong> ({formatBRL(de.preco)}) pra <strong>{para.nome}</strong> ({formatBRL(para.preco)}) por mês.
            </p>
            <p className="font-body text-sm text-fg-muted">
              {imediato ? 'Vale agora.' : <>Você já pagou este mês, então tudo continua igual até <strong className="text-fg">{quando}</strong>.</>}
            </p>
          </div>
          {(perde.length > 0 || precisaEscolher) && (
            <div className="bg-surface border border-saida/30 rounded-card p-4 space-y-2">
              <p className="font-ui text-xs uppercase tracking-wider text-saida">Você deixa de ter</p>
              <ul className="space-y-1.5">
                {precisaEscolher && (
                  <li className="flex gap-2 font-body text-sm text-fg">
                    <MinusCircle size={14} className="text-saida shrink-0 mt-0.5" />
                    Mais de {para.max} na agenda (hoje tem {pessoas.length})
                  </li>
                )}
                {perde.map(item => (
                  <li key={item} className="flex gap-2 font-body text-sm text-fg">
                    <MinusCircle size={14} className="text-saida shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
              <p className="font-body text-xs text-fg-muted">Nada é apagado: se voltar pro {de.nome}, está tudo lá.</p>
            </div>
          )}
        </section>
      )}

      {etapa === 'Quem fica' && (
        <section className="space-y-3">
          <p className="font-body text-sm text-fg">
            O {para.nome} vai até <strong>{para.max}</strong> na agenda. Escolha quem continua atendendo
            <span className="text-fg-muted"> ({ficam.length} de {para.max})</span>.
          </p>
          <ul className="bg-surface border border-line rounded-card divide-y divide-line">
            {pessoas.map(p => {
              const fica = ficam.includes(p.id)
              const travado = !fica && para.max !== null && ficam.length >= para.max
              return (
                <li key={p.id}>
                  <button onClick={() => alternar(p.id)} disabled={travado} aria-pressed={fica}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left disabled:opacity-50">
                    <span className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${fica ? 'bg-amber border-amber' : 'border-line'}`}>
                      {fica && <Check size={13} className="text-accent-fg" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-ui text-sm uppercase tracking-wider text-fg truncate">
                        {p.nome}{p.souEu && <span className="normal-case text-fg-muted"> (você)</span>}
                      </span>
                      <span className="block font-body text-xs text-fg-muted">
                        {p.futuros ? `${p.futuros} horário${p.futuros > 1 ? 's' : ''} marcado${p.futuros > 1 ? 's' : ''} depois de ${quando}` : 'Nada marcado depois da troca'}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="font-body text-xs text-fg-muted">
            Quem sai continua na equipe, com conta e histórico, só não aparece pros clientes. Dá pra trocar depois em Equipe.
          </p>
        </section>
      )}

      {etapa === 'Confirmar' && (
        <section className="space-y-3">
          <div className="bg-surface border border-line rounded-card p-4 space-y-2 font-body text-sm text-fg">
            <p>Plano <strong>{para.nome}</strong> a partir de <strong>{imediato ? 'agora' : quando}</strong>, por {formatBRL(para.preco)}/mês.</p>
            {precisaEscolher && (
              <>
                <p>Ficam na agenda: <strong>{pessoas.filter(p => ficam.includes(p.id)).map(p => p.nome).join(', ') || 'ninguém'}</strong>.</p>
                {saem.length > 0 && <p className="text-fg-muted">Saem da agenda: {saem.map(p => p.nome).join(', ')}.</p>}
              </>
            )}
          </div>
          {horariosCancelados > 0 && (
            <div className="flex gap-2 bg-saida/5 border border-saida/30 rounded-card p-4">
              <CalendarX size={16} className="text-saida shrink-0 mt-0.5" />
              <p className="font-body text-sm text-fg">
                {horariosCancelados} horário{horariosCancelados > 1 ? 's' : ''} marcado{horariosCancelados > 1 ? 's' : ''} depois da troca
                {horariosCancelados > 1 ? ' serão cancelados' : ' será cancelado'}. No dia, a gente mostra a lista com o WhatsApp de cada cliente pra você remarcar.
              </p>
            </div>
          )}
          {!imediato && (
            <p className="font-body text-xs text-fg-muted">Mudou de ideia? Dá pra cancelar a mudança em Mais → Plano até {quando}.</p>
          )}
        </section>
      )}

      <div className="flex gap-3">
        {passo > 0 && (
          <button onClick={() => setPasso(passo - 1)} className="flex-1 border border-line text-fg font-ui text-xs uppercase tracking-wider py-3 rounded-button">
            Voltar
          </button>
        )}
        {passo < passos.length - 1 ? (
          <button
            onClick={() => setPasso(passo + 1)}
            disabled={etapa === 'Quem fica' && ficam.length === 0}
            className="flex-1 bg-amber hover:bg-accent-press text-accent-fg font-ui text-xs uppercase tracking-wider py-3 rounded-button disabled:opacity-40"
          >
            Continuar
          </button>
        ) : (
          <button onClick={confirmar} disabled={enviando}
            className="flex-1 bg-amber hover:bg-accent-press text-accent-fg font-ui text-xs uppercase tracking-wider py-3 rounded-button disabled:opacity-40">
            {enviando ? 'Salvando…' : imediato ? `Mudar pro ${para.nome}` : `Agendar pra ${quando}`}
          </button>
        )}
      </div>
    </div>
  )
}
