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
    q: 'Meus dados e os dos meus clientes estão seguros?',
    r: 'Sim. Servidores no Brasil, conexão criptografada, senhas embaralhadas e cada barbearia só enxerga o que é dela. Seguimos a LGPD: o cliente pode baixar ou apagar os próprios dados quando quiser.',
  },
  {
    q: 'Como eu pago?',
    r: 'Por Pix, todo mês, adiantado. Sem cartão de crédito e sem fidelidade. Se atrasar, você tem 5 dias de carência antes da agenda pausar.',
  },
  {
    q: 'E se eu quiser mudar de plano?',
    r: 'O plano muda quando o pagamento é confirmado. Subir: paga o valor cheio do plano novo e vale na hora. Descer: você escolhe quem continua na agenda e, ao pagar o plano menor, a troca acontece. Ninguém perde horário já marcado, conta ou histórico.',
  },
]

export default function FaqLanding() {
  const [aberto, setAberto] = useState<number | null>(0)

  return (
    <div className="border-t border-line">
      {PERGUNTAS.map((item, i) => (
        <div key={i} className="border-b border-line">
          <button
            onClick={() => setAberto(aberto === i ? null : i)}
            aria-expanded={aberto === i}
            className="w-full flex items-center justify-between py-5 text-left gap-6"
          >
            <span className="text-base sm:text-lg font-semibold text-fg">{item.q}</span>
            <ChevronDown
              size={20}
              className={`text-fg-muted shrink-0 transition-transform duration-200 ${aberto === i ? 'rotate-180' : ''}`}
            />
          </button>
          {aberto === i && (
            <p className="pb-6 -mt-1 text-fg-muted leading-relaxed max-w-2xl">{item.r}</p>
          )}
        </div>
      ))}
    </div>
  )
}
