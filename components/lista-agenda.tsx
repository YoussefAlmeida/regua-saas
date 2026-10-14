'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { avisar, erroDaResposta } from '@/components/aviso'

export interface PessoaAgenda {
  alvo: string        // 'eu' ou id do usuário barbeiro
  nome: string
  naAgenda: boolean
  souEu: boolean
}

/* ================================================================
   Quem aparece na agenda — um liga/desliga por pessoa.
   Desligar: some da página de agendamento e não entra horário novo.
   O que já estava marcado continua e ele atende normal. A conta e
   o histórico continuam. Ligar respeita o limite do plano.
   ================================================================ */
export default function ListaAgenda({ pessoas, max }: { pessoas: PessoaAgenda[]; max: number | null }) {
  const router = useRouter()
  const [lista, setLista] = useState(pessoas)
  const [ocupado, setOcupado] = useState<string | null>(null)

  const naAgenda = lista.filter(p => p.naAgenda).length
  const cheio = max !== null && naAgenda >= max

  async function alternar(p: PessoaAgenda) {
    const ligar = !p.naAgenda
    setOcupado(p.alvo)
    const res = await fetch('/api/painel/na-agenda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alvo: p.alvo, naAgenda: ligar }),
    }).catch(() => null)
    setOcupado(null)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    const json = await res.json()

    setLista(prev => prev.map(x => x.alvo === p.alvo ? { ...x, naAgenda: ligar } : x))
    const quem = p.souEu ? 'Você' : p.nome
    if (ligar) avisar(`${quem} está na agenda.`, 'sucesso')
    else avisar(`${quem} saiu da agenda.${json.mantidos ? ` ${json.mantidos === 1 ? 'O horário já marcado continua' : `Os ${json.mantidos} horários já marcados continuam`}.` : ''}`, 'sucesso')
    router.refresh()
  }

  return (
    <>
      <div className="flex items-baseline justify-between mb-2">
        <p className="font-ui text-xs uppercase tracking-wider text-fg-muted">Na agenda</p>
        <p className={`font-ui text-xs uppercase tracking-wider ${max !== null && naAgenda > max ? 'text-saida' : 'text-fg-muted'}`}>
          {naAgenda}{max !== null ? ` de ${max}` : ''} {max === null && (naAgenda === 1 ? 'pessoa' : 'pessoas')}
        </p>
      </div>
      <ul className="bg-surface border border-line rounded-card divide-y divide-line">
        {lista.map(p => {
          const travado = !p.naAgenda && cheio
          return (
            <li key={p.alvo} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-9 h-9 rounded-full bg-surface-alt flex items-center justify-center font-display text-sm shrink-0 ${p.naAgenda ? 'text-amber' : 'text-fg-muted opacity-60'}`}>
                {p.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-ui text-sm uppercase tracking-wider truncate ${p.naAgenda ? 'text-fg' : 'text-fg-muted'}`}>
                  {p.nome}{p.souEu && <span className="normal-case"> (você)</span>}
                </p>
                <p className="font-body text-xs text-fg-muted">
                  {p.naAgenda ? 'Aparece pros clientes' : travado ? 'Fora da agenda · sem vaga no plano' : 'Fora da agenda · só o que já está marcado'}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={p.naAgenda}
                aria-label={`${p.nome} na agenda`}
                onClick={() => alternar(p)}
                disabled={ocupado !== null || travado}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-40 ${p.naAgenda ? 'bg-amber' : 'bg-surface-alt border border-line'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-fg transition-all ${p.naAgenda ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
