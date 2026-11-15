import { CheckCircle2, AlertTriangle, CircleDashed } from 'lucide-react'
import { verificarSaude } from '@/lib/saude'

export default async function SaudeSistema() {
  const { itens, semFuncao } = await verificarSaude()
  const graves = itens.filter(i => !i.ok && i.grave)
  const avisos = itens.filter(i => !i.ok && !i.grave)
  const tudoOk = graves.length === 0 && avisos.length === 0 && !semFuncao

  return (
    <details open={graves.length > 0} className={`rounded-card border ${graves.length ? 'border-saida/40 bg-saida/5' : 'border-line bg-surface'}`}>
      <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none">
        {graves.length
          ? <AlertTriangle size={15} className="text-saida" />
          : <CheckCircle2 size={15} className={tudoOk ? 'text-entrada' : 'text-amber'} />}
        <span className="font-ui text-xs uppercase tracking-wider text-fg">Saúde do sistema</span>
        <span className="font-body text-xs text-fg-muted ml-auto">
          {graves.length ? `${graves.length} problema${graves.length > 1 ? 's' : ''} sério${graves.length > 1 ? 's' : ''}` : avisos.length ? `${avisos.length} pendente${avisos.length > 1 ? 's' : ''}` : 'tudo certo'}
        </span>
      </summary>
      <ul className="px-4 pb-4 space-y-2">
        {semFuncao && (
          <li className="flex gap-2 font-body text-xs text-fg-muted">
            <CircleDashed size={14} className="shrink-0 mt-0.5" />
            Pra checar tudo, rode no Supabase o arquivo supabase/migrations/20261014000000_saude.sql
          </li>
        )}
        {itens.map(i => (
          <li key={i.nome} className="flex gap-2">
            {i.ok
              ? <CheckCircle2 size={14} className="text-entrada shrink-0 mt-0.5" />
              : <AlertTriangle size={14} className={`${i.grave ? 'text-saida' : 'text-amber'} shrink-0 mt-0.5`} />}
            <div className="min-w-0">
              <p className={`font-body text-sm ${i.ok ? 'text-fg-muted' : 'text-fg'}`}>{i.nome}</p>
              {!i.ok && i.oQueFazer && <p className="font-body text-xs text-fg-muted break-words">{i.oQueFazer}</p>}
            </div>
          </li>
        ))}
      </ul>
    </details>
  )
}
