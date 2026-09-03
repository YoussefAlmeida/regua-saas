'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, MapPin, Instagram, Clock, Check } from 'lucide-react'

type Etapa = 'barbeiro' | 'servico' | 'data' | 'horario' | 'dados' | 'sucesso'

interface Profissional { id: string; nome: string; foto_url: string | null; especialidade: string | null }
interface Servico { id: string; nome: string; preco: number; duracao_min: number; cor: string }
interface Barbearia {
  nome: string; slug: string; endereco: string | null; instagram: string | null
  horario_funcionamento: Record<string, { ativo?: boolean }> | null
}

interface Props {
  barbearia: Barbearia
  profissionais: Profissional[]
  servicos: Servico[]
}

const ETAPAS: Etapa[] = ['barbeiro', 'servico', 'data', 'horario', 'dados', 'sucesso']

export default function AgendamentoPublico({ barbearia, profissionais, servicos }: Props) {
  const [etapa, setEtapa] = useState<Etapa>('barbeiro')
  const [profissional, setProfissional] = useState<Profissional | null>(null)
  const [servico, setServico] = useState<Servico | null>(null)
  const [data, setData] = useState('')
  const [horario, setHorario] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [slotsCarregando, setSlotsCarregando] = useState(false)
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  function voltar() {
    const idx = ETAPAS.indexOf(etapa)
    if (idx > 0) setEtapa(ETAPAS[idx - 1])
  }

  function selecionarProfissional(p: Profissional) {
    setProfissional(p)
    setEtapa('servico')
  }

  function selecionarServico(s: Servico) {
    setServico(s)
    setEtapa('data')
  }

  async function selecionarData(d: string) {
    setData(d)
    setHorario('')
    setSlotsCarregando(true)
    setEtapa('horario')

    const res = await fetch(
      `/api/publico/${barbearia.slug}/disponibilidade?profissional_id=${profissional!.id}&servico_id=${servico!.id}&data=${d}`,
    )
    const json = await res.json()
    setSlotsCarregando(false)
    setSlots(json.slots ?? [])
  }

  function selecionarHorario(h: string) {
    setHorario(h)
    setEtapa('dados')
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)

    const inicio = new Date(`${data}T${horario}:00-03:00`).toISOString()

    const res = await fetch(`/api/publico/${barbearia.slug}/agendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profissional_id: profissional!.id,
        servico_id: servico!.id,
        inicio,
        cliente_nome: nome,
        cliente_whatsapp: whatsapp,
      }),
    })

    const json = await res.json()
    setEnviando(false)

    if (!res.ok) { setErro(json.erro || 'Erro ao agendar'); return }
    setEtapa('sucesso')
  }

  const dataFormatada = data
    ? new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    : ''

  const inputCls = 'w-full bg-surface-alt border border-line rounded-button px-4 py-3 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber'
  const labelCls = 'font-ui text-xs uppercase tracking-wider text-fg-muted block mb-1'

  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
  const maxData = new Date()
  maxData.setDate(maxData.getDate() + 60)
  const maxDataStr = maxData.toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-surface border-b border-line px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {etapa !== 'barbeiro' && etapa !== 'sucesso' && (
            <button onClick={voltar} className="text-fg-muted hover:text-fg transition-colors">
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="font-display text-xl text-amber tracking-widest">{barbearia.nome}</h1>
            <div className="flex items-center gap-3 mt-0.5">
              {barbearia.endereco && (
                <span className="flex items-center gap-1 font-body text-xs text-fg-muted">
                  <MapPin size={10} /> {barbearia.endereco}
                </span>
              )}
              {barbearia.instagram && (
                <span className="flex items-center gap-1 font-body text-xs text-fg-muted">
                  <Instagram size={10} /> @{barbearia.instagram}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {etapa !== 'sucesso' && (
          <div className="max-w-lg mx-auto mt-3 flex gap-1">
            {(['barbeiro', 'servico', 'data', 'horario', 'dados'] as Etapa[]).map((e, i) => (
              <div
                key={e}
                className={`h-0.5 flex-1 rounded-full transition-colors ${
                  ETAPAS.indexOf(etapa) > i ? 'bg-amber' : ETAPAS.indexOf(etapa) === i ? 'bg-amber/60' : 'bg-line'
                }`}
              />
            ))}
          </div>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Etapa: Barbeiro */}
        {etapa === 'barbeiro' && (
          <div>
            <h2 className="font-ui text-lg uppercase tracking-wider text-fg mb-4">Escolha o barbeiro</h2>
            {profissionais.length === 0 ? (
              <p className="font-body text-sm text-fg-muted text-center py-8">Nenhum barbeiro disponível no momento.</p>
            ) : (
              <div className="space-y-2">
                {profissionais.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selecionarProfissional(p)}
                    className="w-full flex items-center gap-4 bg-surface border border-line rounded-card px-4 py-4 hover:border-amber/40 transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center font-display text-lg text-amber shrink-0">
                      {p.foto_url
                        ? <Image src={p.foto_url} alt={p.nome} width={48} height={48} className="w-full h-full rounded-full object-cover" />
                        : p.nome.charAt(0).toUpperCase()
                      }
                    </div>
                    <div>
                      <p className="font-ui text-sm uppercase tracking-wider text-fg">{p.nome}</p>
                      {p.especialidade && (
                        <p className="font-body text-xs text-fg-muted">{p.especialidade}</p>
                      )}
                    </div>
                    <ChevronLeft size={16} className="ml-auto text-fg-muted rotate-180" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Etapa: Serviço */}
        {etapa === 'servico' && (
          <div>
            <h2 className="font-ui text-lg uppercase tracking-wider text-fg mb-4">Escolha o serviço</h2>
            {servicos.length === 0 ? (
              <p className="font-body text-sm text-fg-muted text-center py-8">Nenhum serviço disponível.</p>
            ) : (
              <div className="space-y-2">
                {servicos.map(s => (
                  <button
                    key={s.id}
                    onClick={() => selecionarServico(s)}
                    className="w-full flex items-center gap-3 bg-surface border border-line rounded-card px-4 py-4 hover:border-amber/40 transition-colors text-left"
                  >
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.cor }} />
                    <div className="flex-1">
                      <p className="font-ui text-sm uppercase tracking-wider text-fg">{s.nome}</p>
                      <span className="flex items-center gap-1 font-body text-xs text-fg-muted">
                        <Clock size={10} /> {s.duracao_min} min
                      </span>
                    </div>
                    <span className="font-mono text-sm text-amber">R$ {s.preco.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Etapa: Data */}
        {etapa === 'data' && (
          <div>
            <h2 className="font-ui text-lg uppercase tracking-wider text-fg mb-4">Escolha a data</h2>
            <div className="bg-surface border border-line rounded-card p-4">
              <label className={labelCls}>Data do agendamento</label>
              <input
                type="date"
                min={hoje}
                max={maxDataStr}
                value={data}
                onChange={e => e.target.value && selecionarData(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Etapa: Horário */}
        {etapa === 'horario' && (
          <div>
            <h2 className="font-ui text-lg uppercase tracking-wider text-fg mb-1">Escolha o horário</h2>
            <p className="font-body text-sm text-fg-muted mb-4 capitalize">{dataFormatada}</p>

            {slotsCarregando ? (
              <div className="text-center py-12">
                <p className="font-ui text-sm text-fg-muted uppercase tracking-wider animate-pulse">Verificando horários…</p>
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="font-ui text-sm text-fg-muted uppercase tracking-wider">Sem horários disponíveis</p>
                <button
                  onClick={() => setEtapa('data')}
                  className="text-amber font-body text-sm hover:underline"
                >
                  Escolher outra data
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => selecionarHorario(slot)}
                    className={`py-3 rounded-button font-mono text-sm border transition-colors ${
                      horario === slot
                        ? 'bg-amber text-accent-fg border-amber'
                        : 'bg-surface border-line text-fg hover:border-amber/40'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Etapa: Dados do cliente */}
        {etapa === 'dados' && (
          <div>
            <h2 className="font-ui text-lg uppercase tracking-wider text-fg mb-4">Seus dados</h2>

            {/* Resumo */}
            <div className="bg-surface border border-amber/20 rounded-card p-4 mb-6 space-y-1.5">
              <p className="font-ui text-xs uppercase tracking-wider text-amber mb-2">Resumo</p>
              <p className="font-body text-sm text-fg">{profissional?.nome}</p>
              <p className="font-body text-sm text-fg">{servico?.nome} · R$ {servico?.preco.toFixed(2)}</p>
              <p className="font-body text-sm text-fg capitalize">{dataFormatada} às {horario}</p>
            </div>

            <form onSubmit={confirmar} className="space-y-4">
              <div>
                <label className={labelCls}>Seu nome *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="João Silva"
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Seu WhatsApp *</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  placeholder="(71) 99999-0000"
                  required
                  className={inputCls}
                />
              </div>

              {erro && <p className="font-body text-sm text-saida">{erro}</p>}

              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-amber hover:bg-accent-press text-accent-fg font-ui uppercase tracking-wider text-sm py-3 rounded-button transition-colors disabled:opacity-50"
              >
                {enviando ? 'Confirmando…' : 'Confirmar agendamento'}
              </button>
              <p className="font-body text-xs text-fg-muted text-center">
                Não precisa baixar nenhum app.
              </p>
            </form>
          </div>
        )}

        {/* Etapa: Sucesso */}
        {etapa === 'sucesso' && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-entrada/10 border border-entrada/30 flex items-center justify-center mx-auto">
              <Check size={32} className="text-entrada" />
            </div>
            <h2 className="font-display text-3xl text-fg tracking-wider">Agendado!</h2>
            <div className="bg-surface border border-line rounded-card p-4 text-left space-y-1.5 max-w-xs mx-auto">
              <p className="font-body text-sm text-fg">{profissional?.nome}</p>
              <p className="font-body text-sm text-fg">{servico?.nome}</p>
              <p className="font-body text-sm text-fg capitalize">{dataFormatada} às {horario}</p>
            </div>
            <p className="font-body text-sm text-fg-muted max-w-xs mx-auto">
              Em breve você receberá uma confirmação pelo WhatsApp.
            </p>
            <button
              onClick={() => {
                setEtapa('barbeiro')
                setProfissional(null)
                setServico(null)
                setData('')
                setHorario('')
                setNome('')
                setWhatsapp('')
                setSlots([])
              }}
              className="text-amber font-ui text-sm uppercase tracking-wider hover:underline"
            >
              Fazer outro agendamento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
