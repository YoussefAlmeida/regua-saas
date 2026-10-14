import { Phone, MessageCircle } from 'lucide-react'

/* Botões "Ligar" e "Mensagem" — abrem o discador/WhatsApp do próprio celular.
   Zero custo: não usa a API paga (Módulo 6). */

function soDigitos(whatsapp: string) {
  const d = whatsapp.replace(/\D/g, '')
  return d.startsWith('55') ? d : `55${d}`
}

export default function ContatoCliente({
  whatsapp,
  mensagem,
  compacto = false,
}: {
  whatsapp: string | null | undefined
  mensagem?: string
  compacto?: boolean
}) {
  if (!whatsapp) return null
  const numero = soDigitos(whatsapp)
  const wa = `https://wa.me/${numero}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`
  const base = 'font-semibold flex items-center justify-center gap-1.5 border border-line bg-surface-alt text-fg-muted hover:text-fg font-ui text-xs rounded-button transition-colors'
  const tam = compacto ? 'px-3 py-1.5' : 'flex-1 py-2.5'

  return (
    <div className="flex gap-2">
      <a href={`tel:+${numero}`} className={`${base} ${tam}`} aria-label="Ligar para o cliente">
        <Phone size={13} /> {!compacto && 'Ligar'}
      </a>
      <a href={wa} target="_blank" rel="noopener noreferrer" className={`${base} ${tam}`} aria-label="Mandar mensagem no WhatsApp">
        <MessageCircle size={13} /> {!compacto && 'WhatsApp'}
      </a>
    </div>
  )
}
