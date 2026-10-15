'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2, X, ChevronLeft, ChevronRight, Download, Pencil, TrendingUp, TrendingDown, Repeat, Scissors } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'
import { pedirSenha } from '@/components/confirmar-senha'
import { mesVizinho } from '@/lib/periodo'
import RecursoBloqueado from '@/components/recurso-bloqueado'
import { lerValorBRL } from '@/lib/dinheiro'

export interface Movimentacao {
  id: string
  tipo: 'entrada' | 'saida'
  descricao: string
  valor: number
  data: string
  origem: 'manual' | 'automatica'
  profissional_id: string | null
  agendamento_id: string | null
  recorrente_id: string | null
  categoria: { id: string; nome: string; cor: string } | null
  profissional: { nome: string } | null
}

interface DespesaFixa { id: string; descricao: string; valor: number; dia_vencimento: number; ativa: boolean }
interface Categoria { id: string; nome: string; tipo: 'entrada' | 'saida'; cor: string; padrao: boolean }
interface Profissional { id: string; nome: string }

type Tab = 'resumo' | 'extrato' | 'fixas'
type FiltroTipo = 'tudo' | 'entrada' | 'saida'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const hojeBahia = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
const mesLabel = (mes: string) => {
  const [y, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}
const diaLabel = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })

function variacao(atual: number, antes: number): { txt: string; sobe: boolean } | null {
  if (antes <= 0) return null
  const p = ((atual - antes) / antes) * 100
  return { txt: `${p >= 0 ? '+' : ''}${p.toFixed(0)}%`, sobe: p >= 0 }
}

function origemDe(m: Movimentacao) {
  if (m.agendamento_id) return { txt: 'Agendamento', Icone: Scissors }
  if (m.recorrente_id) return { txt: 'Despesa fixa', Icone: Repeat }
  return null
}

export default function FinanceiroClient({
  movimentacoesIniciais,
  anteriorInicial,
  despesasFixasIniciais,
  categoriasIniciais,
  profissionais,
  mesInicial,
  podeDespesasFixas = true,
}: {
  podeDespesasFixas?: boolean
  movimentacoesIniciais: Movimentacao[]
  anteriorInicial: { tipo: string; valor: number }[]
  despesasFixasIniciais: DespesaFixa[]
  categoriasIniciais: Categoria[]
  profissionais: Profissional[]
  mesInicial: string
}) {
  const [tab, setTab] = useState<Tab>('resumo')
  const [mes, setMes] = useState(mesInicial)
  const [movs, setMovs] = useState<Movimentacao[]>(movimentacoesIniciais)
  const [anterior, setAnterior] = useState(anteriorInicial)
  const [despesas, setDespesas] = useState<DespesaFixa[]>(despesasFixasIniciais)
  const [categorias, setCategorias] = useState<Categoria[]>(categoriasIniciais)
  const [carregando, setCarregando] = useState(false)

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('tudo')
  const [filtroProf, setFiltroProf] = useState('')

  // Novo lançamento
  const [modalNovo, setModalNovo] = useState(false)
  const [novo, setNovo] = useState({ tipo: 'saida' as 'entrada' | 'saida', valor: '', descricao: '', data: hojeBahia(), categoria_id: '', profissional_id: '' })
  const [salvandoNovo, setSalvandoNovo] = useState(false)
  const [novaCat, setNovaCat] = useState<string | null>(null)

  // Detalhe / edição
  const [aberto, setAberto] = useState<Movimentacao | null>(null)
  const [edit, setEdit] = useState<{ descricao: string; valor: string; data: string } | null>(null)

  // Despesa fixa
  const [modalFixa, setModalFixa] = useState<DespesaFixa | 'nova' | null>(null)
  const [fixaForm, setFixaForm] = useState({ descricao: '', valor: '', dia_vencimento: '5' })

  // ── Números do mês ──────────────────────────────────────────
  const entradas = movs.filter(m => m.tipo === 'entrada').reduce((s, m) => s + Number(m.valor), 0)
  const saidas = movs.filter(m => m.tipo === 'saida').reduce((s, m) => s + Number(m.valor), 0)
  const saldo = entradas - saidas
  const entAnt = anterior.filter(m => m.tipo === 'entrada').reduce((s, m) => s + Number(m.valor), 0)
  const saiAnt = anterior.filter(m => m.tipo === 'saida').reduce((s, m) => s + Number(m.valor), 0)
  const varEnt = variacao(entradas, entAnt)
  const varSai = variacao(saidas, saiAnt)

  const porBarbeiro = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const m of movs) {
      if (m.tipo !== 'entrada' || !m.profissional_id) continue
      const nome = m.profissional?.nome ?? 'Barbeiro'
      mapa.set(nome, (mapa.get(nome) ?? 0) + Number(m.valor))
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1])
  }, [movs])

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, { v: number; cor: string }>()
    for (const m of movs) {
      if (m.tipo !== 'saida') continue
      const nome = m.categoria?.nome ?? 'Sem categoria'
      const atual = mapa.get(nome) ?? { v: 0, cor: m.categoria?.cor ?? '#6A635B' }
      atual.v += Number(m.valor)
      mapa.set(nome, atual)
    }
    return [...mapa.entries()].sort((a, b) => b[1].v - a[1].v)
  }, [movs])

  const filtradas = movs.filter(m =>
    (filtroTipo === 'tudo' || m.tipo === filtroTipo) && (!filtroProf || m.profissional_id === filtroProf))
  const porDia = useMemo(() => {
    const grupos = new Map<string, Movimentacao[]>()
    for (const m of filtradas) grupos.set(m.data, [...(grupos.get(m.data) ?? []), m])
    return [...grupos.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtradas])

  // ── Ações ───────────────────────────────────────────────────
  async function mudarMes(novoMes: string) {
    setMes(novoMes)
    setCarregando(true)
    const [r1, r2] = await Promise.all([
      fetch(`/api/painel/movimentacoes?mes=${novoMes}`),
      fetch(`/api/painel/movimentacoes?mes=${mesVizinho(novoMes, -1)}`),
    ]).catch(() => [null, null])
    setCarregando(false)
    if (!r1?.ok || !r2?.ok) { avisar('Não deu pra carregar esse mês.', 'erro'); return }
    setMovs(await r1.json())
    setAnterior(await r2.json())
  }

  function abrirNovo(tipo: 'entrada' | 'saida') {
    setNovo({ tipo, valor: '', descricao: '', data: hojeBahia(), categoria_id: '', profissional_id: '' })
    setNovaCat(null)
    setModalNovo(true)
  }

  async function criarCategoria() {
    if (!novaCat?.trim()) return
    const res = await fetch('/api/painel/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novaCat.trim(), tipo: novo.tipo }),
    }).catch(() => null)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    const cat: Categoria = await res.json()
    setCategorias(c => [...c, cat])
    setNovo(n => ({ ...n, categoria_id: cat.id }))
    setNovaCat(null)
  }

  async function salvarNovo(e: React.FormEvent) {
    e.preventDefault()
    const valor = lerValorBRL(novo.valor)
    if (!valor || valor <= 0) { avisar('Coloca um valor maior que zero.', 'erro'); return }
    const cat = categorias.find(c => c.id === novo.categoria_id)
    const descricao = novo.descricao.trim() || cat?.nome || (novo.tipo === 'entrada' ? 'Entrada' : 'Saída')
    setSalvandoNovo(true)
    const res = await fetch('/api/painel/movimentacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: novo.tipo,
        valor,
        descricao,
        data: novo.data,
        categoria_id: novo.categoria_id || undefined,
        profissional_id: novo.tipo === 'entrada' && novo.profissional_id ? novo.profissional_id : undefined,
      }),
    }).catch(() => null)
    setSalvandoNovo(false)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    const mov: Movimentacao = await res.json()
    if (mov.data.slice(0, 7) === mes) setMovs(prev => [mov, ...prev].sort((a, b) => b.data.localeCompare(a.data)))
    setModalNovo(false)
    avisar(`${novo.tipo === 'entrada' ? 'Entrada' : 'Saída'} de ${brl(valor)} lançada.`, 'sucesso')
  }

  async function salvarEdicao() {
    if (!aberto || !edit) return
    const valor = lerValorBRL(edit.valor)
    if (!valor || valor <= 0) { avisar('Valor inválido.', 'erro'); return }
    const senha = await pedirSenha('Editar lançamento', 'Mexer em dinheiro já lançado pede sua senha.')
    if (!senha) return
    const body: Record<string, unknown> = { senha, descricao: edit.descricao.trim() }
    if (!aberto.agendamento_id) { body.valor = valor; body.data = edit.data }
    const res = await fetch(`/api/painel/movimentacoes/${aberto.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    const mov: Movimentacao = await res.json()
    setMovs(prev => mov.data.slice(0, 7) === mes ? prev.map(m => m.id === mov.id ? mov : m) : prev.filter(m => m.id !== mov.id))
    setAberto(null)
    setEdit(null)
    avisar('Lançamento atualizado. Ficou registrado no histórico.', 'sucesso')
  }

  async function apagar(m: Movimentacao) {
    const senha = await pedirSenha('Apagar lançamento', `${m.descricao} · ${brl(Number(m.valor))}`)
    if (!senha) return
    const res = await fetch(`/api/painel/movimentacoes/${m.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    }).catch(() => null)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    setMovs(prev => prev.filter(x => x.id !== m.id))
    setAberto(null)
    avisar('Lançamento apagado. Ficou registrado no histórico.', 'sucesso')
  }

  async function exportar() {
    const senha = await pedirSenha('Exportar extrato', `CSV de ${mesLabel(mes)}${filtroProf ? ' (só esse barbeiro)' : ''} — abre no Excel.`)
    if (!senha) return
    const res = await fetch('/api/painel/exportar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha, mes, profissional_id: filtroProf || undefined }),
    }).catch(() => null)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `regua-extrato-${mes}.csv`
    a.click()
    URL.revokeObjectURL(url)
    avisar('Arquivo baixado.', 'sucesso')
  }

  function abrirFixa(d: DespesaFixa | 'nova') {
    setFixaForm(d === 'nova'
      ? { descricao: '', valor: '', dia_vencimento: '5' }
      : { descricao: d.descricao, valor: String(d.valor).replace('.', ','), dia_vencimento: String(d.dia_vencimento) })
    setModalFixa(d)
  }

  async function salvarFixa(e: React.FormEvent) {
    e.preventDefault()
    const valor = lerValorBRL(fixaForm.valor)
    const dia = parseInt(fixaForm.dia_vencimento)
    if (!valor || valor <= 0) { avisar('Valor inválido.', 'erro'); return }
    if (!dia || dia < 1 || dia > 28) { avisar('Dia do vencimento: de 1 a 28.', 'erro'); return }
    const editando = modalFixa !== 'nova' && modalFixa
    const res = await fetch(editando ? `/api/painel/despesas-fixas/${editando.id}` : '/api/painel/despesas-fixas', {
      method: editando ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descricao: fixaForm.descricao.trim(), valor, dia_vencimento: dia }),
    }).catch(() => null)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    const json: DespesaFixa = await res.json()
    setDespesas(prev => (editando ? prev.map(d => d.id === json.id ? json : d) : [...prev, json]).sort((a, b) => a.dia_vencimento - b.dia_vencimento))
    setModalFixa(null)
    avisar(editando ? 'Despesa fixa atualizada. Vale a partir do próximo lançamento.' : `Pronto. Todo dia ${dia} ela entra sozinha no caixa.`, 'sucesso')
  }

  async function toggleFixa(d: DespesaFixa) {
    const res = await fetch(`/api/painel/despesas-fixas/${d.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativa: !d.ativa }),
    }).catch(() => null)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    const json = await res.json()
    setDespesas(prev => prev.map(x => x.id === d.id ? { ...x, ...json } : x))
  }

  async function deletarFixa(d: DespesaFixa) {
    if (!confirm(`Apagar "${d.descricao}"? Os meses já lançados continuam no extrato.`)) return
    const res = await fetch(`/api/painel/despesas-fixas/${d.id}`, { method: 'DELETE' }).catch(() => null)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    setDespesas(prev => prev.filter(x => x.id !== d.id))
    setModalFixa(null)
    avisar('Despesa fixa removida.', 'sucesso')
  }

  // ── Estilos ─────────────────────────────────────────────────
  const inputCls = 'w-full bg-surface border border-line rounded-button px-3 py-2.5 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber'
  const labelCls = 'font-ui text-sm font-medium text-fg block mb-1.5'
  const chip = (ativo: boolean) => `font-semibold shrink-0 px-3 py-1.5 rounded-full border font-ui text-[11px] transition-colors ${ativo ? 'bg-amber text-accent-fg border-amber' : 'border-line text-fg-muted hover:text-fg'}`
  const totalFixo = despesas.filter(d => d.ativa).reduce((s, d) => s + Number(d.valor), 0)
  const catsDoTipo = categorias.filter(c => c.tipo === novo.tipo)

  return (
    <div className="flex flex-col max-w-lg mx-auto pb-24">
      {/* Abas */}
      <div className="flex border-b border-line bg-surface sticky top-[57px] z-10" role="tablist">
        {(['resumo', 'extrato', 'fixas'] as Tab[]).map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 font-ui text-xs uppercase tracking-wider border-b-2 transition-colors ${tab === t ? 'border-amber text-fg' : 'border-transparent text-fg-muted hover:text-fg'}`}
          >
            {t === 'resumo' ? 'Resumo' : t === 'extrato' ? 'Extrato' : 'Fixas'}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab !== 'fixas' && (
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => mudarMes(mesVizinho(mes, -1))} className="p-2 text-fg-muted hover:text-fg" aria-label="Mês anterior"><ChevronLeft size={18} /></button>
            <p className="font-semibold font-ui text-sm text-fg">{mesLabel(mes)}</p>
            <button onClick={() => mudarMes(mesVizinho(mes, 1))} className="p-2 text-fg-muted hover:text-fg" aria-label="Próximo mês"><ChevronRight size={18} /></button>
          </div>
        )}

        {carregando && tab !== 'fixas' ? (
          <div className="space-y-3" aria-busy>
            {[0, 1, 2].map(i => <div key={i} className="h-20 rounded-card bg-surface border border-line animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* ── RESUMO ── */}
            {tab === 'resumo' && (
              <div className="space-y-4">
                <div className="bg-surface border border-line rounded-card p-5">
                  <p className="font-ui text-xs uppercase tracking-wider text-fg-muted">Sobrou no mês</p>
                  <p className={`font-mono text-5xl leading-tight mt-1 ${saldo >= 0 ? 'text-entrada' : 'text-saida'}`}>{brl(saldo)}</p>
                  <p className="font-body text-xs text-fg-muted mt-1">o que entrou menos o que saiu</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { rot: 'Entrou', v: entradas, cor: 'text-entrada', vari: varEnt, bomSubir: true },
                    { rot: 'Saiu', v: saidas, cor: 'text-saida', vari: varSai, bomSubir: false },
                  ].map(c => (
                    <div key={c.rot} className="bg-surface border border-line rounded-card p-4">
                      <p className="font-ui text-xs uppercase tracking-wider text-fg-muted">{c.rot}</p>
                      <p className={`font-mono text-lg mt-1 whitespace-nowrap ${c.cor}`}>{brl(c.v)}</p>
                      {c.vari ? (
                        <p className={`flex items-center gap-1 font-body text-xs mt-1 ${c.vari.sobe === c.bomSubir ? 'text-entrada' : 'text-saida'}`}>
                          {c.vari.sobe ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {c.vari.txt} vs mês passado
                        </p>
                      ) : <p className="font-body text-xs text-fg-muted mt-1">sem mês anterior</p>}
                    </div>
                  ))}
                </div>

                {varSai && varSai.sobe && saiAnt > 0 && saidas > saiAnt * 1.2 && (
                  <p className="bg-saida/5 border border-saida/30 rounded-card px-4 py-3 font-body text-sm text-fg">
                    As saídas estão <strong className="text-saida">{varSai.txt}</strong> acima do mês passado. Confere no extrato o que pesou.
                  </p>
                )}

                {porBarbeiro.length > 0 && (
                  <section className="bg-surface border border-line rounded-card p-4">
                    <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-3">Entradas por barbeiro</p>
                    <ul className="space-y-2.5">
                      {porBarbeiro.map(([nome, v]) => (
                        <li key={nome}>
                          <div className="flex justify-between font-body text-sm"><span className="text-fg">{nome}</span><span className="font-mono text-fg">{brl(v)}</span></div>
                          <div className="h-1.5 bg-surface-alt rounded-full mt-1 overflow-hidden"><div className="h-full bg-entrada rounded-full" style={{ width: `${(v / porBarbeiro[0][1]) * 100}%` }} /></div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {porCategoria.length > 0 && (
                  <section className="bg-surface border border-line rounded-card p-4">
                    <p className="font-ui text-xs uppercase tracking-wider text-fg-muted mb-3">Pra onde foi o dinheiro</p>
                    <ul className="space-y-2.5">
                      {porCategoria.map(([nome, { v, cor }]) => (
                        <li key={nome}>
                          <div className="flex justify-between font-body text-sm"><span className="text-fg">{nome}</span><span className="font-mono text-fg">{brl(v)}</span></div>
                          <div className="h-1.5 bg-surface-alt rounded-full mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(v / porCategoria[0][1].v) * 100}%`, backgroundColor: cor }} /></div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {movs.length === 0 && (
                  <p className="font-body text-sm text-fg-muted text-center py-6">
                    Nada lançado em {mesLabel(mes)}. Atendimento concluído entra sozinho; o resto você lança no +.
                  </p>
                )}
              </div>
            )}

            {/* ── EXTRATO ── */}
            {tab === 'extrato' && (
              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
                  {(['tudo', 'entrada', 'saida'] as FiltroTipo[]).map(f => (
                    <button key={f} onClick={() => setFiltroTipo(f)} className={chip(filtroTipo === f)}>
                      {f === 'tudo' ? 'Tudo' : f === 'entrada' ? 'Entradas' : 'Saídas'}
                    </button>
                  ))}
                  {profissionais.length > 1 && (
                    <select
                      value={filtroProf}
                      onChange={e => setFiltroProf(e.target.value)}
                      aria-label="Filtrar por barbeiro"
                      className="font-semibold shrink-0 bg-surface border border-line rounded-full px-3 py-1.5 font-ui text-[11px] text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber"
                    >
                      <option value="">Todos barbeiros</option>
                      {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  )}
                  <button onClick={exportar} className="font-semibold shrink-0 ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full border border-line font-ui text-[11px] text-fg-muted hover:text-amber">
                    <Download size={12} /> CSV
                  </button>
                </div>

                {porDia.length === 0 ? (
                  <p className="font-body text-sm text-fg-muted text-center py-8">Nenhum lançamento com esse filtro.</p>
                ) : porDia.map(([dia, lista]) => {
                  const totalDia = lista.reduce((s, m) => s + (m.tipo === 'entrada' ? 1 : -1) * Number(m.valor), 0)
                  return (
                    <section key={dia}>
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <p className="font-ui text-[11px] uppercase tracking-wider text-fg-muted">{diaLabel(dia)}</p>
                        <p className={`font-mono text-xs ${totalDia >= 0 ? 'text-entrada' : 'text-saida'}`}>{totalDia >= 0 ? '+' : ''}{brl(totalDia)}</p>
                      </div>
                      <ul className="bg-surface border border-line rounded-card divide-y divide-line">
                        {lista.map(m => {
                          const o = origemDe(m)
                          return (
                            <li key={m.id}>
                              <button
                                onClick={() => { setAberto(m); setEdit(null) }}
                                className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-surface-alt transition-colors"
                              >
                                <span className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: m.categoria?.cor ?? (m.tipo === 'entrada' ? 'var(--entrada)' : 'var(--saida)') }} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-body text-sm text-fg truncate">{m.descricao}</p>
                                  <p className="flex items-center gap-1 font-body text-xs text-fg-muted truncate">
                                    {o && <o.Icone size={10} />}
                                    {[m.categoria?.nome, m.profissional?.nome, o?.txt].filter(Boolean).join(' · ') || 'Manual'}
                                  </p>
                                </div>
                                <span className={`font-mono text-sm shrink-0 ${m.tipo === 'entrada' ? 'text-entrada' : 'text-saida'}`}>
                                  {m.tipo === 'entrada' ? '+' : '−'}{brl(Number(m.valor))}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  )
                })}
              </div>
            )}

            {/* ── FIXAS ── */}
            {tab === 'fixas' && !podeDespesasFixas && (
              <RecursoBloqueado
                titulo="Despesas fixas automáticas"
                texto="Cadastre aluguel, energia e internet uma vez e elas entram sozinhas no caixa todo mês. Faz parte do plano Barbearia. No seu plano, lance as saídas pelo botão Saída."
              />
            )}
            {tab === 'fixas' && podeDespesasFixas && (
              <div className="space-y-4">
                <div className="bg-surface border border-line rounded-card p-4">
                  <p className="font-ui text-xs uppercase tracking-wider text-fg-muted">Custo fixo por mês</p>
                  <p className="font-mono text-3xl text-saida mt-1">{brl(totalFixo)}</p>
                  <p className="font-body text-xs text-fg-muted mt-1">Cada uma entra sozinha no caixa no dia do vencimento.</p>
                </div>

                {despesas.length === 0 ? (
                  <p className="font-body text-sm text-fg-muted text-center py-6">Cadastre aluguel, energia, internet… e esqueça de lançar todo mês.</p>
                ) : (
                  <ul className="bg-surface border border-line rounded-card divide-y divide-line">
                    {despesas.map(d => (
                      <li key={d.id} className={`flex items-center gap-3 px-4 py-3 ${!d.ativa ? 'opacity-50' : ''}`}>
                        <button
                          role="switch"
                          aria-checked={d.ativa}
                          aria-label={d.ativa ? 'Pausar' : 'Ativar'}
                          onClick={() => toggleFixa(d)}
                          className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${d.ativa ? 'bg-amber' : 'bg-line'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-fg transition-transform ${d.ativa ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                        <button onClick={() => abrirFixa(d)} className="flex-1 min-w-0 text-left">
                          <p className="font-body text-sm text-fg truncate">{d.descricao}</p>
                          <p className="font-body text-xs text-fg-muted">Todo dia {d.dia_vencimento}{!d.ativa && ' · pausada'}</p>
                        </button>
                        <span className="font-mono text-sm text-saida shrink-0">{brl(Number(d.valor))}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => abrirFixa('nova')}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-line text-fg-muted font-ui text-xs uppercase tracking-wider py-3 rounded-card hover:border-amber hover:text-amber transition-colors"
                >
                  <Plus size={14} /> Nova despesa fixa
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Botões de lançar — sempre à mão */}
      {tab !== 'fixas' && (
        <div className="fixed bottom-20 inset-x-0 z-20 pointer-events-none">
          <div className="max-w-lg mx-auto px-4 flex gap-2 justify-end">
            <button onClick={() => abrirNovo('entrada')} className="font-semibold pointer-events-auto flex items-center gap-1.5 bg-surface-alt border border-entrada/40 text-entrada font-ui text-sm px-4 py-3 rounded-full shadow-lg shadow-black/40">
              <Plus size={14} /> Entrada
            </button>
            <button onClick={() => abrirNovo('saida')} className="font-semibold pointer-events-auto flex items-center gap-1.5 bg-amber text-accent-fg font-ui text-sm px-4 py-3 rounded-full shadow-lg shadow-black/40">
              <Plus size={14} /> Saída
            </button>
          </div>
        </div>
      )}

      {/* Modal: novo lançamento */}
      {modalNovo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalNovo(false)} />
          <form onSubmit={salvarNovo} className="relative w-full max-w-md bg-surface rounded-t-card border border-line p-6 z-10 space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex rounded-button border border-line overflow-hidden">
                {(['entrada', 'saida'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNovo(n => ({ ...n, tipo: t, categoria_id: '' }))}
                    className={`px-4 py-2 font-ui text-xs uppercase tracking-wider transition-colors ${novo.tipo === t ? (t === 'entrada' ? 'bg-entrada text-bg' : 'bg-saida text-bg') : 'text-fg-muted'}`}
                  >
                    {t === 'entrada' ? '+ Entrada' : '− Saída'}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setModalNovo(false)} aria-label="Fechar"><X size={18} className="text-fg-muted" /></button>
            </div>

            <div>
              <label className={labelCls} htmlFor="valor">Valor</label>
              <div className="flex items-baseline gap-2 border-b-2 border-line focus-within:border-amber transition-colors">
                <span className="font-mono text-xl text-fg-muted">R$</span>
                <input
                  id="valor"
                  autoFocus
                  inputMode="decimal"
                  value={novo.valor}
                  onChange={e => setNovo(n => ({ ...n, valor: e.target.value.replace(/[^\d,.]/g, '') }))}
                  placeholder="0,00"
                  required
                  className={`w-full bg-transparent py-2 font-mono text-4xl focus:outline-none placeholder:text-line ${novo.tipo === 'entrada' ? 'text-entrada' : 'text-saida'}`}
                />
              </div>
            </div>

            <div>
              <p className={labelCls}>Categoria</p>
              <div className="flex flex-wrap gap-2">
                {catsDoTipo.map(c => (
                  <button key={c.id} type="button" onClick={() => setNovo(n => ({ ...n, categoria_id: n.categoria_id === c.id ? '' : c.id }))} className={chip(novo.categoria_id === c.id)}>
                    {c.nome}
                  </button>
                ))}
                {novaCat === null ? (
                  <button type="button" onClick={() => setNovaCat('')} className="font-semibold shrink-0 px-3 py-1.5 rounded-full border border-dashed border-line font-ui text-[11px] text-fg-muted hover:text-amber">
                    + Nova
                  </button>
                ) : (
                  <span className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={novaCat}
                      onChange={e => setNovaCat(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); criarCategoria() } }}
                      placeholder="Nome"
                      maxLength={40}
                      className="w-28 bg-surface border border-line rounded-full px-3 py-1 font-body text-xs text-fg focus:outline-none focus:ring-1 focus:ring-amber"
                    />
                    <button type="button" onClick={criarCategoria} className="font-ui text-[11px] uppercase text-amber px-1">Ok</button>
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls} htmlFor="desc">Descrição (opcional)</label>
                <input id="desc" value={novo.descricao} onChange={e => setNovo(n => ({ ...n, descricao: e.target.value }))} maxLength={200} placeholder={novo.tipo === 'entrada' ? 'Ex.: venda de pomada' : 'Ex.: conta de luz'} className={inputCls} />
              </div>
              <div className={novo.tipo === 'entrada' && profissionais.length > 0 ? '' : 'col-span-2'}>
                <label className={labelCls} htmlFor="data">Data</label>
                <input id="data" type="date" value={novo.data} onChange={e => setNovo(n => ({ ...n, data: e.target.value }))} required className={inputCls} />
              </div>
              {novo.tipo === 'entrada' && profissionais.length > 0 && (
                <div>
                  <label className={labelCls} htmlFor="prof">Barbeiro</label>
                  <select id="prof" value={novo.profissional_id} onChange={e => setNovo(n => ({ ...n, profissional_id: e.target.value }))} className={inputCls}>
                    <option value="">—</option>
                    {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              )}
            </div>

            <button type="submit" disabled={salvandoNovo} className="font-semibold w-full bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm py-3.5 rounded-button transition-colors disabled:opacity-50">
              {salvandoNovo ? 'Lançando…' : 'Lançar'}
            </button>
          </form>
        </div>
      )}

      {/* Modal: detalhe do lançamento */}
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/60" onClick={() => { setAberto(null); setEdit(null) }} />
          <div className="relative w-full max-w-md bg-surface rounded-t-card border border-line p-6 z-10 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-ui text-xs uppercase tracking-wider text-fg-muted">{aberto.tipo === 'entrada' ? 'Entrada' : 'Saída'} · {diaLabel(aberto.data)}</p>
                <p className={`font-mono text-4xl mt-1 ${aberto.tipo === 'entrada' ? 'text-entrada' : 'text-saida'}`}>{brl(Number(aberto.valor))}</p>
              </div>
              <button onClick={() => { setAberto(null); setEdit(null) }} aria-label="Fechar"><X size={18} className="text-fg-muted" /></button>
            </div>

            {edit ? (
              <div className="space-y-3">
                <div>
                  <label className={labelCls} htmlFor="e-desc">Descrição</label>
                  <input id="e-desc" value={edit.descricao} onChange={e => setEdit({ ...edit, descricao: e.target.value })} className={inputCls} />
                </div>
                {!aberto.agendamento_id && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls} htmlFor="e-valor">Valor</label>
                      <input id="e-valor" inputMode="decimal" value={edit.valor} onChange={e => setEdit({ ...edit, valor: e.target.value.replace(/[^\d,.]/g, '') })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="e-data">Data</label>
                      <input id="e-data" type="date" value={edit.data} onChange={e => setEdit({ ...edit, data: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setEdit(null)} className="font-semibold flex-1 border border-line text-fg-muted font-ui text-sm py-3 rounded-button">Voltar</button>
                  <button onClick={salvarEdicao} className="font-semibold flex-1 bg-amber text-accent-fg font-ui text-sm py-3 rounded-button">Salvar</button>
                </div>
              </div>
            ) : (
              <>
                <dl className="space-y-2 font-body text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-fg-muted">Descrição</dt><dd className="text-fg text-right">{aberto.descricao}</dd></div>
                  {aberto.categoria && <div className="flex justify-between gap-4"><dt className="text-fg-muted">Categoria</dt><dd className="text-fg">{aberto.categoria.nome}</dd></div>}
                  {aberto.profissional && <div className="flex justify-between gap-4"><dt className="text-fg-muted">Barbeiro</dt><dd className="text-fg">{aberto.profissional.nome}</dd></div>}
                  <div className="flex justify-between gap-4"><dt className="text-fg-muted">Origem</dt><dd className="text-fg">{origemDe(aberto)?.txt ?? 'Lançado à mão'}</dd></div>
                </dl>
                {aberto.agendamento_id && (
                  <p className="font-body text-xs text-fg-muted bg-surface-alt rounded-button px-3 py-2">
                    Entrou sozinha quando o atendimento foi concluído. Pra tirar do caixa, desfaça o &ldquo;concluído&rdquo; na Agenda.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setEdit({ descricao: aberto.descricao, valor: String(aberto.valor).replace('.', ','), data: aberto.data })}
                    className="font-semibold flex-1 flex items-center justify-center gap-1.5 border border-line text-fg font-ui text-sm py-3 rounded-button hover:border-amber/50"
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  {!aberto.agendamento_id && (
                    <button onClick={() => apagar(aberto)} className="font-semibold flex-1 flex items-center justify-center gap-1.5 border border-saida/30 text-saida font-ui text-sm py-3 rounded-button hover:bg-saida/5">
                      <Trash2 size={13} /> Apagar
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal: despesa fixa */}
      {modalFixa && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalFixa(null)} />
          <form onSubmit={salvarFixa} className="relative w-full max-w-md bg-surface rounded-t-card border border-line p-6 z-10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold font-ui text-lg text-fg">{modalFixa === 'nova' ? 'Nova despesa fixa' : 'Despesa fixa'}</h2>
              <button type="button" onClick={() => setModalFixa(null)} aria-label="Fechar"><X size={18} className="text-fg-muted" /></button>
            </div>
            <div>
              <label className={labelCls} htmlFor="f-desc">O que é</label>
              <input id="f-desc" value={fixaForm.descricao} onChange={e => setFixaForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Aluguel, energia, internet…" required maxLength={200} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="f-valor">Valor (R$)</label>
                <input id="f-valor" inputMode="decimal" value={fixaForm.valor} onChange={e => setFixaForm(f => ({ ...f, valor: e.target.value.replace(/[^\d,.]/g, '') }))} placeholder="0,00" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="f-dia">Vence todo dia</label>
                <input id="f-dia" type="number" min={1} max={28} value={fixaForm.dia_vencimento} onChange={e => setFixaForm(f => ({ ...f, dia_vencimento: e.target.value }))} required className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2">
              {modalFixa !== 'nova' && (
                <button type="button" onClick={() => deletarFixa(modalFixa)} className="px-4 border border-saida/30 text-saida rounded-button" aria-label="Apagar despesa fixa">
                  <Trash2 size={14} />
                </button>
              )}
              <button type="submit" className="font-semibold flex-1 bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm py-3 rounded-button transition-colors">
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
