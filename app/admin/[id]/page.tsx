import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft, ExternalLink, MessageCircle, Mail } from 'lucide-react'
import { criarClienteServico } from '@/lib/supabase/server'
import { adminLogado, PLANOS_ADMIN, STATUS_ADMIN, type PlanoPago } from '@/lib/admin'
import { formatBRL } from '@/lib/utils'
import { urlDoSiteAtual } from '@/lib/site-url'
import AcoesBarbearia from './acoes'

const DIA = 86_400_000
const data = (iso: string | null) => iso
  ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: 'short', year: 'numeric' })
  : '—'
const dataHora = (iso: string | null) => iso
  ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  : 'nunca'

const ACAO_TEXTO: Record<string, string> = {
  estender_teste: 'Estendeu o teste',
  ativar_plano: 'Ativou plano',
  suspender: 'Suspendeu (só leitura)',
  cancelar: 'Cancelou',
  reativar: 'Reativou',
}

export default async function AdminBarbeariaPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await adminLogado())) redirect('/admin/login')
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()

  const db = criarClienteServico()
  const trintaDias = new Date(Date.now() - 30 * DIA).toISOString()

  const [{ data: b }, { data: equipe }, { count: nClientes }, { count: nServicos }, { data: ags }, { data: log }] = await Promise.all([
    db.from('barbearias').select('id, nome, slug, telefone, endereco, instagram, plano, status, trial_fim, criado_em').eq('id', id).maybeSingle(),
    db.from('usuarios').select('nome, email, whatsapp, papel, status, ativo, ultimo_acesso').eq('barbearia_id', id).in('papel', ['dono', 'barbeiro']).order('papel'),
    db.from('usuarios').select('id', { count: 'exact', head: true }).eq('barbearia_id', id).eq('papel', 'cliente'),
    db.from('servicos').select('id', { count: 'exact', head: true }).eq('barbearia_id', id).eq('ativo', true),
    db.from('agendamentos').select('status, valor_servico, criado_por, cliente_id').eq('barbearia_id', id).gte('inicio', trintaDias),
    db.from('admin_log').select('acao, detalhe, criado_em').eq('barbearia_id', id).order('criado_em', { ascending: false }).limit(20),
  ])
  if (!b) notFound()

  const dono = (equipe ?? []).find(u => u.papel === 'dono')
  const barbeiros = (equipe ?? []).filter(u => u.papel === 'barbeiro')
  const lista = ags ?? []
  const concluidos = lista.filter(a => a.status === 'concluido')
  const faturado = concluidos.reduce((t, a) => t + Number(a.valor_servico), 0)
  const peloLink = lista.filter(a => a.criado_por === a.cliente_id).length
  const faltas = lista.filter(a => a.status === 'faltou').length
  const ultimoAcesso = (equipe ?? []).map(u => u.ultimo_acesso).filter(Boolean).sort().pop() ?? null
  const st = STATUS_ADMIN[b.status] ?? { rotulo: b.status, cor: 'text-fg-muted border-line' }
  const diasTeste = Math.ceil((new Date(b.trial_fim).getTime() - Date.now()) / DIA)
  const site = await urlDoSiteAtual()
  const wa = (n: string, t: string) => `https://wa.me/55${n.replace(/\D/g, '').replace(/^55/, '')}?text=${encodeURIComponent(t)}`

  const card = 'bg-surface border border-line rounded-card p-4'
  const rotulo = 'font-ui text-xs uppercase tracking-wider text-fg-muted'

  return (
    <div className="min-h-screen bg-bg px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <Link href="/admin" className="inline-flex items-center gap-1 font-ui text-xs uppercase tracking-wider text-fg-muted hover:text-fg">
          <ChevronLeft size={15} /> Todas as barbearias
        </Link>

        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-3xl uppercase tracking-wide text-fg break-words">{b.nome}</h1>
            <a href={`${site}/${b.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-amber hover:underline">
              /{b.slug} <ExternalLink size={11} />
            </a>
          </div>
          <span className={`shrink-0 px-3 py-1 rounded-full border font-ui text-xs uppercase tracking-wider ${st.cor}`}>
            {b.status === 'ativo' ? `Pagando · ${PLANOS_ADMIN[b.plano as PlanoPago]?.nome ?? b.plano}` : st.rotulo}
          </span>
        </div>

        <p className="font-body text-sm text-fg-muted">
          Cadastrada em {data(b.criado_em)}
          {b.status === 'trial' && <> · teste {diasTeste > 0 ? `acaba em ${diasTeste} dia${diasTeste > 1 ? 's' : ''} (${data(b.trial_fim)})` : `acabou em ${data(b.trial_fim)}`}</>}
          {b.status === 'ativo' && <> · {formatBRL(PLANOS_ADMIN[b.plano as PlanoPago]?.preco ?? 0)}/mês</>}
        </p>

        {/* Uso nos últimos 30 dias */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { r: 'Agendamentos', v: String(lista.length), d: `${peloLink} pelo link` },
            { r: 'Concluídos', v: String(concluidos.length), d: `${faltas} falta${faltas !== 1 ? 's' : ''}` },
            { r: 'Faturado', v: formatBRL(faturado), d: 'nos atendimentos' },
            { r: 'Último acesso', v: dataHora(ultimoAcesso), d: 'dono ou barbeiro' },
          ].map(c => (
            <div key={c.r} className={card}>
              <p className={rotulo}>{c.r}</p>
              <p className="font-mono text-lg text-fg mt-1 whitespace-nowrap">{c.v}</p>
              <p className="font-body text-[11px] text-fg-muted">{c.d}</p>
            </div>
          ))}
        </section>
        <p className="font-body text-[11px] text-fg-muted -mt-2">Números dos últimos 30 dias · {nClientes ?? 0} clientes cadastrados · {nServicos ?? 0} serviços ativos</p>

        {/* Contato */}
        <section className={`${card} space-y-3`}>
          <p className={rotulo}>Contato</p>
          <div className="space-y-1 font-body text-sm">
            <p className="text-fg">{dono?.nome ?? '—'} <span className="text-fg-muted">(dono)</span></p>
            {dono?.email && <p className="text-fg-muted">{dono.email}</p>}
            {b.telefone && <p className="text-fg-muted">{b.telefone}</p>}
            {b.endereco && <p className="text-fg-muted">{b.endereco}</p>}
            {b.instagram && <p className="text-fg-muted">@{b.instagram.replace('@', '')}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {b.telefone && (
              <a href={wa(b.telefone, `Oi, ${dono?.nome?.split(' ')[0] ?? ''}! Aqui é do RÉGUA. Tudo certo com o sistema?`)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-button border border-entrada/40 text-entrada font-ui text-xs uppercase tracking-wider hover:bg-entrada/10">
                <MessageCircle size={13} /> WhatsApp
              </a>
            )}
            {dono?.email && (
              <a href={`mailto:${dono.email}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-button border border-line text-fg-muted font-ui text-xs uppercase tracking-wider hover:text-fg">
                <Mail size={13} /> E-mail
              </a>
            )}
          </div>
        </section>

        {/* Equipe */}
        <section className={card}>
          <p className={`${rotulo} mb-2`}>Equipe ({barbeiros.filter(x => x.ativo && x.status === 'aprovado').length} barbeiro{barbeiros.length !== 1 ? 's' : ''} ativo{barbeiros.length !== 1 ? 's' : ''})</p>
          {barbeiros.length === 0 ? (
            <p className="font-body text-sm text-fg-muted">Nenhum barbeiro convidado — o dono atende sozinho ou ainda não configurou.</p>
          ) : (
            <ul className="divide-y divide-line">
              {barbeiros.map((u, i) => (
                <li key={i} className="flex items-center justify-between py-2 font-body text-sm">
                  <span className={u.ativo ? 'text-fg' : 'text-fg-muted line-through'}>{u.nome}</span>
                  <span className="text-xs text-fg-muted">{!u.ativo ? 'removido' : u.status === 'pendente' ? 'esperando aprovação' : `acesso ${dataHora(u.ultimo_acesso)}`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Ações */}
        <AcoesBarbearia barbearia={{ id: b.id, nome: b.nome, slug: b.slug, status: b.status, plano: b.plano }} />

        {/* Histórico do admin */}
        {(log ?? []).length > 0 && (
          <section className={card}>
            <p className={`${rotulo} mb-2`}>O que você já fez aqui</p>
            <ul className="space-y-1.5">
              {(log ?? []).map((l, i) => {
                const det = (l.detalhe ?? {}) as { dias?: number; depois?: { plano?: string } }
                const extra = l.acao === 'estender_teste' && det.dias ? ` (+${det.dias} dias)`
                  : l.acao === 'ativar_plano' && det.depois?.plano ? ` (${PLANOS_ADMIN[det.depois.plano as PlanoPago]?.nome ?? det.depois.plano})` : ''
                return (
                  <li key={i} className="flex justify-between gap-3 font-body text-sm">
                    <span className="text-fg">{ACAO_TEXTO[l.acao] ?? l.acao}{extra}</span>
                    <span className="text-xs text-fg-muted shrink-0">{dataHora(l.criado_em)}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
