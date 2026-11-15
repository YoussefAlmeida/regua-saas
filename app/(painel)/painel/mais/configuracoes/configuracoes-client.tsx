'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X, CalendarOff } from 'lucide-react'


type HorarioDia = { ativo: boolean; inicio?: string; fim?: string; intervalo_inicio?: string; intervalo_fim?: string }

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
  const [form, setForm] = useState({
    nome: barbearia?.nome ?? '',
    telefone: barbearia?.telefone ?? '',
    endereco: barbearia?.endereco ?? '',
    instagram: barbearia?.instagram ?? '',
  })
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
  const [fechados, setFechados] = useState<string[]>((barbearia?.dias_fechados ?? []).filter(d => d >= hoje))
  const [novoFechado, setNovoFechado] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')

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
        dias_fechados: fechados,
      }),
    })

    const json = await res.json()
    setSalvando(false)

    if (!res.ok) { setErro(json.erro || 'Erro ao salvar'); return }
    setSalvo(true)
    setTimeout(() => setSalvo(false), 3000)
  }

  const inputCls = 'ds-input'
  const labelCls = 'ds-label'

  return (
    <form onSubmit={salvar} className="px-4 md:px-8 py-6 max-w-lg md:max-w-5xl mx-auto space-y-8 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-8 md:items-start">
      <div className="flex items-center justify-between md:col-span-2">
        <h1 className="ds-titulo">Configurações</h1>
        <button
          type="submit"
          disabled={salvando}
          className="font-semibold flex items-center gap-2 bg-amber hover:bg-accent-press text-accent-fg font-ui text-xs px-4 py-2 rounded-button transition-colors disabled:opacity-50"
        >
          {salvo ? <><Check size={13} /> Salvo</> : salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {/* Dados da barbearia */}
      <section className="space-y-4">
        <h2 className="font-semibold font-ui text-sm text-fg-muted">Dados da barbearia</h2>

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

      <p className="font-body text-xs text-fg-muted">
        O horário de funcionamento e o almoço agora ficam em <Link href="/painel/mais/horarios" className="text-amber font-semibold hover:underline">Horários</Link>.
      </p>

      {/* Dias fechados (feriados) — vencem o horário de qualquer barbeiro */}
      <section className="space-y-3">
        <h2 className="font-semibold font-ui text-sm text-fg-muted">Feriados e dias fechados</h2>
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
            className="font-semibold px-4 bg-surface-alt border border-line hover:border-amber/40 text-fg font-ui text-xs rounded-button transition-colors disabled:opacity-40"
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
