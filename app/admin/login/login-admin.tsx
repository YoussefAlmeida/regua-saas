'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'

export default function LoginAdmin() {
  const router = useRouter()
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setEntrando(true)
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    }).catch(() => null)
    setEntrando(false)
    if (!res) { setErro('Sem conexão.'); return }
    if (!res.ok) { setErro((await res.json().catch(() => ({}))).erro ?? 'Não deu pra entrar'); return }
    router.replace('/admin')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <ShieldCheck size={28} className="mx-auto text-amber mb-2" />
          <h1 className="font-display text-4xl text-amber">Régua</h1>
          <p className="font-ui text-[11px] uppercase tracking-[0.2em] text-fg-muted">Painel do dono do sistema</p>
        </div>
        <form onSubmit={entrar} className="bg-surface border border-line rounded-card p-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="senha" className="font-ui text-sm font-medium text-fg">Senha do admin</label>
            <input
              id="senha"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              className="w-full bg-surface border border-line rounded-button px-3 py-2.5 font-body text-base text-fg focus:outline-none focus:ring-1 focus:ring-amber"
            />
          </div>
          {erro && <p className="font-body text-sm text-saida" role="alert">{erro}</p>}
          <button type="submit" disabled={entrando} className="font-semibold w-full bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm rounded-button py-3 transition-colors disabled:opacity-50">
            {entrando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="font-body text-[11px] text-fg-muted text-center">A senha é a variável ADMIN_TOKEN da Vercel.</p>
      </div>
    </div>
  )
}
