'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const PERGUNTAS = [
  {
    q: 'Preciso instalar alguma coisa?',
    r: 'Não. RÉGUA roda no navegador do celular ou computador. Sem app para baixar, sem instalação.',
  },
  {
    q: 'E se meu cliente não souber usar a internet?',
    r: 'Você também pode criar agendamentos manualmente pelo painel. O cliente só precisa de WhatsApp para receber a confirmação.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    r: 'Sim. Sem fidelidade, sem multa. Cancela a qualquer momento e seus dados ficam disponíveis por 30 dias.',
  },
  {
    q: 'Como funciona o trial de 14 dias?',
    r: 'Você usa tudo sem limite durante 14 dias. Não pedimos cartão de crédito para começar. Só cobra se decidir continuar.',
  },
  {
    q: 'E se eu tiver mais de 5 barbeiros?',
    r: 'O plano Rede suporta equipes ilimitadas. Fale com a gente pelo WhatsApp e ajustamos o que precisar.',
  },
]

export default function FaqLanding() {
  const [aberto, setAberto] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      {PERGUNTAS.map((item, i) => (
        <div key={i} className="bg-surface border border-line rounded-card overflow-hidden">
          <button
            onClick={() => setAberto(aberto === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
          >
            <span className="font-ui text-sm uppercase tracking-wider text-fg">{item.q}</span>
            <ChevronDown
              size={16}
              className={`text-fg-muted shrink-0 transition-transform duration-200 ${aberto === i ? 'rotate-180' : ''}`}
            />
          </button>
          {aberto === i && (
            <div className="px-5 pb-4">
              <p className="font-body text-sm text-fg-muted">{item.r}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
