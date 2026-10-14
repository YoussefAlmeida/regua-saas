import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft, ExternalLink, MessageCircle, Mail } from 'lucide-react'
import { criarClienteServico } from '@/lib/supabase/server'
import { adminLogado, PLANOS_ADMIN, STATUS_ADMIN, type PlanoPago } from '@/lib/admin'
import { formatBRL } from '@/lib/utils'
import { urlDoSiteAtual } from '@/lib/site-url'
import AcoesBarbearia from './acoes'
import { planoParaProfissionais } from '@/lib/planos'
import LinkNovaSenha from '@/components/link-nova-senha'
import Avisos from '@/components/aviso'
import ListaErros, { type ErroSistema } from '../lista-erros'
import { descreverAuditoria, type LinhaAuditoria } from '@/lib/descrever-auditoria'
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'

const DIA = 86_400_000
const data = (iso: string | null) => iso
  ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: 'short', year: 'numeric' })
  : '—'
const dataHora = (iso: string | null) => iso
  ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  : 'nunca'

const ACAO_TEXTO: Record<string, string> = {
  estender_teste: 'Estendeu o teste',
  ativar_plano: 'Registrou pagamento',
  suspender: 'Suspendeu (só leitura)',
  cancelar: 'Cancelou',
  reativar: 'Reativou',
  link_nova_senha: 'Gerou link de senha nova pro dono',
}

type Aba = 'geral' | 'config' | 'erros' | 'atividade' | 'agenda'
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'geral', rotulo: 'Visão geral' },
  { id: 'config', rotulo: 'Configuração' },
  { id: 'erros', rotulo: 'Erros' },
  { id: 'atividade', rotulo: 'Atividade' },
  { id: 'agenda', rotulo: 'Agendamentos' },
]

export default async function AdminBarbeariaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string }> }) {
  if (!(await adminLogado())) redirect('/admin/login')
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()

  const pedida = (await searchParams).aba
  const aba: Aba = ABAS.some(a => a.id === pedida) ? pedida as Aba : 'geral'

  const db = criarClienteServico()
  const trintaDias = new Date(Date.now() - 30 * DIA).toISOString()

  const [{ data: b }, { data: equipe }, { count: nClientes }, { count: nServicos }, { data: ags }, { data: log }, { data: erros }, { count: nProfs }, { count: nHorariosProprios }, { count: nAgsTotal }, { count: nFixas }, { data: ciclo }] = await Promise.all([
    db.from('barbearias').select('id, nome, slug, telefone, endereco, instagram, plano, status, trial_fim, criado_em, horario_funcionamento').eq('id', id).maybeSingle(),
    db.from('usuarios').select('nome, email, whatsapp, papel, status, ativo, ultimo_acesso').eq('barbearia_id', id).in('papel', ['dono', 'barbeiro']).order('papel'),
    db.from('usuarios').select('id', { count: 'exact', head: true }).eq('barbearia_id', id).eq('papel', 'cliente'),
    db.from('servicos').select('id', { count: 'exact', head: true }).eq('barbearia_id', id).eq('ativo', true),
    db.from('agendamentos').select('status, valor_servico, criado_por, cliente_id').eq('barbearia_id', id).gte('inicio', trintaDias),
    db.from('admin_log').select('acao, detalhe, criado_em').eq('barbearia_id', id).order('criado_em', { ascending: false }).limit(20),
    db.from('erros_sistema').select('id, onde, codigo, mensagem, detalhe, resolvido, criado_em, barbearia_id').eq('barbearia_id', id).order('criado_em', { ascending: false }).limit(60),
    db.from('profissionais').select('id', { count: 'exact', head: true }).eq('barbearia_id', id).eq('ativo', true),
    db.from('horarios_trabalho').select('id, profissional:profissionais!inner(barbearia_id)', { count: 'exact', head: true }).eq('profissional.barbearia_id', id),
    db.from('agendamentos').select('id', { count: 'exact', head: true }).eq('barbearia_id', id),
    db.from('despesas_fixas').select('id', { count: 'exact', head: true }).eq('barbearia_id', id),
    // Separado: sem a migração do ciclo, a pasta abre do mesmo jeito
    db.from('barbearias').select('plano_ciclo_fim, plano_agendado, plano_agendado_em, indicada_por').eq('id', id).maybeSingle(),
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

  // ── Checklist de configuração ─────────────────────────────
  type Nivel = 'ok' | 'grave' | 'aviso' | 'dica'
  const hf = (b.horario_funcionamento ?? {}) as Record<string, { ativo?: boolean }>
  const diasAbertos = Object.values(hf).filter(d => d?.ativo).length
  const pendentes = barbeiros.filter(x => x.ativo && x.status === 'pendente').length
  const semAcesso7 = !ultimoAcesso || Date.now() - new Date(ultimoAcesso).getTime() > 7 * DIA
  const checklist: { nivel: Nivel; titulo: string; detalhe: string }[] = [
    (nServicos ?? 0) > 0
      ? { nivel: 'ok', titulo: 'Serviços cadastrados', detalhe: `${nServicos} serviço${nServicos === 1 ? '' : 's'} ativo${nServicos === 1 ? '' : 's'}` }
      : { nivel: 'grave', titulo: 'Nenhum serviço cadastrado', detalhe: 'Sem serviço o cliente não tem o que escolher no link.' },
    (nProfs ?? 0) > 0
      ? { nivel: 'ok', titulo: 'Tem quem atenda', detalhe: `${nProfs} na agenda` }
      : { nivel: 'grave', titulo: 'Ninguém na agenda', detalhe: 'O dono não marcou "Sou eu que corto" nem aprovou barbeiro. A página não mostra horário.' },
    diasAbertos > 0 || (nHorariosProprios ?? 0) > 0
      ? { nivel: 'ok', titulo: 'Horário de funcionamento', detalhe: diasAbertos ? `${diasAbertos} dia${diasAbertos > 1 ? 's' : ''} aberto${diasAbertos > 1 ? 's' : ''} na semana` : 'Barbeiros com horário próprio' }
      : { nivel: 'grave', titulo: 'Sem horário de funcionamento', detalhe: 'Nenhum dia aberto: o cliente nunca vê horário livre.' },
    b.telefone
      ? { nivel: 'ok', titulo: 'Telefone da barbearia', detalhe: b.telefone }
      : { nivel: 'aviso', titulo: 'Sem telefone', detalhe: 'Cliente não consegue chamar no WhatsApp nem pedir senha nova.' },
    pendentes > 0
      ? { nivel: 'aviso', titulo: `${pendentes} barbeiro${pendentes > 1 ? 's' : ''} esperando aprovação`, detalhe: 'O dono precisa aprovar em Mais → Equipe.' }
      : { nivel: 'ok', titulo: 'Sem barbeiro esperando aprovação', detalhe: '' },
    (nAgsTotal ?? 0) > 0
      ? { nivel: 'ok', titulo: 'Já tem agendamento', detalhe: `${nAgsTotal} no total · ${peloLink} pelo link nos últimos 30 dias` }
      : { nivel: 'aviso', titulo: 'Nenhum agendamento ainda', detalhe: 'Talvez não tenha divulgado o link. Vale uma ligação.' },
    semAcesso7
      ? { nivel: 'aviso', titulo: 'Sem entrar há mais de 7 dias', detalhe: `Último acesso: ${dataHora(ultimoAcesso)}` }
      : { nivel: 'ok', titulo: 'Usando o sistema', detalhe: `Último acesso: ${dataHora(ultimoAcesso)}` },
    b.status === 'trial' && diasTeste <= 3
      ? { nivel: 'aviso', titulo: diasTeste > 0 ? `Teste acaba em ${diasTeste} dia${diasTeste > 1 ? 's' : ''}` : 'Teste acabou', detalhe: 'Hora de conversar sobre o plano.' }
      : { nivel: 'ok', titulo: 'Situação da conta', detalhe: st.rotulo },
    (() => {
      const max = b.status === 'ativo' ? PLANOS_ADMIN[b.plano as PlanoPago]?.maxProfissionais ?? null : null
      const n = nProfs ?? 0
      return max !== null && n > max
        ? { nivel: 'aviso' as Nivel, titulo: 'Acima do limite do plano', detalhe: `${n} na agenda, o plano ${PLANOS_ADMIN[b.plano as PlanoPago].nome} vai até ${max}. Sugira o ${PLANOS_ADMIN[planoParaProfissionais(n)].nome}.` }
        : { nivel: 'ok' as Nivel, titulo: 'Dentro do limite do plano', detalhe: max === null ? `${n} na agenda` : `${n} de ${max} na agenda` }
    })(),
    (nFixas ?? 0) > 0
      ? { nivel: 'ok', titulo: 'Despesas fixas cadastradas', detalhe: `${nFixas}` }
      : { nivel: 'dica', titulo: 'Sem despesas fixas', detalhe: 'O financeiro fica incompleto sem aluguel, energia etc.' },
  ]
  const problemasConfig = checklist.filter(c => c.nivel === 'grave' || c.nivel === 'aviso').length
  const errosAbertos = (erros ?? []).filter(e => !e.resolvido).length

  // Abas que só carregam quando abertas
  const atividade = aba === 'atividade'
    ? ((await db.from('auditoria')
        .select('id, acao, tabela, valor_antes, valor_depois, criado_em, usuario:usuarios!usuario_id(nome, papel)')
        .eq('barbearia_id', id).order('criado_em', { ascending: false }).limit(60)).data ?? []) as unknown as LinhaAuditoria[]
    : []
  const agenda = aba === 'agenda'
    ? (await db.from('agendamentos')
        .select('id, inicio, status, valor_servico, criado_por, cliente_id, cliente:usuarios!cliente_id(nome), servico:servicos!servico_id(nome), profissional:profissionais!profissional_id(nome)')
        .eq('barbearia_id', id).order('inicio', { ascending: false }).limit(40)).data ?? []
    : []
  const um = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

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
          {b.status === 'ativo' && ciclo?.plano_ciclo_fim && (
            new Date(ciclo.plano_ciclo_fim).getTime() > Date.now()
              ? <> · pago até {data(ciclo.plano_ciclo_fim)}</>
              : <span className="text-saida"> · pagamento venceu em {data(ciclo.plano_ciclo_fim)}</span>
          )}
        </p>
        {ciclo?.indicada_por && (
          <p className="font-body text-sm text-fg-muted">
            Chegou pela indicação de <Link href={`/${ciclo.indicada_por}`} className="text-amber hover:underline">/{ciclo.indicada_por}</Link>
          </p>
        )}
        {ciclo?.plano_agendado && (
          <p className="font-body text-sm text-amber">
            O dono pediu pra mudar pro {PLANOS_ADMIN[ciclo.plano_agendado as PlanoPago]?.nome ?? ciclo.plano_agendado} em {data(ciclo.plano_agendado_em)}.
            A troca acontece quando você registrar o pagamento desse plano.
          </p>
        )}

        {/* Abas da pasta */}
        <nav className="flex gap-1 overflow-x-auto -mx-4 px-4 border-b border-line">
          {ABAS.map(a => {
            const badge = a.id === 'erros' ? errosAbertos : a.id === 'config' ? problemasConfig : 0
            return (
              <Link key={a.id} href={`/admin/${b.id}?aba=${a.id}`} scroll={false}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-ui text-xs uppercase tracking-wider transition-colors ${
                  aba === a.id ? 'border-amber text-fg' : 'border-transparent text-fg-muted hover:text-fg'}`}>
                {a.rotulo}
                {badge > 0 && (
                  <span className={`px-1.5 rounded-full font-mono text-[10px] ${a.id === 'erros' ? 'bg-saida text-bg' : 'bg-amber text-accent-fg'}`}>{badge}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {aba === 'geral' && (<>

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
            {dono && <LinkNovaSenha endpoint={`/api/admin/barbearias/${b.id}/nova-senha-dono`} nome={dono.nome} />}
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
        <AcoesBarbearia barbearia={{ id: b.id, nome: b.nome, slug: b.slug, status: b.status, plano: b.plano }} pedido={ciclo?.plano_agendado ?? null} />

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
        </>)}

        {aba === 'config' && (
          <ul className="bg-surface border border-line rounded-card divide-y divide-line">
            {checklist.map(c => (
              <li key={c.titulo} className="flex gap-3 px-4 py-3">
                {c.nivel === 'ok' && <CheckCircle2 size={16} className="text-entrada shrink-0 mt-0.5" />}
                {c.nivel === 'grave' && <AlertTriangle size={16} className="text-saida shrink-0 mt-0.5" />}
                {c.nivel === 'aviso' && <AlertTriangle size={16} className="text-amber shrink-0 mt-0.5" />}
                {c.nivel === 'dica' && <Info size={16} className="text-info shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className={`font-body text-sm ${c.nivel === 'ok' ? 'text-fg-muted' : 'text-fg'}`}>{c.titulo}</p>
                  {c.detalhe && <p className="font-body text-xs text-fg-muted">{c.detalhe}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}

        {aba === 'erros' && (
          <ListaErros erros={(erros ?? []) as ErroSistema[]} barbearia_id={b.id} />
        )}

        {aba === 'atividade' && (
          atividade.length === 0 ? (
            <p className="font-body text-sm text-fg-muted text-center py-8">Nada registrado ainda.</p>
          ) : (
            <ul className="bg-surface border border-line rounded-card divide-y divide-line">
              {atividade.map(l => {
                const u = um(l.usuario)
                const { texto, alerta } = descreverAuditoria(l)
                return (
                  <li key={l.id} className="flex gap-3 px-4 py-3">
                    <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${alerta ? 'bg-saida' : 'bg-line'}`} />
                    <p className="flex-1 font-body text-sm text-fg">
                      <strong className="font-semibold">{u?.nome ?? 'Alguém'}</strong>
                      {u?.papel && u.papel !== 'dono' && <span className="text-fg-muted"> ({u.papel})</span>} {texto}
                    </p>
                    <span className="font-mono text-xs text-fg-muted shrink-0 mt-0.5">{dataHora(l.criado_em)}</span>
                  </li>
                )
              })}
            </ul>
          )
        )}

        {aba === 'agenda' && (
          agenda.length === 0 ? (
            <p className="font-body text-sm text-fg-muted text-center py-8">Nenhum agendamento ainda.</p>
          ) : (
            <ul className="bg-surface border border-line rounded-card divide-y divide-line">
              {agenda.map(a => {
                const cli = um(a.cliente as never) as { nome?: string } | null
                const srv = um(a.servico as never) as { nome?: string } | null
                const prof = um(a.profissional as never) as { nome?: string } | null
                return (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-fg truncate">{cli?.nome ?? 'Cliente'} · {srv?.nome}</p>
                      <p className="font-body text-xs text-fg-muted">
                        {dataHora(a.inicio)} · {prof?.nome}{a.criado_por === a.cliente_id ? ' · pelo link' : ''}
                      </p>
                    </div>
                    <span className="font-ui text-[10px] uppercase tracking-wider text-fg-muted shrink-0">{a.status}</span>
                  </li>
                )
              })}
            </ul>
          )
        )}
      </div>
      <Avisos />
    </div>
  )
}
