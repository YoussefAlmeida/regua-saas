'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, MessageCircle, MailCheck } from 'lucide-react'

type Tipo = 'email' | 'whatsapp'
interface Resposta {
  automatico: boolean
  contatoBarbearia: { nome: string; telefone: string } | null
  suporte: string
}

const wa = (tel: string, txt: string) => {
  const d = tel.replace(/\D/g, '')
  return `https://wa.me/${d.startsWith('55') ? d : `55${d}`}?text=${encodeURIComponent(txt)}`
}

export default function RecuperarSenha({ slug, tipoInicial }: { slug: string | null; tipoInicial: Tipo }) {
  const [tipo, setTipo] = useState<Tipo>(tipoInicial)
  const [valor, setValor] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [resposta, setResposta] = useState<Resposta | null>(null)

  async function pedir(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const res = await fetch('/api/auth/recuperar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tipo === 'email' ? { tipo, email: valor } : { tipo, whatsapp: valor, slug: slug ?? undefined }),
    }).catch(() => null)
    setEnviando(false)
    if (!res) { setErro('Sem conexão. Tenta de novo.'); return }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setErro(json.erro ?? 'Não deu certo. Tenta de novo.'); return }
    setResposta(json)
  }

  const voltar = slug ? `/${slug}/meus-agendamentos` : '/entrar'
  const inputCls = 'w-full bg-surface-alt border border-line rounded-button px-4 py-3 font-body text-base text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-amber'

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <Link href={voltar} className="inline-flex items-center gap-1 font-ui text-xs uppercase tracking-wider text-fg-muted hover:text-fg">
          <ChevronLeft size={15} /> Voltar
        </Link>
        <div>
          <h1 className="font-display text-4xl uppercase tracking-wide text-fg">Esqueci a senha</h1>
          <p className="font-body text-sm text-fg-muted mt-1">Sem problema — você cria uma nova.</p>
        </div>

        {!resposta ? (
          <>
            {!slug && (
              <div className="flex rounded-button border border-line overflow-hidden" role="tablist">
                {([['email', 'Sou dono (e-mail)'], ['whatsapp', 'Barbeiro ou cliente']] as const).map(([v, t]) => (
                  <button key={v} role="tab" aria-selected={tipo === v} onClick={() => { setTipo(v); setValor(''); setErro('') }}
                    className={`flex-1 py-2.5 font-ui text-xs uppercase tracking-wider transition-colors ${tipo === v ? 'bg-amber text-accent-fg' : 'text-fg-muted hover:text-fg'}`}>
                    {t}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={pedir} className="bg-surface border border-line rounded-card p-5 space-y-4">
              <div>
                <label htmlFor="v" className="font-ui text-xs uppercase tracking-wider text-fg-muted block mb-1">
                  {tipo === 'email' ? 'E-mail da conta' : 'WhatsApp com DDD'}
                </label>
                <input id="v" type={tipo === 'email' ? 'email' : 'tel'} inputMode={tipo === 'email' ? 'email' : 'tel'}
                  autoComplete={tipo === 'email' ? 'email' : 'tel'} value={valor} onChange={e => setValor(e.target.value)}
                  placeholder={tipo === 'email' ? 'dono@exemplo.com' : '(75) 99999-0000'} required className={inputCls} />
              </div>
              {erro && <p className="font-body text-sm text-saida" role="alert">{erro}</p>}
              <button type="submit" disabled={enviando} className="w-full bg-amber hover:bg-accent-press text-accent-fg font-ui text-sm uppercase tracking-wider py-3 rounded-button transition-colors disabled:opacity-50">
                {enviando ? 'Enviando…' : 'Quero uma senha nova'}
              </button>
            </form>
          </>
        ) : resposta.automatico ? (
          <div className="bg-surface border border-entrada/30 rounded-card p-5 space-y-3 text-center">
            <MailCheck size={28} className="mx-auto text-entrada" />
            <p className="font-body text-sm text-fg">
              Se esse {tipo === 'email' ? 'e-mail' : 'número'} tiver conta, a gente mandou um link pra criar a senha nova.
              {tipo === 'email' ? ' Olha a caixa de entrada e o spam.' : ' Olha seu WhatsApp.'}
            </p>
            <p className="font-body text-xs text-fg-muted">O link vale 1 hora e funciona uma vez só.</p>
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-card p-5 space-y-4">
            <p className="font-body text-sm text-fg">
              {tipo === 'email'
                ? 'Fala com o suporte do RÉGUA que a gente te manda um link pra criar a senha nova.'
                : resposta.contatoBarbearia
                  ? `Fala com a ${resposta.contatoBarbearia.nome}: eles mandam um link pra você criar a senha nova.`
                  : 'Pede pro dono da barbearia: no painel dele tem o botão "Link de nova senha", que manda o link pro seu WhatsApp.'}
            </p>
            {(tipo === 'email' || resposta.contatoBarbearia) && (
              <a
                href={tipo === 'email'
                  ? wa(resposta.suporte, `Oi! Esqueci a senha do RÉGUA. Meu e-mail de cadastro é ${valor}.`)
                  : wa(resposta.contatoBarbearia!.telefone, 'Oi! Esqueci minha senha de agendamento. Pode me mandar o link de senha nova?')}
                target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-entrada/10 border border-entrada/30 text-entrada font-ui text-xs uppercase tracking-wider py-3 rounded-button"
              >
                <MessageCircle size={14} /> Chamar no WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
