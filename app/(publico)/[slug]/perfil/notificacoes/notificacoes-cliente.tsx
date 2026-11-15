'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import NavCliente from '@/components/cliente/nav-cliente'
import TopoInterno from '@/components/cliente/topo-interno'
import { AVISOS, CHAVES_AVISO, type Aviso, type Avisos } from '@/lib/avisos-cliente'

/* Notificações: uma chave geral e uma por tipo de aviso. Cada toque já
   salva; os envios (confirmação e lembrete) consultam essa escolha. */

function Chave({ ligada, rotulo, onMudar, desabilitada }: { ligada: boolean; rotulo: string; onMudar: () => void; desabilitada?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={ligada} aria-label={rotulo} onClick={onMudar} disabled={desabilitada}
      className={`w-12 h-7 rounded-full relative transition-colors shrink-0 disabled:opacity-50 ${ligada ? 'bg-amber' : 'bg-line'}`}>
      <span className={`absolute left-0 top-1 w-5 h-5 rounded-full transition-transform ${ligada ? 'translate-x-[24px] bg-accent-fg' : 'translate-x-1 bg-fg'}`} />
    </button>
  )
}

export default function NotificacoesCliente({ slug, iniciais, liberado, envioAtivo }: { slug: string; iniciais: Avisos; liberado: boolean; envioAtivo: boolean }) {
  const router = useRouter()
  const [avisos, setAvisos] = useState(iniciais)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null)
  const algumLigado = CHAVES_AVISO.some(k => avisos[k])

  async function gravar(novo: Avisos) {
    const antes = avisos
    setAvisos(novo); setSalvando(true); setMsg(null)
    const res = await fetch('/api/cliente/notificacoes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novo) }).catch(() => null)
    setSalvando(false)
    if (!res?.ok) {
      setAvisos(antes)   // não salvou: a tela volta ao que vale de verdade
      setMsg({ t: res ? (await res.json().catch(() => ({}))).erro ?? 'Não deu pra salvar' : 'Sem conexão. Sua escolha não foi salva.', erro: true })
      return
    }
    setMsg({ t: 'Preferência salva.' })
    router.refresh()
  }

  const todos = (v: boolean) => Object.fromEntries(CHAVES_AVISO.map(k => [k, v])) as Avisos

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-28 space-y-5">
        <TopoInterno voltar={`/${slug}/perfil`} titulo="Notificações" subtitulo="Gerencie seus lembretes e atualizações" />

        {!liberado && <p className="ds-card p-4 font-body text-sm text-fg">As preferências de notificação ainda não foram liberadas nesta conta. Fala com a barbearia.</p>}

        <div className="ds-card p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-display text-base font-semibold text-fg">Receber notificações</p>
            <p className="font-body text-sm text-fg-muted">Liga ou desliga todos os avisos de uma vez.</p>
          </div>
          <Chave ligada={algumLigado} rotulo="Receber notificações" desabilitada={salvando || !liberado} onMudar={() => gravar(todos(!algumLigado))} />
        </div>

        <ul className="ds-card divide-y divide-line">
          {CHAVES_AVISO.map((k: Aviso) => (
            <li key={k} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="font-ui text-sm font-semibold text-fg">{AVISOS[k].rotulo}</p>
                <p className="font-body text-xs text-fg-muted">{AVISOS[k].descricao}</p>
              </div>
              <Chave ligada={avisos[k]} rotulo={AVISOS[k].rotulo} desabilitada={salvando || !liberado} onMudar={() => gravar({ ...avisos, [k]: !avisos[k] })} />
            </li>
          ))}
        </ul>

        {msg && <p className={`font-body text-sm ${msg.erro ? 'text-saida' : 'text-entrada'}`} role="status">{msg.t}</p>}

        <p className="flex items-start gap-2 font-body text-xs text-fg-muted">
          <MessageCircle size={14} className="shrink-0 mt-0.5" aria-hidden />
          {envioAtivo
            ? 'Os avisos chegam pelo WhatsApp do seu cadastro.'
            : 'Os avisos chegam pelo WhatsApp do seu cadastro. O envio automático ainda não está ativo; sua escolha fica salva e passa a valer quando ele for ligado.'}
        </p>
      </div>
      <NavCliente slug={slug} ativo="perfil" />
    </div>
  )
}
