import type { Metadata } from 'next'
import Link from 'next/link'
import PaginaLegal from '@/app/_components/pagina-legal'
import { LISTA_PLANOS } from '@/lib/planos'
import { linkSuporte } from '@/lib/empresa'

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Regras de uso do RÉGUA: teste grátis, planos, pagamento, cancelamento e responsabilidades.',
  alternates: { canonical: '/termos' },
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function TermosPage() {
  return (
    <PaginaLegal titulo="Termos de Uso" atualizado="15/10/2026">
      <p>
        Estes termos valem para quem usa o RÉGUA: donos de barbearia, barbeiros e clientes que marcam horário pelo link.
        Ao criar uma conta ou marcar um horário, você concorda com eles e com a <Link href="/privacidade" className="text-amber hover:underline">Política de Privacidade</Link>.
      </p>

      <section>
        <h2>O serviço</h2>
        <p>
          O RÉGUA oferece agenda online, página de agendamento sem app, lembretes por WhatsApp, financeiro e relatórios para
          barbearias. O serviço é oferecido &ldquo;como está&rdquo; e pode evoluir com o tempo; mudanças importantes serão avisadas.
        </p>
      </section>

      <section>
        <h2>Teste grátis e planos</h2>
        <ul>
          <li>Toda barbearia nova tem 14 dias grátis, sem cartão. Acabou o teste sem plano, a conta fica só leitura: nada se perde.</li>
          {LISTA_PLANOS.map(p => (
            <li key={p.id}>
              <strong>{p.nome}</strong> ({brl(p.preco)}/mês): {p.maxProfissionais === null ? 'profissionais sem limite' : `até ${p.maxProfissionais} na agenda`}.
            </li>
          ))}
          <li>O plano é pago por mês, adiantado. O plano só muda quando o pagamento é confirmado.</li>
          <li>Subir de plano: paga o valor cheio do plano novo, vale na hora e o mês novo começa no dia do pagamento.</li>
          <li>Descer de plano: a troca acontece quando o plano menor for pago. Quem sair da agenda continua com os horários já marcados.</li>
          <li>Sem pagamento, depois de 5 dias de carência a conta fica só leitura até regularizar.</li>
        </ul>
      </section>

      <section>
        <h2>Cancelamento</h2>
        <p>Sem fidelidade e sem multa. Você pode cancelar quando quiser; os dados ficam disponíveis por 30 dias. Não há reembolso do mês já pago, salvo o direito de arrependimento de 7 dias após a primeira contratação, quando a lei garantir.</p>
      </section>

      <section>
        <h2>Responsabilidades da barbearia</h2>
        <ul>
          <li>Manter seus dados e os da equipe corretos e a senha em segredo.</li>
          <li>Usar os dados dos clientes só para o atendimento, conforme a LGPD (a barbearia é a controladora desses dados).</li>
          <li>Honrar os horários marcados pelo link ou avisar o cliente quando precisar desmarcar.</li>
          <li>Não usar o sistema para spam, fraude ou qualquer coisa ilegal.</li>
        </ul>
      </section>

      <section>
        <h2>Clientes que marcam pelo link</h2>
        <ul>
          <li>O horário é combinado com a barbearia; dúvidas sobre preço, atraso ou falta são com ela.</li>
          <li>Dá pra desmarcar em &ldquo;Meus horários&rdquo; até 1 hora antes.</li>
          <li>Use seu próprio WhatsApp: marcar em nome de outra pessoa sem autorização não é permitido.</li>
        </ul>
      </section>

      <section>
        <h2>Limites</h2>
        <p>
          Fazemos o possível para o sistema ficar no ar e seguro, mas não respondemos por falhas de internet, do WhatsApp ou de
          terceiros, nem por lucros que deixaram de ser ganhos. Podemos suspender contas que violem estes termos.
        </p>
      </section>

      <section>
        <h2>Contato e foro</h2>
        <p>
          Fale com a gente pelo <a className="text-amber hover:underline" href={linkSuporte()}>WhatsApp de suporte</a>.
          Fica eleito o foro do domicílio do consumidor, quando a lei assim determinar.
        </p>
      </section>
    </PaginaLegal>
  )
}
