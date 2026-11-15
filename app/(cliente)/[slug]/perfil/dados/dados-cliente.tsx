'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Download, Trash2 } from 'lucide-react'
import NavCliente from '@/components/cliente/nav-cliente'
import TopoInterno from '@/components/cliente/topo-interno'
import Avatar from '@/components/cliente/avatar'
import { formatarTelefone } from '@/lib/telefone'

/* Meus Dados: nome e telefone. No fim,
   os direitos da LGPD: baixar os próprios dados e apagar a conta. */

interface Dados { nome: string; whatsapp: string }
const soDigitos = (v: string) => v.replace(/\D/g, '')

export default function DadosCliente({ slug, inicial }: { slug: string; inicial: Dados }) {
  const router = useRouter()
  const [salvos, setSalvos] = useState(inicial)
  const [nome, setNome] = useState(inicial.nome)
  const [fone, setFone] = useState(formatarTelefone(inicial.whatsapp))
  const [senha, setSenha] = useState('')
  const [erros, setErros] = useState<Partial<Record<'nome' | 'fone' | 'senha', string>>>({})
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [apagar, setApagar] = useState(false)
  const [senhaApagar, setSenhaApagar] = useState('')
  const [apagando, setApagando] = useState(false)

  const mudouFone = soDigitos(fone) !== salvos.whatsapp
  const mudou = nome.trim() !== salvos.nome || mudouFone

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const er: typeof erros = {}
    if (nome.trim().length < 2) er.nome = 'Escreva seu nome completo.'
    if (!/^\d{10,11}$/.test(soDigitos(fone))) er.fone = 'Telefone com DDD: 10 ou 11 números.'
    if (mudouFone && !senha) er.senha = 'O telefone é o seu login: confirme com a senha pra trocar.'
    setErros(er)
    if (Object.keys(er).length) return

    setSalvando(true)
    // Só vai o que mudou: o resto fica como está
    const corpo: Record<string, string> = {}
    if (nome.trim() !== salvos.nome) corpo.nome = nome.trim()
    if (mudouFone) { corpo.whatsapp = soDigitos(fone); corpo.senha = senha }
    const res = await fetch('/api/cliente/perfil', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }).catch(() => null)
    setSalvando(false)
    if (!res) { setMsg({ t: 'Sem conexão. Confere a internet e tenta de novo.', erro: true }); return }
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg({ t: j.erro ?? 'Não deu pra salvar', erro: true }); return }
    setSalvos(s => ({ nome: j.nome ?? s.nome, whatsapp: j.whatsapp ?? s.whatsapp }))
    setSenha('')
    setMsg({ t: 'Dados salvos.' })
    router.refresh()
  }

  async function apagarConta(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null); setApagando(true)
    const res = await fetch('/api/cliente/meus-dados', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: senhaApagar }) }).catch(() => null)
    setApagando(false)
    if (!res?.ok) { setMsg({ t: res ? (await res.json().catch(() => ({}))).erro ?? 'Não deu pra apagar' : 'Sem conexão.', erro: true }); return }
    router.replace(`/${slug}`)
    router.refresh()
  }

  const erroDe = (c: keyof typeof erros) => erros[c] && <p className="font-body text-xs text-saida mt-1" role="alert">{erros[c]}</p>

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-28 space-y-6">
        <TopoInterno voltar={`/${slug}/perfil`} titulo="Meus Dados" subtitulo="Atualize suas informações pessoais" />

        <div className="flex justify-center"><Avatar nome={salvos.nome} className="w-24 h-24 text-[30px]" /></div>

        <form onSubmit={salvar} noValidate className="ds-card p-5 space-y-4">
          <div>
            <label className="ds-label" htmlFor="nome">Nome completo</label>
            <input id="nome" value={nome} onChange={e => setNome(e.target.value)} maxLength={100} autoComplete="name" aria-invalid={!!erros.nome} className="ds-input !text-base" />
            {erroDe('nome')}
          </div>
          <div>
            <label className="ds-label" htmlFor="fone">Telefone (WhatsApp)</label>
            <input id="fone" type="tel" inputMode="tel" autoComplete="tel" value={fone} onChange={e => setFone(formatarTelefone(e.target.value))} placeholder="(75) 99999-0000" aria-invalid={!!erros.fone} className="ds-input !text-base tabular-nums" />
            {erroDe('fone') || <p className="font-body text-xs text-fg-muted mt-1">É com ele que você entra na conta.</p>}
          </div>
          {mudouFone && (
            <div>
              <label className="ds-label" htmlFor="senha">Sua senha, pra confirmar a troca do telefone</label>
              <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} aria-invalid={!!erros.senha} className="ds-input !text-base" />
              {erroDe('senha')}
            </div>
          )}
          {msg && <p className={`font-body text-sm flex items-center gap-1.5 ${msg.erro ? 'text-saida' : 'text-entrada'}`} role="status">{!msg.erro && <Check size={15} aria-hidden />}{msg.t}</p>}
          <button type="submit" disabled={salvando || !mudou} className="ds-btn-primary w-full">{salvando ? 'Salvando…' : 'Salvar alterações'}</button>
        </form>

        <section className="space-y-2">
          <h2 className="ds-eyebrow">Privacidade</h2>
          <a href="/api/cliente/meus-dados" download="meus-dados-regua.json" className="ds-btn-secondary w-full !justify-start"><Download size={15} aria-hidden /> Baixar tudo que está guardado sobre mim</a>
          {!apagar ? (
            <button type="button" onClick={() => setApagar(true)} className="ds-btn-ghost w-full !justify-start !text-saida"><Trash2 size={15} aria-hidden /> Apagar minha conta</button>
          ) : (
            <form onSubmit={apagarConta} className="ds-card border-saida/40 p-4 space-y-3">
              <p className="font-body text-sm text-fg">Seus dados são apagados e os horários futuros, cancelados. Não dá pra desfazer.</p>
              <div>
                <label className="ds-label" htmlFor="senha-apagar">Confirme com sua senha</label>
                <input id="senha-apagar" type="password" value={senhaApagar} onChange={e => setSenhaApagar(e.target.value)} required autoComplete="current-password" className="ds-input !text-base" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setApagar(false); setSenhaApagar('') }} className="ds-btn-secondary flex-1">Voltar</button>
                <button type="submit" disabled={apagando} className="ds-btn-danger flex-1">{apagando ? 'Apagando…' : 'Apagar conta'}</button>
              </div>
            </form>
          )}
        </section>
      </div>

      <NavCliente slug={slug} ativo="perfil" />
    </div>
  )
}
