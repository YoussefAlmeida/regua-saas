'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Marca } from '@/components/marca'
import Link from 'next/link'

type Tipo = 'dono' | 'barbeiro'

export default function EntrarPage() {
  const router = useRouter()
  const [tipo, setTipo] = useState<Tipo>('dono')
  const [credencial, setCredencial] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [linkCliente, setLinkCliente] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const body =
      tipo === 'dono'
        ? { tipo: 'dono', email: credencial, senha }
        : { tipo: 'barbeiro', whatsapp: credencial, senha }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErro((json as { erro?: string }).erro || 'Erro ao entrar')
        setLinkCliente((json as { linkCliente?: string | null }).linkCliente ?? null)
        return
      }

      router.replace((json as { destino?: string }).destino ?? '/painel/hoje')
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <div className="mb-10 text-center">
        <h1 aria-label="RÉGUA"><Marca className="text-fg scale-150 origin-center" /></h1>
        <p className="font-body text-fg-muted text-sm mt-4">
          Agenda e caixa da barbearia
        </p>
      </div>

      <div className="w-full max-w-sm">
        {/* Toggle dono / barbeiro */}
        <div className="flex rounded-button border border-line overflow-hidden mb-6">
          <button
            type="button"
            onClick={() => { setTipo('dono'); setCredencial(''); setErro(''); setLinkCliente(null) }}
            className={`font-semibold flex-1 py-2.5 font-ui text-sm transition-colors ${
              tipo === 'dono' ? 'bg-amber text-accent-fg' : 'text-fg-muted hover:text-fg'
            }`}
          >
            Sou dono
          </button>
          <button
            type="button"
            onClick={() => { setTipo('barbeiro'); setCredencial(''); setErro(''); setLinkCliente(null) }}
            className={`font-semibold flex-1 py-2.5 font-ui text-sm transition-colors ${
              tipo === 'barbeiro' ? 'bg-amber text-accent-fg' : 'text-fg-muted hover:text-fg'
            }`}
          >
            Sou barbeiro
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-card border border-line p-6 space-y-4">
          <div className="space-y-1">
            <label className="font-ui text-sm font-medium text-fg">
              {tipo === 'dono' ? 'E-mail' : 'WhatsApp'}
            </label>
            <input
              type={tipo === 'dono' ? 'email' : 'tel'}
              value={credencial}
              onChange={e => setCredencial(e.target.value)}
              placeholder={tipo === 'dono' ? 'dono@exemplo.com' : '(71) 99999-0000'}
              required
              className="w-full bg-surface border border-line rounded-button px-4 py-3 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber"
            />
          </div>

          <div className="space-y-1">
            <label className="font-ui text-sm font-medium text-fg">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-surface border border-line rounded-button px-4 py-3 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber"
            />
          </div>

          {erro && (
            <p className="font-body text-sm text-saida" role="alert">
              {erro}{' '}
              {linkCliente && <Link href={linkCliente} className="underline font-semibold">Ir para Meus horários</Link>}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="font-semibold w-full bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm py-3 rounded-button transition-colors disabled:opacity-50"
          >
            {carregando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center mt-4">
          <Link href={`/recuperar-senha${tipo === 'dono' ? '?t=dono' : ''}`} className="font-body text-xs text-fg-muted hover:text-amber">
            Esqueci minha senha
          </Link>
        </p>

        <p className="text-center font-body text-xs text-fg-muted mt-5 leading-relaxed">
          {tipo === 'dono'
            ? 'Dono que também corta entra aqui, com o e-mail. Você vê a barbearia toda e a sua agenda.'
            : 'Dono entra na aba "Sou dono", mesmo que também corte. Cliente entra pelo link da barbearia.'}
        </p>

        {tipo === 'dono' && (
          <p className="text-center font-body text-sm text-fg-muted mt-6">
            Ainda não tem barbearia?{' '}
            <Link href="/cadastro-barbearia" className="text-amber hover:underline">
              Cadastre-se grátis
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
