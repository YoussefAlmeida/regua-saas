'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserMinus, X } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'
import { pedirSenha } from '@/components/confirmar-senha'
import ContatoCliente from '@/components/contato-cliente'

interface Prof { id: string; nome: string; usuario_id: string; permitido: boolean; souEu: boolean }
interface Cancelado {
  id: string
  inicio: string
  cliente: { nome: string; whatsapp: string | null } | { nome: string; whatsapp: string | null }[] | null
  servico: { nome: string } | { nome: string }[] | null
}
const um = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

export default function AjustarEquipe({ profissionais, temExcedente }: { profissionais: Prof[]; temExcedente: boolean }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [cancelados, setCancelados] = useState<{ nome: string; lista: Cancelado[] } | null>(null)

  async function tirar(p: Prof) {
    const senha = await pedirSenha(
      p.souEu ? 'Parar de atender' : `Tirar ${p.nome} da agenda`,
      p.souEu
        ? 'Você sai da agenda e seus horários futuros são cancelados. Continua dono de tudo.'
        : 'Ele perde o acesso e os horários futuros dele são cancelados. O histórico fica guardado.',
    )
    if (!senha) return
    setOcupado(p.id)
    const res = await fetch(p.souEu ? '/api/painel/onboarding/eu-corto' : `/api/painel/equipe/${p.usuario_id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    }).catch(() => null)
    setOcupado(null)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    const json = await res.json()
    if (json.cancelados?.length) setCancelados({ nome: p.souEu ? 'Você' : p.nome, lista: json.cancelados })
    else avisar(`${p.souEu ? 'Você saiu' : `${p.nome} saiu`} da agenda.`, 'sucesso')
    router.refresh()
  }

  return (
    <>
      <ul className="bg-surface border border-line rounded-card divide-y divide-line">
        {profissionais.map(p => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-surface-alt flex items-center justify-center font-display text-sm text-amber shrink-0">
              {p.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-ui text-sm uppercase tracking-wider text-fg truncate">{p.nome}{p.souEu && <span className="text-fg-muted normal-case"> (você)</span>}</p>
              <p className={`font-body text-xs ${p.permitido ? 'text-entrada' : 'text-saida'}`}>
                {p.permitido ? 'Aparece pros clientes' : 'Pausado: fora do limite do plano'}
              </p>
            </div>
            {(temExcedente || !p.permitido) && (
              <button onClick={() => tirar(p)} disabled={ocupado === p.id}
                className="flex items-center gap-1 font-ui text-[11px] uppercase tracking-wider text-fg-muted hover:text-saida disabled:opacity-40">
                <UserMinus size={13} /> {p.souEu ? 'Parar de atender' : 'Tirar'}
              </button>
            )}
          </li>
        ))}
      </ul>

      {cancelados && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/60" onClick={() => setCancelados(null)} />
          <div className="relative w-full max-w-md bg-surface rounded-t-card border border-line p-6 z-10 max-h-[85dvh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-ui text-lg uppercase tracking-wider text-fg">Avise os clientes</h2>
              <button onClick={() => setCancelados(null)} aria-label="Fechar"><X size={18} className="text-fg-muted" /></button>
            </div>
            <p className="font-body text-sm text-fg-muted">
              {cancelados.lista.length} horário{cancelados.lista.length > 1 ? 's foram cancelados' : ' foi cancelado'}. Manda uma mensagem pra remarcar com quem ficou.
            </p>
            <ul className="divide-y divide-line">
              {cancelados.lista.map(c => {
                const cli = um(c.cliente), srv = um(c.servico)
                const q = new Date(c.inicio).toLocaleString('pt-BR', { timeZone: 'America/Bahia', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                return (
                  <li key={c.id} className="py-3 space-y-2">
                    <p className="font-body text-sm text-fg">{cli?.nome ?? 'Cliente'} <span className="text-fg-muted">· {srv?.nome} · {q}</span></p>
                    <ContatoCliente whatsapp={cli?.whatsapp} mensagem={`Oi, ${cli?.nome?.split(' ')[0] ?? ''}! Seu horário de ${q} precisou ser cancelado. Quer remarcar?`} />
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
