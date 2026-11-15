'use client'

import { confirmar } from '@/components/confirmar'
import { useState } from 'react'
import Image from 'next/image'
import { Plus, Trash2, Clock, Check, X, ImagePlus, ChevronRight } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'
import { formatBRL } from '@/lib/utils'

interface Servico {
  id: string
  nome: string
  preco: number
  duracao_min: number
  cor: string
  ativo: boolean
  foto_url?: string | null
  descricao?: string | null
}

interface FormData { nome: string; preco: string; duracao_min: string; cor: string; descricao: string }

const FORM_VAZIO: FormData = { nome: '', preco: '', duracao_min: '30', cor: '#F5D900', descricao: '' }

export default function ServicosClient({
  servicosIniciais,
}: {
  servicosIniciais: Servico[]
  barbearia_id: string
}) {
  const [servicos, setServicos] = useState(servicosIniciais)
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null)
  const [editando, setEditando] = useState<Servico | null>(null)
  const [form, setForm] = useState<FormData>(FORM_VAZIO)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [enviandoFoto, setEnviandoFoto] = useState<string | null>(null)
  // Foto escolhida no formulário de um serviço novo: sobe depois de criar
  const [fotoNova, setFotoNova] = useState<{ arquivo: File; previa: string } | null>(null)
  function escolherFoto(arquivo: File | undefined) {
    if (!arquivo) return
    if (editando) { enviarFoto(editando, arquivo); return }
    setFotoNova(f => { if (f) URL.revokeObjectURL(f.previa); return { arquivo, previa: URL.createObjectURL(arquivo) } })
  }
  async function enviarFoto(s: Servico, arquivo: File | undefined) {
    if (!arquivo) return
    setEnviandoFoto(s.id)
    const fd = new FormData(); fd.append('arquivo', arquivo)
    const res = await fetch(`/api/painel/servicos/${s.id}/foto`, { method: 'POST', body: fd }).catch(() => null)
    setEnviandoFoto(null)
    if (!res) { avisar('Sem conexão. Confere a internet e tenta de novo.', 'erro'); return }
    if (!res.ok) { avisar(await erroDaResposta(res), 'erro'); return }
    const { url } = await res.json()
    setServicos(prev => prev.map(x => x.id === s.id ? { ...x, foto_url: url } : x))
    setEditando(e => e && e.id === s.id ? { ...e, foto_url: url } : e)
    avisar('Foto do serviço atualizada.', 'sucesso')
  }

  function abrirNovo() {
    setForm(FORM_VAZIO)
    setEditando(null)
    setErro('')
    setModal('novo')
  }

  function abrirEditar(s: Servico) {
    setForm({ nome: s.nome, preco: String(s.preco), duracao_min: String(s.duracao_min), cor: s.cor, descricao: s.descricao ?? '' })
    setEditando(s)
    setErro('')
    setModal('editar')
  }

  function fechar() { setModal(null); setErro(''); setFotoNova(f => { if (f) URL.revokeObjectURL(f.previa); return null }) }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    const preco = parseFloat(form.preco)
    const duracao_min = parseInt(form.duracao_min)
    if (isNaN(preco) || preco < 0) { setErro('Preço inválido'); setSalvando(false); return }
    if (isNaN(duracao_min) || duracao_min < 5) { setErro('Duração mínima: 5 min'); setSalvando(false); return }

    // A descrição só vai quando foi preenchida ou já existia (coluna nova no banco)
    const descricao = form.descricao.trim()
    const payload = { nome: form.nome.trim(), preco, duracao_min, cor: form.cor, ...(descricao || editando?.descricao ? { descricao: descricao || null } : {}) }

    let res: Response
    if (editando) {
      res = await fetch(`/api/painel/servicos/${editando.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      res = await fetch('/api/painel/servicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    const json = await res.json()
    setSalvando(false)

    if (!res.ok) { setErro(json.erro || 'Erro ao salvar'); return }

    if (editando) {
      setServicos(s => s.map(x => x.id === editando.id ? json : x))
    } else {
      setServicos(s => [...s, json].sort((a, b) => a.nome.localeCompare(b.nome)))
      if (fotoNova) await enviarFoto(json, fotoNova.arquivo)
    }
    fechar()
  }

  async function toggleAtivo(s: Servico) {
    const res = await fetch(`/api/painel/servicos/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !s.ativo }),
    })
    if (res.ok) {
      const json = await res.json()
      setServicos(prev => prev.map(x => x.id === s.id ? json : x))
      setEditando(e => e && e.id === s.id ? json : e)
    } else avisar(await erroDaResposta(res), 'erro')
  }

  async function deletar(s: Servico) {
    if (!(await confirmar(`Apagar "${s.nome}"?`, 'Se o serviço já foi usado em atendimentos, ele é só desativado, pra manter o histórico.', { rotulo: 'Apagar', perigo: true }))) return
    const res = await fetch(`/api/painel/servicos/${s.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) { avisar(json.erro ?? 'Não deu pra apagar', 'erro'); return }
    if (json.arquivado) {
      // Tem atendimento no histórico: foi desativado, não apagado
      setServicos(prev => prev.map(x => x.id === s.id ? json.servico : x))
      avisar(`"${s.nome}" já foi usado em atendimentos, então foi desativado em vez de apagado.`, 'info')
      fechar()
      return
    }
    setServicos(prev => prev.filter(x => x.id !== s.id))
    fechar()
  }

  const inputCls = 'ds-input'
  const labelCls = 'ds-label'

  return (
    <div className="px-4 md:px-8 py-6 max-w-lg md:max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="ds-titulo">Serviços</h1>
        <button
          onClick={abrirNovo}
          className="font-semibold flex items-center gap-2 bg-amber hover:bg-accent-press text-accent-fg font-ui text-xs px-4 py-2 rounded-button transition-colors"
        >
          <Plus size={14} />
          Adicionar
        </button>
      </div>

      {servicos.length === 0 ? (
        <div className="text-center py-16 text-fg-muted">
          <Scissors size={40} className="mx-auto mb-3 opacity-30" strokeWidth={1} />
          <p className="font-semibold font-ui text-sm">Nenhum serviço cadastrado</p>
          <button onClick={abrirNovo} className="mt-4 text-amber font-body text-sm hover:underline">
            Adicionar primeiro serviço
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3">
          {servicos.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => abrirEditar(s)}
              className={`ds-card w-full text-left px-4 py-3.5 flex items-center gap-3 hover:border-amber/40 transition-colors ${s.ativo ? '' : 'opacity-50'}`}
            >
              <span className="relative w-14 h-14 rounded-button overflow-hidden bg-surface-alt border border-line flex items-center justify-center shrink-0">
                {s.foto_url
                  ? <Image src={s.foto_url} alt="" fill sizes="56px" className="object-cover" />
                  : <Scissors size={17} className="text-fg-muted" aria-hidden />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold font-ui text-sm text-fg truncate">{s.nome}</span>
                {s.descricao && <span className="block font-body text-xs text-fg-muted truncate">{s.descricao}</span>}
                <span className="flex items-center gap-3 mt-0.5">
                  <span className="font-mono text-sm text-amber">{formatBRL(s.preco)}</span>
                  <span className="flex items-center gap-1 font-body text-xs text-fg-muted whitespace-nowrap"><Clock size={11} aria-hidden /> {s.duracao_min} min</span>
                  {!s.ativo && <span className="ds-tag bg-surface-alt text-fg-muted">Desativado</span>}
                </span>
              </span>
              <ChevronRight size={16} className="text-fg-muted shrink-0" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={fechar} />
          <div className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-surface rounded-t-card sm:rounded-card border border-line p-6 z-10">
            <h2 className="font-semibold font-ui text-lg text-fg mb-5">
              {modal === 'novo' ? 'Novo serviço' : 'Editar serviço'}
            </h2>

            <form onSubmit={salvar} className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="relative w-20 h-20 rounded-button overflow-hidden bg-surface-alt border border-line flex items-center justify-center shrink-0">
                  {(editando?.foto_url || fotoNova)
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={fotoNova?.previa ?? editando!.foto_url!} alt="" className={`w-full h-full object-cover ${enviandoFoto ? 'opacity-40' : ''}`} />
                    : <ImagePlus size={20} className="text-fg-muted" aria-hidden />}
                </span>
                <span>
                  <span className="block font-ui text-sm font-semibold text-amber">{enviandoFoto ? 'Enviando…' : (editando?.foto_url || fotoNova) ? 'Trocar a foto' : 'Colocar uma foto'}</span>
                  <span className="block font-body text-xs text-fg-muted">Aparece na página de agendamento</span>
                </span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => { escolherFoto(e.target.files?.[0]); e.target.value = '' }} />
              </label>

              <div>
                <label className={labelCls}>Nome</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Corte simples"
                  required
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Descrição curta <span className="text-fg-muted font-normal">(opcional)</span></label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="tesoura e máquina, com acabamento"
                  maxLength={140}
                  className={inputCls}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelCls}>Preço (R$)</label>
                  <input
                    type="number"
                    value={form.preco}
                    onChange={e => setForm(f => ({ ...f, preco: e.target.value }))}
                    placeholder="35.00"
                    min="0"
                    step="0.50"
                    required
                    className={inputCls}
                  />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Duração (min)</label>
                  <input
                    type="number"
                    value={form.duracao_min}
                    onChange={e => setForm(f => ({ ...f, duracao_min: e.target.value }))}
                    placeholder="30"
                    min="5"
                    step="5"
                    required
                    className={inputCls}
                  />
                </div>
              </div>

              {erro && <p className="font-body text-sm text-saida">{erro}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={fechar}
                  className="font-semibold flex-1 border border-line text-fg-muted font-ui text-sm py-2.5 rounded-button hover:border-fg/30 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="font-semibold flex-1 bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm py-2.5 rounded-button transition-colors disabled:opacity-50"
                >
                  {salvando ? 'Salvando…' : 'Salvar'}
                </button>
              </div>

              {editando && (
                <div className="flex gap-3 pt-3 border-t border-line">
                  <button type="button" onClick={() => toggleAtivo(editando)} className="ds-btn-ghost flex-1 !min-h-[40px] text-xs">
                    {editando.ativo ? <><X size={14} aria-hidden /> Desativar</> : <><Check size={14} aria-hidden /> Reativar</>}
                  </button>
                  <button type="button" onClick={() => deletar(editando)} className="ds-btn-ghost flex-1 !min-h-[40px] text-xs !text-saida">
                    <Trash2 size={14} aria-hidden /> Excluir serviço
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Scissors({ size, className, strokeWidth }: { size: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  )
}
