'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import AvisarCancelados, { type Cancelado } from '@/components/avisar-cancelados'

interface Aviso { de: string; para: string; saiu: string[]; cancelados: Cancelado[] }

/* ================================================================
   Avisos do plano que o dono PRECISA ver:
   1. "Seu plano mudou" (depois da troca no fim do mês), com a lista
      de clientes pra avisar
   2. Equipe acima do limite (ex.: plano mudou pelo suporte): escolher
      quem fica antes de seguir — ninguém é tirado sozinho
   ================================================================ */
export default function PlanoDono({ aviso, excedente, max, plano }: {
  aviso: Aviso | null
  excedente: number
  max: number | null
  plano: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [vistoAviso, setVistoAviso] = useState(false)

  async function fecharAviso() {
    setVistoAviso(true)
    await fetch('/api/painel/plano/aviso', { method: 'DELETE' }).catch(() => null)
    router.refresh()
  }

  if (aviso && !vistoAviso) {
    const texto = `Você está no ${aviso.para} agora.${aviso.saiu.length ? ` ${aviso.saiu.join(', ')} saiu da agenda (continua na equipe).` : ''}${
      aviso.cancelados.length ? ` ${aviso.cancelados.length} horário${aviso.cancelados.length > 1 ? 's foram cancelados' : ' foi cancelado'}: manda uma mensagem pra remarcar.` : ''}`
    if (aviso.cancelados.length) {
      return <AvisarCancelados titulo={`Plano ${aviso.para}`} texto={texto} lista={aviso.cancelados} onFechar={fecharAviso} />
    }
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative w-full max-w-md bg-surface rounded-t-card sm:rounded-card border border-line p-6 z-10 space-y-4">
          <h2 className="font-ui text-lg uppercase tracking-wider text-fg">Plano {aviso.para}</h2>
          <p className="font-body text-sm text-fg-muted">{texto}</p>
          <button onClick={fecharAviso} className="w-full bg-amber text-accent-fg font-ui text-xs uppercase tracking-wider py-3 rounded-button">Entendi</button>
        </div>
      </div>
    )
  }

  const liberadas = ['/painel/mais/ajustar-equipe', '/painel/mais/plano']
  if (excedente > 0 && !liberadas.some(p => pathname.startsWith(p))) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal>
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative w-full max-w-md bg-surface rounded-t-card sm:rounded-card border border-line p-6 z-10 space-y-4">
          <div className="w-11 h-11 rounded-full bg-amber/10 flex items-center justify-center">
            <Users size={20} className="text-amber" />
          </div>
          <h2 className="font-ui text-lg uppercase tracking-wider text-fg">Escolha quem fica na agenda</h2>
          <p className="font-body text-sm text-fg-muted">
            O plano {plano} vai até {max} na agenda e hoje tem {excedente + (max ?? 0)}. Desligue {excedente === 1 ? '1 pessoa' : `${excedente} pessoas`} ou
            mude de plano. Quem sai continua na equipe, com conta e histórico.
          </p>
          <Link href="/painel/mais/ajustar-equipe" className="block text-center bg-amber text-accent-fg font-ui text-xs uppercase tracking-wider py-3 rounded-button">
            Escolher quem fica
          </Link>
          <Link href="/painel/mais/plano" className="block text-center border border-line text-fg font-ui text-xs uppercase tracking-wider py-3 rounded-button">
            Ver planos
          </Link>
        </div>
      </div>
    )
  }
  return null
}
