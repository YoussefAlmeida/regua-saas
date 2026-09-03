'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Estado = 'form' | 'sucesso' | 'erro'

export default function ConvitePage() {
  const { token } = useParams<{ token: string }>()
  const [estado, setEstado] = useState<Estado>('form')
  const [carregando, setCarregando] = useState(false)
  const [erroMsg, setErroMsg] = useState('')
  const [form, setForm] = useState({ nome: '', whatsapp: '', senha: '', senha_confirm: '' })

  function update(campo: string, valor: string) {
    setForm(f => ({ ...f, [campo]: valor }))
    setErroMsg('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.senha !== form.senha_confirm) { setErroMsg('As senhas não coincidem'); return }
    if (form.senha.length < 8) { setErroMsg('Senha deve ter pelo menos 8 caracteres'); return }

    setCarregando(true)
    const res = await fetch('/api/auth/convite/aceitar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        nome: form.nome,
        whatsapp: form.whatsapp,
        senha: form.senha,
      }),
    })

    const json = await res.json()
    setCarregando(false)

    if (!res.ok) {
      if (res.status === 400) setEstado('erro')
      else setErroMsg(json.erro || 'Erro ao criar conta')
      return
    }

    setEstado('sucesso')
  }

  const inputCls = 'w-full bg-surface-alt border border-line rounded-button px-4 py-3 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber'
  const labelCls = 'font-ui text-xs uppercase tracking-wider text-fg-muted'

  if (estado === 'sucesso') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">✓</div>
        <h2 className="font-display text-3xl text-amber mb-2">Cadastro feito!</h2>
        <p className="font-body text-fg-muted max-w-xs">
          Aguarde o dono da barbearia aprovar seu acesso. Você será avisado pelo WhatsApp.
        </p>
        <Link href="/entrar" className="mt-8 font-ui text-sm uppercase tracking-wider text-amber hover:underline">
          Ir para o login
        </Link>
      </div>
    )
  }

  if (estado === 'erro') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">✗</div>
        <h2 className="font-display text-3xl text-saida mb-2">Link inválido</h2>
        <p className="font-body text-fg-muted">Este link de convite expirou ou é inválido.</p>
        <Link href="/entrar" className="mt-8 font-ui text-sm uppercase tracking-wider text-amber hover:underline">
          Ir para o login
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="font-display text-5xl text-amber tracking-widest">RÉGUA</h1>
        <p className="font-ui text-fg-muted text-xs uppercase tracking-[0.2em] mt-1">convite de barbeiro</p>
      </div>

      <div className="w-full max-w-sm bg-surface rounded-card border border-line p-6">
        <h2 className="font-ui text-lg uppercase tracking-wider text-fg mb-4">Criar seu acesso</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className={labelCls}>Seu nome</label>
            <input type="text" value={form.nome} onChange={e => update('nome', e.target.value)} placeholder="João Silva" required className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>WhatsApp</label>
            <input type="tel" value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} placeholder="(71) 99999-0000" required className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Senha</label>
            <input type="password" value={form.senha} onChange={e => update('senha', e.target.value)} placeholder="mínimo 8 caracteres" required minLength={8} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Confirmar senha</label>
            <input type="password" value={form.senha_confirm} onChange={e => update('senha_confirm', e.target.value)} placeholder="••••••••" required className={inputCls} />
          </div>

          {erroMsg && <p className="font-body text-sm text-saida">{erroMsg}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-amber hover:bg-accent-press text-accent-fg font-ui uppercase tracking-wider text-sm py-3 rounded-button transition-colors disabled:opacity-50"
          >
            {carregando ? 'Cadastrando…' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
