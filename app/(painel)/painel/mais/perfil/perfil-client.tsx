'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, Camera, Check } from 'lucide-react'
import { avisar, erroDaResposta } from '@/components/aviso'

export default function PerfilClient({ inicial }: { inicial: { nome: string; especialidade: string; foto_url: string | null } }) {
  const [nome, setNome] = useState(inicial.nome)
  const [especialidade, setEspecialidade] = useState(inicial.especialidade)
  const [foto, setFoto] = useState(inicial.foto_url)
  const [salvando, setSalvando] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function enviarFoto(arquivo: File) {
    if (arquivo.size > 2 * 1024 * 1024) { avisar('Foto grande demais (máximo 2 MB).', 'erro'); return }
    setEnviandoFoto(true)
    const fd = new FormData()
    fd.append('foto', arquivo)
    const res = await fetch('/api/painel/perfil/foto', { method: 'POST', body: fd }).catch(() => null)
    setEnviandoFoto(false)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    setFoto((await res.json()).foto_url)
    avisar('Foto atualizada. Os clientes já veem na hora de agendar.', 'sucesso')
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    const res = await fetch('/api/painel/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, especialidade: especialidade || null }),
    }).catch(() => null)
    setSalvando(false)
    if (!res?.ok) { avisar(res ? await erroDaResposta(res) : 'Sem conexão.', 'erro'); return }
    avisar('Perfil salvo.', 'sucesso')
  }

  const inputCls = 'w-full bg-surface-alt border border-line rounded-button px-4 py-3 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber'
  const labelCls = 'font-ui text-xs uppercase tracking-wider text-fg-muted block mb-1'

  return (
    <form onSubmit={salvar} className="px-4 py-6 max-w-lg mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/painel/mais" className="text-fg-muted hover:text-fg" aria-label="Voltar"><ChevronLeft size={20} /></Link>
        <h1 className="font-ui text-xl uppercase tracking-widest text-fg">Meu perfil</h1>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={enviandoFoto}
          className="relative w-28 h-28 rounded-full bg-surface-alt border-2 border-line hover:border-amber/50 overflow-hidden flex items-center justify-center transition-colors"
          aria-label="Trocar foto"
        >
          {foto
            ? <Image src={foto} alt="Sua foto" fill sizes="112px" className="object-cover" />
            : <span className="font-display text-4xl text-amber">{nome.charAt(0).toUpperCase() || '?'}</span>}
          <span className="absolute bottom-0 inset-x-0 bg-black/60 py-1 flex justify-center">
            <Camera size={14} className="text-fg" />
          </span>
          {enviandoFoto && <span className="absolute inset-0 bg-black/50 animate-pulse" />}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) enviarFoto(f); e.target.value = '' }}
        />
        <p className="font-body text-xs text-fg-muted">Aparece pro cliente na hora de escolher o barbeiro</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="nome">Nome que aparece</label>
          <input id="nome" value={nome} onChange={e => setNome(e.target.value)} required minLength={2} maxLength={80} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="esp">Especialidade</label>
          <input id="esp" value={especialidade} onChange={e => setEspecialidade(e.target.value)} maxLength={80} placeholder="Ex.: degradê, barba, pigmentação" className={inputCls} />
        </div>
      </div>

      <button type="submit" disabled={salvando} className="w-full flex items-center justify-center gap-2 bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm uppercase tracking-wider py-3 rounded-button transition-colors disabled:opacity-50">
        <Check size={14} /> {salvando ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  )
}
