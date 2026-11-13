'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, LogOut, Trash2, Check } from 'lucide-react'
import NavCliente from '@/components/cliente/nav-cliente'

/* Perfil do cliente: corrigir o nome, baixar os próprios dados, apagar a conta e sair */
export default function PerfilCliente({ barbearia, nomeInicial, whatsapp }: {
  barbearia: { nome: string; slug: string }
  nomeInicial: string
  whatsapp: string
}) {
  const router = useRouter()
  const [nome, setNome] = useState(nomeInicial)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')
  const [apagar, setApagar] = useState(false)
  const [senha, setSenha] = useState('')
  const [apagando, setApagando] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(''); setSalvando(true)
    const res = await fetch('/api/cliente/perfil', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome }) }).catch(() => null)
    setSalvando(false)
    if (!res?.ok) { setErro(res ? (await res.json().catch(() => ({}))).erro ?? 'Não deu pra salvar' : 'Sem conexão.'); return }
    setSalvo(true); setTimeout(() => setSalvo(false), 2500)
  }

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    router.replace(`/${barbearia.slug}`)
    router.refresh()
  }

  async function apagarConta(e: React.FormEvent) {
    e.preventDefault()
    setErro(''); setApagando(true)
    const res = await fetch('/api/cliente/meus-dados', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha }) }).catch(() => null)
    setApagando(false)
    if (!res?.ok) { setErro(res ? (await res.json().catch(() => ({}))).erro ?? 'Não deu pra apagar' : 'Sem conexão.'); return }
    router.replace(`/${barbearia.slug}`)
    router.refresh()
  }

  const fone = whatsapp.length === 11 ? `(${whatsapp.slice(0, 2)}) ${whatsapp.slice(2, 7)}-${whatsapp.slice(7)}` : whatsapp

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-28 space-y-6">
        <div>
          <p className="ds-eyebrow">{barbearia.nome}</p>
          <h1 className="font-display text-2xl font-semibold text-fg mt-0.5">Perfil</h1>
        </div>

        <form onSubmit={salvar} className="ds-card p-5 space-y-4">
          <div>
            <label className="ds-label" htmlFor="nome">Seu nome</label>
            <input id="nome" value={nome} onChange={e => setNome(e.target.value)} required minLength={2} maxLength={100} autoComplete="name" className="ds-input !text-base" />
          </div>
          <div>
            <span className="ds-label">WhatsApp</span>
            <p className="font-display text-base text-fg tabular-nums">{fone}</p>
            <p className="font-body text-xs text-fg-muted mt-1">É o seu login. Pra trocar o número, fala com a barbearia.</p>
          </div>
          <button type="submit" disabled={salvando || nome.trim() === nomeInicial} className="ds-btn-primary w-full">
            {salvo ? <><Check size={15} aria-hidden /> Salvo</> : salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </form>

        <section className="space-y-2">
          <h2 className="ds-eyebrow">Seus dados</h2>
          <a href="/api/cliente/meus-dados" download="meus-dados-regua.json" className="ds-btn-secondary w-full !justify-start"><Download size={15} aria-hidden /> Baixar tudo que está guardado sobre mim</a>
          <button onClick={sair} className="ds-btn-secondary w-full !justify-start"><LogOut size={15} aria-hidden /> Sair deste aparelho</button>
          {!apagar ? (
            <button onClick={() => setApagar(true)} className="ds-btn-ghost w-full !justify-start !text-saida"><Trash2 size={15} aria-hidden /> Apagar minha conta</button>
          ) : (
            <form onSubmit={apagarConta} className="ds-card border-saida/40 p-4 space-y-3">
              <p className="font-body text-sm text-fg">Seus dados são apagados e os horários futuros, cancelados. Não dá pra desfazer.</p>
              <div>
                <label className="ds-label" htmlFor="senha">Confirme com sua senha</label>
                <input id="senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} required autoComplete="current-password" className="ds-input !text-base" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setApagar(false); setSenha(''); setErro('') }} className="ds-btn-secondary flex-1">Voltar</button>
                <button type="submit" disabled={apagando} className="ds-btn-danger flex-1">{apagando ? 'Apagando…' : 'Apagar conta'}</button>
              </div>
            </form>
          )}
        </section>
        {erro && <p className="font-body text-sm text-saida" role="alert">{erro}</p>}
      </div>
      <NavCliente slug={barbearia.slug} ativo="perfil" />
    </div>
  )
}
