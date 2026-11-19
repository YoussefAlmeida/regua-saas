'use client'

import { useMemo, useState } from 'react'
import { Search, Users, Trash2, MessageCircle, UserRoundX } from 'lucide-react'
import LinkNovaSenha from '@/components/link-nova-senha'
import { avisar, erroDaResposta } from '@/components/aviso'
import { pedirSenha } from '@/components/confirmar-senha'
import { resumoCliente, estaSumido, mensagemDeVolta, JANELAS_RADAR, type ResumoCliente } from '@/lib/radar-clientes'

interface Agendamento { id: string; inicio: string; status: string }
interface Cliente {
  id: string
  nome: string
  whatsapp: string | null
  criado_em: string
  agendamentos: Agendamento[]
}

type Aba = 'todos' | 'sumidos'

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Bahia' })

function linkWhatsApp(whatsapp: string, texto: string) {
  const d = whatsapp.replace(/\D/g, '')
  return `https://wa.me/${d.startsWith('55') ? d : `55${d}`}?text=${encodeURIComponent(texto)}`
}

export default function ClientesClient({
  clientesIniciais,
  barbearia,
}: {
  clientesIniciais: Cliente[]
  barbearia: { nome: string; link: string }
}) {
  const [busca, setBusca] = useState('')
  const [lista, setLista] = useState(clientesIniciais)
  const [aba, setAba] = useState<Aba>('todos')
  const [janela, setJanela] = useState<number>(JANELAS_RADAR[0])

  // Resumo de cada cliente (cortes, último, faltas) calculado uma vez
  const resumos = useMemo(() => {
    const agora = new Date()
    return new Map(lista.map(c => [c.id, resumoCliente(c.agendamentos, agora)]))
  }, [lista])
  const resumo = (c: Cliente) => resumos.get(c.id) as ResumoCliente

  // LGPD: cliente pediu pra apagar os dados
  async function apagarDados(c: Cliente) {
    const senha = await pedirSenha(
      `Apagar dados de ${c.nome}`,
      'Use quando o cliente pedir (LGPD). Some nome, WhatsApp e senha; os horários marcados são cancelados. Os valores já atendidos ficam no financeiro, sem identificar a pessoa.',
    )
    if (!senha) return
    const res = await fetch(`/api/painel/clientes/${c.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    }).catch(() => null)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    setLista(prev => prev.filter(x => x.id !== c.id))
    avisar('Dados do cliente apagados.', 'sucesso')
  }

  const sumidos = lista
    .filter(c => estaSumido(resumo(c), janela))
    .sort((a, b) => (resumo(b).diasSemVir ?? 0) - (resumo(a).diasSemVir ?? 0))

  const base = aba === 'sumidos' ? sumidos : lista
  const q = busca.toLowerCase()
  const filtrados = base.filter(c => c.nome.toLowerCase().includes(q) || c.whatsapp?.includes(q))

  const abaCls = (ativa: boolean) =>
    `font-semibold flex-1 md:flex-none md:px-5 py-2.5 font-ui text-sm transition-colors ${ativa ? 'bg-amber text-accent-fg' : 'text-fg-muted hover:text-fg'}`

  return (
    <div className="px-4 md:px-8 py-6 max-w-lg md:max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="ds-titulo">Clientes</h1>
        <span className="font-mono text-sm text-fg-muted">{lista.length}</span>
      </div>

      {clientesIniciais.length > 0 && (
        <>
          {/* Todos x radar de sumidos */}
          <div className="flex rounded-button border border-line overflow-hidden mb-4 md:w-fit" role="tablist">
            <button role="tab" aria-selected={aba === 'todos'} onClick={() => setAba('todos')} className={abaCls(aba === 'todos')}>
              Todos
            </button>
            <button role="tab" aria-selected={aba === 'sumidos'} onClick={() => setAba('sumidos')} className={abaCls(aba === 'sumidos')}>
              Sumidos{' '}
              <span className="font-mono">({lista.filter(c => estaSumido(resumo(c), janela)).length})</span>
            </button>
          </div>

          {aba === 'sumidos' && (
            <div className="mb-4 space-y-3">
              <p className="font-body text-sm text-fg-muted">
                Quem já cortou com você e não volta faz tempo, sem horário marcado. Uma mensagem traz boa parte de volta.
              </p>
              <div className="flex gap-2" aria-label="Sem voltar há">
                {JANELAS_RADAR.map(d => (
                  <button
                    key={d}
                    onClick={() => setJanela(d)}
                    aria-pressed={janela === d}
                    className={`font-semibold px-3 py-1.5 rounded-button border font-ui text-xs transition-colors ${
                      janela === d ? 'border-amber text-amber bg-amber/10' : 'border-line text-fg-muted hover:text-fg'
                    }`}
                  >
                    {d}+ dias
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative mb-4 md:max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome ou WhatsApp…"
              className="w-full bg-surface border border-line rounded-button pl-9 pr-4 py-2.5 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber"
            />
          </div>
        </>
      )}

      {filtrados.length === 0 ? (
        <div className="text-center py-16">
          {clientesIniciais.length === 0 ? (
            <>
              <Users size={40} className="mx-auto mb-3 text-fg-muted opacity-30" strokeWidth={1} />
              <p className="font-semibold font-ui text-sm text-fg-muted">Nenhum cliente ainda</p>
              <p className="font-body text-xs text-fg-muted mt-2">Os clientes aparecem aqui após o primeiro agendamento.</p>
            </>
          ) : aba === 'sumidos' && !busca ? (
            <>
              <UserRoundX size={40} className="mx-auto mb-3 text-fg-muted opacity-30" strokeWidth={1} />
              <p className="font-semibold font-ui text-sm text-fg-muted">Ninguém sumido há {janela}+ dias</p>
              <p className="font-body text-xs text-fg-muted mt-2">Seus clientes estão voltando. Confira de novo na semana que vem.</p>
            </>
          ) : (
            <p className="font-semibold font-ui text-sm text-fg-muted">Nenhum resultado</p>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-2 md:gap-3">
          {filtrados.map(c => {
            const r = resumo(c)
            const ultimo = r.ultimo ? dataCurta(r.ultimo) : null
            const sumido = aba === 'sumidos'
            return (
              <div key={c.id} className="ds-card px-4 py-4 flex items-center gap-2 min-[400px]:gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-alt flex items-center justify-center font-display text-sm text-amber shrink-0">
                  {c.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold font-ui text-sm text-fg truncate">{c.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {c.whatsapp && <span className="font-body text-xs text-fg-muted truncate">{c.whatsapp}</span>}
                    {r.faltas > 0 && (
                      <span className="font-ui text-[10px] font-semibold uppercase tracking-wider text-fg-muted bg-surface-alt border border-line rounded px-1.5 py-0.5">
                        Faltou {r.faltas}x
                      </span>
                    )}
                  </div>
                  {sumido ? (
                    <p className="font-body text-xs text-fg-muted mt-0.5">
                      Sem vir há <span className="text-amber font-semibold">{r.diasSemVir} dias</span> · {r.cortes} {r.cortes === 1 ? 'corte' : 'cortes'}
                    </p>
                  ) : (
                    <p className="font-body text-xs text-fg-muted mt-0.5 min-[400px]:hidden">
                      <span className="text-amber">{r.cortes}</span> {r.cortes === 1 ? 'corte' : 'cortes'}{ultimo ? ` · último ${ultimo}` : ''}
                    </p>
                  )}
                </div>

                {sumido && c.whatsapp ? (
                  <a
                    href={linkWhatsApp(c.whatsapp, mensagemDeVolta(c.nome, r.diasSemVir ?? 0, barbearia.nome, barbearia.link))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold flex items-center gap-1.5 bg-amber hover:bg-accent-press text-accent-fg font-ui text-xs px-3 py-2 rounded-button transition-colors shrink-0"
                    aria-label={`Chamar ${c.nome} no WhatsApp`}
                  >
                    <MessageCircle size={14} /> Chamar
                  </a>
                ) : (
                  <>
                    <LinkNovaSenha endpoint="/api/painel/recuperacao" corpo={{ usuario_id: c.id }} nome={c.nome} compacto />
                    <button onClick={() => apagarDados(c)} title="Apagar dados (LGPD)" aria-label={`Apagar dados de ${c.nome}`}
                      className="w-8 h-8 rounded-button flex items-center justify-center text-fg-muted hover:text-saida hover:bg-saida/10 transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                    <div className="text-right shrink-0 hidden min-[400px]:block">
                      <p className="font-mono text-sm text-amber">{r.cortes}</p>
                      <p className="font-body text-xs text-fg-muted">{r.cortes === 1 ? 'corte' : 'cortes'}</p>
                      {ultimo && <p className="font-body text-[10px] text-fg-muted mt-0.5">{ultimo}</p>}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
