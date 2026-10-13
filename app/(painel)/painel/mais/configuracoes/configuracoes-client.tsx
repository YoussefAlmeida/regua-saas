'use client'

import { useState } from 'react'
import { Check, X, CalendarOff } from 'lucide-react'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type HorarioDia = { ativo: boolean; inicio?: string; fim?: string; intervalo_inicio?: string; intervalo_fim?: string }
type Horarios = Record<string, HorarioDia>

const HORARIO_PADRAO: Horarios = {
  '0': { ativo: false },
  '1': { ativo: true, inicio: '08:00', fim: '19:00' },
  '2': { ativo: true, inicio: '08:00', fim: '19:00' },
  '3': { ativo: true, inicio: '08:00', fim: '19:00' },
  '4': { ativo: true, inicio: '08:00', fim: '19:00' },
  '5': { ativo: true, inicio: '08:00', fim: '19:00' },
  '6': { ativo: true, inicio: '08:00', fim: '17:00' },
}

interface Barbearia {
  id: string
  nome: string
  slug: string
  telefone: string | null
  endereco: string | null
  instagram: string | null
  horario_funcionamento: Record<string, HorarioDia> | null
  dias_fechados: string[] | null
}

export default function ConfiguracoesClient({ barbearia, siteUrl }: { barbearia: Barbearia | null; siteUrl: string }) {
  const horarioInicial = (barbearia?.horario_funcionamento && Object.keys(barbearia.horario_funcionamento).length > 0)
    ? barbearia.horario_funcionamento
    : HORARIO_PADRAO

  const [form, setForm] = useState({
    nome: barbearia?.nome ?? '',
    telefone: barbearia?.telefone ?? '',
    endereco: barbearia?.endereco ?? '',
    instagram: barbearia?.instagram ?? '',
  })
  const [horarios, setHorarios] = useState<Horarios>(horarioInicial)
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
  const [fechados, setFechados] = useState<string[]>((barbearia?.dias_fechados ?? []).filter(d => d >= hoje))
  const [novoFechado, setNovoFechado] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')

  function updateHorario(dia: string, campo: keyof HorarioDia, valor: boolean | string) {
    setHorarios(h => ({ ...h, [dia]: { ...h[dia], [campo]: valor } }))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    setSalvo(false)

    const res = await fetch('/api/painel/barbearia', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || null,
        endereco: form.endereco.trim() || null,
        instagram: form.instagram.trim() || null,
        horario_funcionamento: horarios,
        dias_fechados: fechados,
      }),
    })

    const json = await res.json()
    setSalvando(false)

    if (!res.ok) { setErro(json.erro || 'Erro ao salvar'); return }
    setSalvo(true)
    setTimeout(() => setSalvo(false), 3000)
  }

  const inputCls = 'w-full bg-surface-alt border border-line rounded-button px-4 py-3 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber'
  const labelCls = 'font-ui text-xs uppercase tracking-wider text-fg-muted block mb-1'

  return (
    <form onSubmit={salvar} className="px-4 py-6 max-w-lg mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-ui text-xl uppercase tracking-widest text-fg">Configurações</h1>
        <button
          type="submit"
          disabled={salvando}
          className="flex items-center gap-2 bg-amber hover:bg-accent-press text-accent-fg font-ui text-xs uppercase tracking-wider px-4 py-2 rounded-button transition-colors disabled:opacity-50"
        >
          {salvo ? <><Check size={13} /> Salvo</> : salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {/* Dados da barbearia */}
      <section className="space-y-4">
        <h2 className="font-ui text-sm uppercase tracking-wider text-fg-muted">Dados da barbearia</h2>

        <div>
          <label className={labelCls}>Nome *</label>
          <input
            type="text"
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            required
            className={inputCls}
          />
        </div>

        {barbearia?.slug && (
          <div>
            <label className={labelCls}>Link público de agendamento</label>
            <div className="bg-surface-alt border border-line rounded-button px-4 py-3 font-mono text-sm text-fg-muted break-all">
              {siteUrl.replace(/^https?:\/\//, '')}/{barbearia.slug}
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Telefone / WhatsApp</label>
          <input
            type="tel"
            value={form.telefone}
            onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
            placeholder="(71) 99999-0000"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Endereço</label>
          <input
            type="text"
            value={form.endereco}
            onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
            placeholder="Rua das Flores, 42 — Feira de Santana"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Instagram</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted font-body text-sm">@</span>
            <input
              type="text"
              value={form.instagram}
              onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
              placeholder="suabarbearia"
              className={`${inputCls} pl-8`}
            />
          </div>
        </div>
      </section>

      {/* Horários de funcionamento */}
      <section className="space-y-3">
        <h2 className="font-ui text-sm uppercase tracking-wider text-fg-muted">Horários de funcionamento</h2>

        <div className="bg-surface rounded-card border border-line overflow-hidden">
          {DIAS.map((dia, idx) => {
            const key = String(idx)
            const h = horarios[key] ?? { ativo: false }
            return (
              <div
                key={key}
                className={`flex items-center gap-3 px-4 py-3 ${idx < 6 ? 'border-b border-line' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => updateHorario(key, 'ativo', !h.ativo)}
                  className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${h.ativo ? 'bg-amber' : 'bg-line'}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-fg transition-transform ${h.ativo ? 'translate-x-4' : 'translate-x-0.5'}`}
                  />
                </button>
                <span className={`font-ui text-xs uppercase tracking-wider w-7 shrink-0 ${h.ativo ? 'text-fg' : 'text-fg-muted'}`}>
                  {dia}
                </span>

                {h.ativo ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={h.inicio ?? '08:00'}
                      onChange={e => updateHorario(key, 'inicio', e.target.value)}
                      className="bg-surface-alt border border-line rounded-button px-2 py-1 font-body text-xs text-fg focus:outline-none focus:ring-1 focus:ring-amber"
                    />
                    <span className="text-fg-muted text-xs">–</span>
                    <input
                      type="time"
                      value={h.fim ?? '19:00'}
                      onChange={e => updateHorario(key, 'fim', e.target.value)}
                      className="bg-surface-alt border border-line rounded-button px-2 py-1 font-body text-xs text-fg focus:outline-none focus:ring-1 focus:ring-amber"
                    />
                  </div>
                ) : (
                  <span className="font-body text-xs text-fg-muted">Fechado</span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Dias fechados (feriados) — vencem o horário de qualquer barbeiro */}
      <section className="space-y-3">
        <h2 className="font-ui text-sm uppercase tracking-wider text-fg-muted">Feriados e dias fechados</h2>
        <p className="font-body text-xs text-fg-muted -mt-1">
          Nesses dias ninguém agenda pela página, mesmo que o barbeiro tenha horário configurado.
        </p>
        <div className="flex gap-2">
          <input
            type="date"
            min={hoje}
            value={novoFechado}
            onChange={e => setNovoFechado(e.target.value)}
            className={`${inputCls} flex-1`}
            aria-label="Data fechada"
          />
          <button
            type="button"
            disabled={!novoFechado || fechados.includes(novoFechado)}
            onClick={() => { setFechados(f => [...f, novoFechado].sort()); setNovoFechado('') }}
            className="px-4 bg-surface-alt border border-line hover:border-amber/40 text-fg font-ui text-xs uppercase tracking-wider rounded-button transition-colors disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>
        {fechados.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {fechados.map(d => (
              <li key={d} className="flex items-center gap-1.5 bg-surface border border-line rounded-full pl-3 pr-1.5 py-1">
                <CalendarOff size={12} className="text-fg-muted" />
                <span className="font-body text-xs text-fg inline-block first-letter:uppercase">
                  {new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                </span>
                <button
                  type="button"
                  onClick={() => setFechados(f => f.filter(x => x !== d))}
                  className="p-1 text-fg-muted hover:text-saida"
                  aria-label="Remover dia fechado"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-body text-xs text-fg-muted">Nenhum dia fechado marcado. Não esqueça de salvar.</p>
        )}
      </section>

      {erro && <p className="font-body text-sm text-saida">{erro}</p>}
    </form>
  )
}
