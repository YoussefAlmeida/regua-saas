'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { avisar, erroDaResposta } from '@/components/aviso'
import { pedirSenha } from '@/components/confirmar-senha'
import AvisarCancelados, { type Cancelado } from '@/components/avisar-cancelados'

export interface PessoaAgenda {
  alvo: string        // 'eu' ou id do usuário barbeiro
  nome: string
  naAgenda: boolean
  souEu: boolean
}

/* ================================================================
   Quem aparece na agenda — um liga/desliga por pessoa.
   Desligar: some da página de agendamento e os horários futuros
   são cancelados (com senha, se houver algum). A conta e o
   histórico continuam. Ligar respeita o limite do plano.
   ================================================================ */
export default function ListaAgenda({ pessoas, max }: { pessoas: PessoaAgenda[]; max: number | null }) {
  const router = useRouter()
  const [lista, setLista] = useState(pessoas)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [cancelados, setCancelados] = useState<Cancelado[] | null>(null)

  const naAgenda = lista.filter(p => p.naAgenda).length
  const cheio = max !== null && naAgenda >= max

  async function alternar(p: PessoaAgenda) {
    const ligar = !p.naAgenda
    let senha: string | null = null

    if (!ligar) {
      setOcupado(p.alvo)
      const prev = await fetch(`/api/painel/na-agenda?alvo=${p.alvo}`).then(r => r.ok ? r.json() : { futuros: 0 }).catch(() => ({ futuros: 0 }))
      setOcupado(null)
      if (prev.futuros > 0) {
        senha = await pedirSenha(
          p.souEu ? 'Sair da agenda' : `Tirar ${p.nome} da agenda`,
          `${p.souEu ? 'Você tem' : `${p.nome} tem`} ${prev.futuros} horário${prev.futuros > 1 ? 's' : ''} marcado${prev.futuros > 1 ? 's' : ''} pela frente. Eles serão cancelados e a gente te mostra quem avisar.`,
        )
        if (!senha) return
      }
    }

    setOcupado(p.alvo)
    const res = await fetch('/api/painel/na-agenda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alvo: p.alvo, naAgenda: ligar, senha }),
    }).catch(() => null)
    setOcupado(null)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    const json = await res.json()

    setLista(prev => prev.map(x => x.alvo === p.alvo ? { ...x, naAgenda: ligar } : x))
    if (json.cancelados?.length) setCancelados(json.cancelados)
    else avisar(ligar ? `${p.souEu ? 'Você está' : `${p.nome} está`} na agenda.` : `${p.souEu ? 'Você saiu' : `${p.nome} saiu`} da agenda.`, 'sucesso')
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
                  {p.naAgenda ? 'Aparece pros clientes' : travado ? 'Sem vaga no plano' : 'Fora da agenda'}
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
      {cancelados && <AvisarCancelados lista={cancelados} onFechar={() => setCancelados(null)} />}
    </>
  )
}
