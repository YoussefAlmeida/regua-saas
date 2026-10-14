import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, ShieldCheck } from 'lucide-react'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'

/* Histórico (log de auditoria) — "quem lançou, quem apagou, quem mudou valor".
   Só o dono vê. Nada aqui pode ser editado ou apagado pelo painel. */

type Json = Record<string, unknown> | null
interface Linha {
  id: string
  acao: string
  tabela: string
  valor_antes: Json
  valor_depois: Json
  criado_em: string
  usuario: { nome: string; papel: string } | { nome: string; papel: string }[] | null
}

const brl = (v: unknown) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const STATUS: Record<string, string> = {
  agendado: 'reabriu', confirmado: 'confirmou', concluido: 'concluiu', faltou: 'marcou falta em', cancelado: 'cancelou',
}

function descrever(l: Linha): { texto: string; alerta: boolean } {
  const a = l.valor_antes ?? {}, d = l.valor_depois ?? {}
  switch (`${l.tabela}:${l.acao.split(':')[0]}`) {
    case 'movimentacoes:criar':
      return { texto: `lançou ${d.tipo === 'entrada' ? 'entrada' : 'saída'} de ${brl(d.valor)} — ${d.descricao}`, alerta: false }
    case 'movimentacoes:editar': {
      const partes = []
      if (d.valor !== undefined && d.valor !== a.valor) partes.push(`valor de ${brl(a.valor)} para ${brl(d.valor)}`)
      if (d.descricao !== undefined && d.descricao !== a.descricao) partes.push(`descrição para "${d.descricao}"`)
      if (d.data !== undefined && d.data !== a.data) partes.push(`data para ${String(d.data).split('-').reverse().join('/')}`)
      return { texto: `editou lançamento "${a.descricao}": ${partes.join(', ') || 'sem mudança'}`, alerta: true }
    }
    case 'movimentacoes:apagar':
      return { texto: `apagou ${a.tipo === 'entrada' ? 'entrada' : 'saída'} de ${brl(a.valor)} — ${a.descricao}`, alerta: true }
    case 'movimentacoes:exportar':
      return { texto: `exportou o extrato de ${d.mes}`, alerta: false }
    case 'agendamentos:status': {
      const novo = String(d.status)
      const extra = d.entrada === 'removida' ? ' (entrada saiu do caixa)' : d.entrada === 'lancada' ? ' (entrada lançada)' : ''
      return { texto: `${STATUS[novo] ?? 'mudou'} um atendimento${a.status === 'concluido' ? ' que estava concluído' : ''}${extra}`, alerta: a.status === 'concluido' }
    }
    case 'agendamentos:criar':
      return { texto: `marcou um horário${d.origem === 'link' ? ' pelo link' : ''}`, alerta: false }
    case 'bloqueios_agenda:criar': return { texto: 'bloqueou um horário na agenda', alerta: false }
    case 'bloqueios_agenda:apagar': return { texto: 'liberou um horário bloqueado', alerta: false }
    case 'horarios_trabalho:editar': return { texto: 'mudou o horário de trabalho', alerta: false }
    case 'despesas_fixas:apagar': return { texto: `apagou a despesa fixa "${a.descricao}"`, alerta: true }
    case 'usuarios:aprovar': return { texto: 'aprovou um barbeiro na equipe', alerta: false }
    case 'usuarios:link_nova_senha': return { texto: `gerou link de senha nova pra ${d.para ?? 'alguém'}`, alerta: false }
    case 'usuarios:nova_senha': return { texto: 'criou uma senha nova pelo link', alerta: false }
    case 'usuarios:remover': return { texto: `removeu um barbeiro (${d.agendamentos_cancelados ?? 0} horários cancelados)`, alerta: true }
    default: return { texto: `${l.acao} em ${l.tabela}`, alerta: false }
  }
}

export default async function HistoricoPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const sessao = await getSessao()
  if (!sessao) redirect('/entrar')
  if (sessao.papel !== 'dono') redirect('/painel/mais')

  const filtro = (await searchParams).f === 'dinheiro' ? 'dinheiro' : 'tudo'

  let q = criarClienteServico()
    .from('auditoria')
    .select('id, acao, tabela, valor_antes, valor_depois, criado_em, usuario:usuarios!usuario_id(nome, papel)')
    .eq('barbearia_id', sessao.barbearia_id)
    .order('criado_em', { ascending: false })
    .limit(150)
  if (filtro === 'dinheiro') q = q.in('tabela', ['movimentacoes', 'despesas_fixas'])

  const { data } = await q
  const linhas = (data ?? []) as unknown as Linha[]

  const porDia = new Map<string, Linha[]>()
  for (const l of linhas) {
    const dia = new Date(l.criado_em).toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
    porDia.set(dia, [...(porDia.get(dia) ?? []), l])
  }

  const chip = (ativo: boolean) => `px-3 py-1.5 rounded-full border font-ui text-[11px] uppercase tracking-wider ${ativo ? 'bg-amber text-accent-fg border-amber' : 'border-line text-fg-muted'}`

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/painel/mais" className="text-fg-muted hover:text-fg" aria-label="Voltar"><ChevronLeft size={20} /></Link>
        <div>
          <h1 className="font-ui text-xl uppercase tracking-widest text-fg">Histórico</h1>
          <p className="font-body text-xs text-fg-muted">Quem lançou, quem apagou, quem mudou valor</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Link href="/painel/mais/historico" className={chip(filtro === 'tudo')}>Tudo</Link>
        <Link href="/painel/mais/historico?f=dinheiro" className={chip(filtro === 'dinheiro')}>Só dinheiro</Link>
      </div>

      {linhas.length === 0 ? (
        <div className="text-center py-16">
          <ShieldCheck size={32} strokeWidth={1.5} className="mx-auto text-fg-muted opacity-50 mb-3" />
          <p className="font-body text-sm text-fg-muted">Nada registrado ainda. Toda mudança no caixa e na agenda aparece aqui.</p>
        </div>
      ) : [...porDia.entries()].map(([dia, lista]) => (
        <section key={dia}>
          <p className="font-ui text-[11px] uppercase tracking-wider text-fg-muted mb-1.5 px-1">
            {new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
          <ul className="bg-surface border border-line rounded-card divide-y divide-line">
            {lista.map(l => {
              const u = Array.isArray(l.usuario) ? l.usuario[0] : l.usuario
              const { texto, alerta } = descrever(l)
              const hora = new Date(l.criado_em).toLocaleTimeString('pt-BR', { timeZone: 'America/Bahia', hour: '2-digit', minute: '2-digit' })
              return (
                <li key={l.id} className="flex gap-3 px-4 py-3">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${alerta ? 'bg-saida' : 'bg-line'}`} />
                  <p className="flex-1 font-body text-sm text-fg">
                    <strong className="font-semibold">{u?.nome ?? 'Alguém'}</strong>
                    {u?.papel && u.papel !== 'dono' && <span className="text-fg-muted"> ({u.papel})</span>} {texto}
                  </p>
                  <span className="font-mono text-xs text-fg-muted shrink-0 mt-0.5">{hora}</span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
