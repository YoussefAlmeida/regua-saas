'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleUserRound, CalendarCheck, Bell, LogOut, ChevronRight, Phone, Mail } from 'lucide-react'
import NavCliente from '@/components/cliente/nav-cliente'
import Avatar from '@/components/cliente/avatar'
import { formatarTelefone } from '@/lib/telefone'

/* Meu Perfil: quem é o cliente e as quatro portas — Meus Dados,
   Meus Agendamentos, Notificações e Sair. Sem login, mostra a entrada. */

interface Cliente { nome: string; whatsapp: string; email: string | null; foto: string | null; avisosLigados: boolean }

export default function PerfilCliente({ barbearia, cliente }: { barbearia: { nome: string; slug: string }; cliente: Cliente | null }) {
  const router = useRouter()
  const [whatsapp, setWhatsapp] = useState('')
  const [senha, setSenha] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmarSaida, setConfirmarSaida] = useState(false)
  const [saindo, setSaindo] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro(''); setEntrando(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'cliente', whatsapp, senha, slug: barbearia.slug }),
    }).catch(() => null)
    setEntrando(false)
    if (!res) { setErro('Sem conexão. Tenta de novo.'); return }
    if (!res.ok) { setErro((await res.json().catch(() => ({}))).erro ?? 'WhatsApp ou senha incorretos'); return }
    router.refresh()
  }

  async function sair() {
    setSaindo(true)
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    router.replace(`/${barbearia.slug}`)
    router.refresh()
  }

  const base = `/${barbearia.slug}/perfil`
  const linha = 'flex items-center gap-4 px-4 py-4 text-left w-full hover:bg-surface-alt/60 transition-colors'

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-28 space-y-6">
        <header>
          <h1 className="font-display text-[26px] leading-tight font-semibold text-fg">Meu Perfil</h1>
          <p className="font-body text-sm text-fg-muted mt-1">Gerencie sua conta e seus agendamentos</p>
        </header>

        {!cliente ? (
          <form onSubmit={entrar} className="ds-card p-5 space-y-4">
            <p className="font-body text-sm text-fg-muted">Entre com o WhatsApp e a senha que você criou ao marcar o primeiro horário em {barbearia.nome}.</p>
            <div>
              <label className="ds-label" htmlFor="wa">WhatsApp com DDD</label>
              <input id="wa" type="tel" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={e => setWhatsapp(formatarTelefone(e.target.value))} required placeholder="(75) 99999-0000" className="ds-input !text-base" />
            </div>
            <div>
              <label className="ds-label" htmlFor="senha">Senha</label>
              <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} required className="ds-input !text-base" />
            </div>
            {erro && <p className="font-body text-sm text-saida" role="alert">{erro}</p>}
            <button type="submit" disabled={entrando} className="ds-btn-primary w-full">{entrando ? 'Entrando…' : 'Entrar'}</button>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-2 font-body text-xs">
              <Link href={`/recuperar-senha?b=${barbearia.slug}`} className="text-fg-muted underline underline-offset-2 hover:text-fg">Esqueci minha senha</Link>
              <Link href={`/${barbearia.slug}`} className="text-amber">Primeira vez? Marcar horário</Link>
            </div>
          </form>
        ) : (
          <>
            <section className="ds-card p-4 flex items-center gap-4" aria-label="Seus dados">
              <Avatar foto={cliente.foto} nome={cliente.nome} className="w-[72px] h-[72px] min-[380px]:w-[88px] min-[380px]:h-[88px] text-[26px]" />
              <div className="min-w-0 space-y-1.5">
                <p className="font-display text-[19px] leading-snug font-semibold text-fg truncate">{cliente.nome}</p>
                <p className="flex items-center gap-2 font-body text-sm text-fg"><Phone size={15} className="text-fg-muted shrink-0" aria-hidden /> <span className="truncate tabular-nums">{formatarTelefone(cliente.whatsapp)}</span></p>
                <p className="flex items-center gap-2 font-body text-sm text-fg"><Mail size={15} className="text-fg-muted shrink-0" aria-hidden /> <span className={`truncate ${cliente.email ? '' : 'text-fg-muted'}`}>{cliente.email ?? 'Sem e-mail cadastrado'}</span></p>
              </div>
            </section>

            <nav className="ds-card divide-y divide-line overflow-hidden" aria-label="Opções do perfil">
              <Link href={`${base}/dados`} className={linha}>
                <CircleUserRound size={24} className="text-amber shrink-0" strokeWidth={1.7} aria-hidden />
                <span className="flex-1 min-w-0"><span className="block font-display text-base font-semibold text-fg">Meus Dados</span><span className="block font-body text-sm text-fg-muted">Atualize suas informações pessoais</span></span>
                <ChevronRight size={18} className="text-fg-muted shrink-0" aria-hidden />
              </Link>
              <Link href={`${base}/agendamentos`} className={linha}>
                <CalendarCheck size={24} className="text-amber shrink-0" strokeWidth={1.7} aria-hidden />
                <span className="flex-1 min-w-0"><span className="block font-display text-base font-semibold text-fg">Meus Agendamentos</span><span className="block font-body text-sm text-fg-muted">Acompanhe ou cancele seus horários</span></span>
                <ChevronRight size={18} className="text-fg-muted shrink-0" aria-hidden />
              </Link>
              <Link href={`${base}/notificacoes`} className={linha}>
                <Bell size={24} className="text-amber shrink-0" strokeWidth={1.7} aria-hidden />
                <span className="flex-1 min-w-0"><span className="block font-display text-base font-semibold text-fg truncate">Notificações</span><span className="block font-body text-sm text-fg-muted">Receba lembretes e atualizações</span></span>
                <span className={`ds-tag shrink-0 ${cliente.avisosLigados ? 'bg-amber/15 text-amber' : 'bg-surface-alt text-fg-muted'}`}>{cliente.avisosLigados ? 'Ligadas' : 'Desligadas'}</span>
                <ChevronRight size={18} className="text-fg-muted shrink-0" aria-hidden />
              </Link>
              <button type="button" onClick={() => setConfirmarSaida(true)} className={linha}>
                <LogOut size={24} className="text-saida shrink-0" strokeWidth={1.7} aria-hidden />
                <span className="flex-1 font-display text-base font-semibold text-saida">Sair da Conta</span>
                <ChevronRight size={18} className="text-fg-muted shrink-0" aria-hidden />
              </button>
            </nav>
          </>
        )}
      </div>

      {confirmarSaida && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal aria-labelledby="t-sair">
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirmarSaida(false)} />
          <div className="relative w-full max-w-md bg-surface border border-line rounded-t-2xl sm:rounded-card p-6 space-y-4">
            <h2 id="t-sair" className="font-display text-lg font-semibold text-fg">Sair da conta?</h2>
            <p className="font-body text-sm text-fg-muted">Seus horários continuam marcados. Pra ver ou cancelar, é só entrar de novo com seu WhatsApp e senha.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarSaida(false)} className="ds-btn-secondary flex-1">Continuar aqui</button>
              <button onClick={sair} disabled={saindo} className="ds-btn-danger flex-1">{saindo ? 'Saindo…' : 'Sair'}</button>
            </div>
          </div>
        </div>
      )}

      <NavCliente slug={barbearia.slug} ativo="perfil" />
    </div>
  )
}
