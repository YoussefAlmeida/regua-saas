'use client'

import { useState } from 'react'
import { problemaNaSenha } from '@/lib/senha'
import { useRouter } from 'next/navigation'
import { Marca } from '@/components/marca'
import Link from 'next/link'

type Etapa = 'barbearia' | 'dono'

export default function CadastroBarbeariaPage() {
  const router = useRouter()
  const [etapa, setEtapa] = useState<Etapa>('barbearia')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    barbearia_nome: '',
    barbearia_instagram: '',
    barbearia_telefone: '',
    barbearia_endereco: '',
    dono_nome: '',
    dono_email: '',
    dono_senha: '',
    dono_senha_confirm: '',
  })
  const [aceite, setAceite] = useState(false)

  function update(campo: string, valor: string) {
    setForm(f => ({ ...f, [campo]: valor }))
    setErro('')
  }

  function avancar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.barbearia_nome.trim()) { setErro('Nome da barbearia obrigatório'); return }
    setEtapa('dono')
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (form.dono_senha !== form.dono_senha_confirm) {
      setErro('As senhas não coincidem')
      return
    }
    const problema = problemaNaSenha(form.dono_senha, [form.dono_email.split('@')[0], form.barbearia_telefone])
    if (problema) { setErro(problema); return }
    if (!aceite) { setErro('Aceite os Termos e a Política de Privacidade pra continuar'); return }

    setCarregando(true)
    try {
      const res = await fetch('/api/auth/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbearia_nome: form.barbearia_nome,
          barbearia_instagram: form.barbearia_instagram || undefined,
          barbearia_telefone: form.barbearia_telefone || undefined,
          barbearia_endereco: form.barbearia_endereco || undefined,
          dono_nome: form.dono_nome,
          dono_email: form.dono_email,
          dono_senha: form.dono_senha,
          aceite: true,
          ref: new URLSearchParams(window.location.search).get('ref') || undefined,
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErro((json as { erro?: string }).erro || 'Erro ao cadastrar'); return }
      router.replace('/painel/comecar')
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  const inputCls = 'w-full bg-surface border border-line rounded-button px-4 py-3 font-body text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber'
  const labelCls = 'font-ui text-sm font-medium text-fg'

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 aria-label="RÉGUA"><Marca className="text-fg scale-150 origin-center" /></h1>
        <p className="font-body text-fg-muted text-sm mt-4">
          {etapa === 'barbearia' ? 'Passo 1 de 2 · sua barbearia' : 'Passo 2 de 2 · seu acesso'}
        </p>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {(['barbearia', 'dono'] as Etapa[]).map((e, i) => (
          <div
            key={e}
            className={`h-1 w-16 rounded-full transition-colors ${
              etapa === e || (i === 0 && etapa === 'dono') ? 'bg-amber' : 'bg-line'
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-sm bg-surface rounded-card border border-line p-6">
        {etapa === 'barbearia' ? (
          <form onSubmit={avancar} className="space-y-4">
            <h2 className="font-semibold font-ui text-lg text-fg mb-2">Sua barbearia</h2>

            <div className="space-y-1">
              <label className={labelCls}>Nome da barbearia *</label>
              <input
                type="text"
                value={form.barbearia_nome}
                onChange={e => update('barbearia_nome', e.target.value)}
                placeholder="Barbearia do João"
                required
                className={inputCls}
              />
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Instagram</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted font-body text-sm">@</span>
                <input
                  type="text"
                  value={form.barbearia_instagram}
                  onChange={e => update('barbearia_instagram', e.target.value)}
                  placeholder="barbeariajoa0"
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Telefone / WhatsApp</label>
              <input
                type="tel"
                value={form.barbearia_telefone}
                onChange={e => update('barbearia_telefone', e.target.value)}
                placeholder="(71) 99999-0000"
                className={inputCls}
              />
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Endereço</label>
              <input
                type="text"
                value={form.barbearia_endereco}
                onChange={e => update('barbearia_endereco', e.target.value)}
                placeholder="Rua das Flores, 42 — Feira de Santana"
                className={inputCls}
              />
            </div>

            {erro && <p className="font-body text-sm text-saida">{erro}</p>}

            <button
              type="submit"
              className="font-semibold w-full bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm py-3 rounded-button transition-colors"
            >
              Próximo
            </button>
          </form>
        ) : (
          <form onSubmit={cadastrar} className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button
                type="button"
                onClick={() => { setEtapa('barbearia'); setErro('') }}
                className="text-fg-muted hover:text-fg transition-colors text-sm font-body"
              >
                ← Voltar
              </button>
              <h2 className="font-semibold font-ui text-lg text-fg">Seu acesso</h2>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Seu nome *</label>
              <input
                type="text"
                value={form.dono_nome}
                onChange={e => update('dono_nome', e.target.value)}
                placeholder="João Silva"
                required
                className={inputCls}
              />
            </div>

            <div className="space-y-1">
              <label className={labelCls}>E-mail *</label>
              <input
                type="email"
                value={form.dono_email}
                onChange={e => update('dono_email', e.target.value)}
                placeholder="joao@exemplo.com"
                required
                className={inputCls}
              />
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Senha *</label>
              <input
                type="password"
                value={form.dono_senha}
                onChange={e => update('dono_senha', e.target.value)}
                placeholder="mínimo 8 caracteres"
                required
                minLength={8}
                className={inputCls}
              />
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Confirmar senha *</label>
              <input
                type="password"
                value={form.dono_senha_confirm}
                onChange={e => update('dono_senha_confirm', e.target.value)}
                placeholder="••••••••"
                required
                className={inputCls}
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer py-1">
              <input type="checkbox" checked={aceite} onChange={e => { setAceite(e.target.checked); setErro('') }}
                className="mt-0.5 w-5 h-5 accent-amber shrink-0" />
              <span className="font-body text-xs text-fg-muted">
                Li e aceito os <Link href="/termos" target="_blank" className="text-amber hover:underline">Termos de Uso</Link> e
                a <Link href="/privacidade" target="_blank" className="text-amber hover:underline">Política de Privacidade</Link>.
              </span>
            </label>

            {erro && <p className="font-body text-sm text-saida">{erro}</p>}

            <button
              type="submit"
              disabled={carregando}
              className="font-semibold w-full bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm py-3 rounded-button transition-colors disabled:opacity-50"
            >
              {carregando ? 'Criando conta…' : 'Criar barbearia'}
            </button>
          </form>
        )}
      </div>

      <p className="text-center font-body text-sm text-fg-muted mt-6">
        Já tem conta?{' '}
        <Link href="/entrar" className="text-amber hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
