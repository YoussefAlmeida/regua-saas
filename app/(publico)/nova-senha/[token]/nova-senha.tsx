'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'
import { problemaNaSenha } from '@/lib/senha'

export default function NovaSenha({ token, nome, minimo }: { token: string; nome: string; minimo: number }) {
  const router = useRouter()
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (senha !== confirma) { setErro('As duas senhas não estão iguais'); return }
    const problema = problemaNaSenha(senha, [], minimo)
    if (problema) { setErro(problema); return }
    setSalvando(true)
    const res = await fetch('/api/auth/nova-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, senha }),
    }).catch(() => null)
    setSalvando(false)
    if (!res) { setErro('Sem conexão. Tenta de novo.'); return }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setErro(json.erro ?? 'Não deu pra salvar'); return }
    if (json.aviso) { setAviso(json.aviso); return }
    router.replace(json.destino ?? '/entrar')
  }

  const inputCls = 'w-full bg-surface border border-line rounded-button px-4 py-3 font-body text-base text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber'

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <KeyRound size={26} className="text-amber mb-2" />
          <h1 className="font-display text-4xl text-fg">Senha nova</h1>
          <p className="font-body text-sm text-fg-muted mt-1">Oi, {nome.split(' ')[0]}! Escolhe sua senha nova.</p>
        </div>
        {aviso ? (
          <p className="bg-surface border border-entrada/30 rounded-card p-5 font-body text-sm text-fg">{aviso}</p>
        ) : (
          <form onSubmit={salvar} className="bg-surface border border-line rounded-card p-5 space-y-4">
            <div>
              <label htmlFor="s1" className="font-ui text-sm font-medium text-fg block mb-1">Senha nova</label>
              <input id="s1" type="password" autoComplete="new-password" inputMode={minimo === 4 ? 'numeric' : undefined}
                value={senha} onChange={e => setSenha(e.target.value)} placeholder={`mínimo ${minimo} ${minimo === 4 ? 'dígitos' : 'caracteres'}`} required autoFocus className={inputCls} />
            </div>
            <div>
              <label htmlFor="s2" className="font-ui text-sm font-medium text-fg block mb-1">Repete a senha</label>
              <input id="s2" type="password" autoComplete="new-password" inputMode={minimo === 4 ? 'numeric' : undefined}
                value={confirma} onChange={e => setConfirma(e.target.value)} required className={inputCls} />
            </div>
            {erro && <p className="font-body text-sm text-saida" role="alert">{erro}</p>}
            <button type="submit" disabled={salvando} className="font-semibold w-full bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm py-3 rounded-button transition-colors disabled:opacity-50">
              {salvando ? 'Salvando…' : 'Salvar e entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
