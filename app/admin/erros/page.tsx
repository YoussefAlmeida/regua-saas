import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { criarClienteServico } from '@/lib/supabase/server'
import { adminLogado } from '@/lib/admin'
import ListaErros, { type ErroSistema } from '../lista-erros'

/* Todos os erros do sistema, de todas as barbearias */
export default async function ErrosPage({ searchParams }: { searchParams: Promise<{ todos?: string }> }) {
  if (!(await adminLogado())) redirect('/admin/login')
  const todos = (await searchParams).todos === '1'

  const db = criarClienteServico()
  let q = db.from('erros_sistema')
    .select('id, onde, codigo, mensagem, detalhe, resolvido, criado_em, barbearia_id')
    .order('criado_em', { ascending: false })
    .limit(150)
  if (!todos) q = q.eq('resolvido', false)
  const [{ data: erros }, { data: barbearias }] = await Promise.all([q, db.from('barbearias').select('id, nome')])

  const nomes = new Map((barbearias ?? []).map(b => [b.id, b.nome]))
  const lista: ErroSistema[] = (erros ?? []).map(e => ({ ...e, barbearia_nome: e.barbearia_id ? nomes.get(e.barbearia_id) ?? 'Barbearia apagada' : null }))

  const chip = (ativo: boolean) => `px-3 py-1.5 rounded-full border font-ui text-[11px] uppercase tracking-wider ${ativo ? 'bg-amber text-accent-fg border-amber' : 'border-line text-fg-muted hover:text-fg'}`

  return (
    <div className="min-h-screen bg-bg px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <Link href="/admin" className="inline-flex items-center gap-1 font-ui text-xs uppercase tracking-wider text-fg-muted hover:text-fg">
          <ChevronLeft size={15} /> Todas as barbearias
        </Link>
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-fg">Erros do sistema</h1>
          <p className="font-body text-sm text-fg-muted">Tudo que deu errado, em todas as barbearias. Toca num erro pra ver o motivo.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/erros" className={chip(!todos)}>Abertos</Link>
          <Link href="/admin/erros?todos=1" className={chip(todos)}>Todos</Link>
        </div>
        <ListaErros erros={lista} mostrarBarbearia />
      </div>
    </div>
  )
}
