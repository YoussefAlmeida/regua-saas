'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'

export interface ErroSistema {
  id: string
  onde: string
  codigo: string | null
  mensagem: string | null
  detalhe: Record<string, unknown> | null
  resolvido: boolean
  criado_em: string
  barbearia_id: string | null
  barbearia_nome?: string | null
}

/* Tradução dos códigos mais comuns pra dizer O QUE fazer */
const DICA: Record<string, string> = {
  '42703': 'Coluna não existe no banco → falta rodar uma atualização (veja Saúde do sistema).',
  '42P01': 'Tabela não existe no banco → falta rodar uma atualização (veja Saúde do sistema).',
  '42883': 'Função não existe no banco → falta rodar uma atualização (veja Saúde do sistema).',
  '23505': 'Registro repetido (ex.: mesmo WhatsApp ou e-mail já cadastrado).',
  '23503': 'Ligação entre dados quebrada (algo apontando pra um registro que não existe).',
  '23514': 'Valor fora do permitido pelo banco.',
  'PGRST116': 'Era pra achar 1 registro e achou 0 ou mais de 1.',
  '401': 'Sem permissão / chave inválida (confira as variáveis da Vercel).',
  '500': 'Falha no servidor.',
}

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function ListaErros({ erros, barbearia_id, mostrarBarbearia = false }: {
  erros: ErroSistema[]
  barbearia_id?: string
  mostrarBarbearia?: boolean
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const abertos = erros.filter(e => !e.resolvido)

  async function marcar(corpo: Record<string, unknown>) {
    setOcupado(true)
    await fetch('/api/admin/erros', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }).catch(() => null)
    setOcupado(false)
    router.refresh()
  }

  if (erros.length === 0) {
    return <p className="font-body text-sm text-fg-muted text-center py-8">Nenhum erro registrado. 🎉</p>
  }

  return (
    <div className="space-y-3">
      {abertos.length > 1 && (
        <button disabled={ocupado} onClick={() => marcar(barbearia_id ? { barbearia_id } : { todos: true })}
          className="font-ui text-[11px] uppercase tracking-wider text-fg-muted hover:text-entrada disabled:opacity-40">
          Marcar os {abertos.length} como resolvidos
        </button>
      )}
      <ul className="bg-surface border border-line rounded-card divide-y divide-line">
        {erros.map(e => {
          const dica = e.codigo ? DICA[e.codigo] : undefined
          const exp = aberto === e.id
          return (
            <li key={e.id} className={e.resolvido ? 'opacity-50' : ''}>
              <button onClick={() => setAberto(exp ? null : e.id)} className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-alt">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${e.resolvido ? 'bg-line' : 'bg-saida'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-fg">
                    {e.onde}{e.codigo && <span className="font-mono text-xs text-fg-muted"> · {e.codigo}</span>}
                  </p>
                  <p className="font-body text-xs text-fg-muted truncate">
                    {mostrarBarbearia && (e.barbearia_nome ?? 'Sem barbearia') + ' · '}{quando(e.criado_em)}
                    {e.resolvido && ' · resolvido'}
                  </p>
                </div>
                {exp ? <ChevronDown size={15} className="text-fg-muted mt-1" /> : <ChevronRight size={15} className="text-fg-muted mt-1" />}
              </button>
              {exp && (
                <div className="px-4 pb-4 pl-9 space-y-2">
                  {dica && <p className="font-body text-sm text-amber">{dica}</p>}
                  {e.mensagem && <p className="font-mono text-xs text-fg-muted break-words bg-bg border border-line rounded-button p-2">{e.mensagem}</p>}
                  {e.detalhe && Object.keys(e.detalhe).length > 0 && (
                    <pre className="font-mono text-[11px] text-fg-muted whitespace-pre-wrap break-words bg-bg border border-line rounded-button p-2">{JSON.stringify(e.detalhe, null, 2)}</pre>
                  )}
                  <div className="flex gap-3">
                    <button disabled={ocupado} onClick={() => marcar({ ids: [e.id], resolvido: !e.resolvido })}
                      className="inline-flex items-center gap-1 font-ui text-[11px] uppercase tracking-wider text-fg-muted hover:text-entrada disabled:opacity-40">
                      {e.resolvido ? <><RotateCcw size={12} /> Reabrir</> : <><Check size={12} /> Resolvido</>}
                    </button>
                    {mostrarBarbearia && e.barbearia_id && (
                      <Link href={`/admin/${e.barbearia_id}?aba=erros`} className="font-ui text-[11px] uppercase tracking-wider text-amber hover:underline">Abrir pasta</Link>
                    )}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
