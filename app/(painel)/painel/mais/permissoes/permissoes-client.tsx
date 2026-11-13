'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'
import { PERMISSOES, CHAVES, type PermissoesEquipe } from '@/lib/permissoes-equipe-def'

export default function PermissoesClient({ iniciais }: { iniciais: PermissoesEquipe }) {
  const [p, setP] = useState(iniciais)
  const [salvando, setSalvando] = useState(false)
  const mudou = CHAVES.some(k => p[k] !== iniciais[k])

  async function salvar() {
    setSalvando(true)
    const res = await fetch('/api/painel/barbearia/permissoes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).catch(() => null)
    setSalvando(false)
    if (!res) { avisar('Sem conexão. Confere a internet e tenta de novo.', 'erro'); return }
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    avisar('Permissões salvas. Já valem pra equipe.', 'sucesso')
  }

  return (
    <>
      <ul className="ds-card divide-y divide-line">
        {CHAVES.map(k => (
          <li key={k} className="flex items-center gap-4 px-4 py-3.5">
            <div className="flex-1 min-w-0">
              <p className="font-ui text-sm font-semibold text-fg">{PERMISSOES[k].rotulo}</p>
              <p className="font-body text-xs text-fg-muted">{PERMISSOES[k].descricao}</p>
            </div>
            <button type="button" role="switch" aria-checked={p[k]} aria-label={PERMISSOES[k].rotulo} onClick={() => setP(x => ({ ...x, [k]: !x[k] }))}
              className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${p[k] ? 'bg-amber' : 'bg-line'}`}>
              <span className={`absolute left-0 top-0.5 w-5 h-5 rounded-full transition-transform ${p[k] ? 'translate-x-[22px] bg-accent-fg' : 'translate-x-0.5 bg-fg'}`} />
            </button>
          </li>
        ))}
      </ul>
      <button onClick={salvar} disabled={salvando || !mudou} className="ds-btn-primary w-full"><Check size={15} aria-hidden /> {salvando ? 'Salvando…' : 'Salvar permissões'}</button>
    </>
  )
}
