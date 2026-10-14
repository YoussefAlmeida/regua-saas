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
    q: 'Como funciona o teste de 14 dias?',
    r: 'Você usa tudo, sem limite, por 14 dias. Não pedimos cartão. Se acabar sem escolher plano, a conta fica só leitura: você vê tudo e não perde nada, mas agenda e caixa pausam até escolher um plano.',
  },
  {
    q: 'Qual plano é o meu?',
    r: 'Depende de quantos profissionais aparecem na agenda: 1 é o Cadeira, até 3 é o Barbearia, mais de 3 é o Rede. Se você é o dono e também corta, você conta; se só administra, não.',
  },
  {
    q: 'E se eu quiser mudar de plano?',
    r: 'O plano muda quando o pagamento é confirmado. Subir: paga o valor cheio do plano novo e vale na hora. Descer: você escolhe quem continua na agenda e, ao pagar o plano menor, a troca acontece. Ninguém perde horário já marcado, conta ou histórico.',
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
