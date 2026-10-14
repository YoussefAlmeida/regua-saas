'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { avisar, erroDaResposta } from '@/components/aviso'

/** "Cancelar mudança" do plano agendado — continua no plano atual */
export default function CancelarMudanca({ className = '' }: { className?: string }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)

  async function cancelar() {
    setOcupado(true)
    const res = await fetch('/api/painel/plano/mudanca', { method: 'DELETE' }).catch(() => null)
    setOcupado(false)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    avisar('Mudança cancelada. Você continua no seu plano.', 'sucesso')
    router.refresh()
  }

  return (
    <button onClick={cancelar} disabled={ocupado} className={`font-ui text-[11px] uppercase tracking-wider disabled:opacity-40 ${className}`}>
      {ocupado ? 'Cancelando…' : 'Cancelar mudança'}
    </button>
  )
}
