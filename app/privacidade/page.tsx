import type { Metadata } from 'next'
import PaginaLegal from '@/app/_components/pagina-legal'
import { EMPRESA, linkSuporte } from '@/lib/empresa'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Como o RÉGUA trata os dados de barbearias, barbeiros e clientes, conforme a LGPD.',
  alternates: { canonical: '/privacidade' },
}

export default function PrivacidadePage() {
  const contato = EMPRESA.emailPrivacidade
    ? <>pelo e-mail <strong>{EMPRESA.emailPrivacidade}</strong> ou pelo <a className="text-amber hover:underline" href={linkSuporte('Privacidade: ')}>WhatsApp de suporte</a></>
    : <>pelo <a className="text-amber hover:underline" href={linkSuporte('Privacidade: ')}>WhatsApp de suporte</a></>

  return (
    <PaginaLegal titulo="Política de Privacidade" atualizado="15/10/2026">
      <p>
        O RÉGUA é um sistema de agenda e financeiro para barbearias. Esta política explica, de forma simples, quais dados
        tratamos, por quê e quais são os seus direitos pela Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD).
      </p>

      <section>
        <h2>Quem cuida dos seus dados</h2>
        <ul>
          <li><strong>Dono e barbeiros:</strong> o RÉGUA é o controlador dos dados da conta (nome, e-mail, WhatsApp, senha).</li>
          <li>
            <strong>Clientes da barbearia:</strong> a barbearia é a controladora (é com ela que você marca seu horário).
            O RÉGUA é o operador: guarda e processa esses dados só para prestar o serviço à barbearia.
          </li>
        </ul>
      </section>

      <section>
        <h2>Quais dados e para quê</h2>
        <ul>
          <li><strong>Cadastro:</strong> nome, WhatsApp, e-mail (dono) e senha (guardada embaralhada, ninguém consegue ler). Para criar e proteger sua conta.</li>
          <li><strong>Agendamentos:</strong> serviço, barbeiro, data, hora, valor e situação. Para marcar, lembrar e organizar o atendimento.</li>
          <li><strong>Financeiro da barbearia:</strong> entradas e saídas lançadas pelo dono. Para os relatórios dele.</li>
          <li><strong>Segurança:</strong> endereço IP, tentativas de login e registro de ações (quem lançou, apagou ou mudou). Para evitar fraude e invasão.</li>
          <li><strong>Fotos de perfil</strong> que o barbeiro escolher enviar.</li>
        </ul>
        <p className="mt-2">
          Bases legais: execução do contrato (art. 7º, V), cumprimento de obrigação legal (art. 7º, II) e legítimo interesse
          para segurança e prevenção a fraudes (art. 7º, IX). Não vendemos dados e não usamos para propaganda de terceiros.
        </p>
      </section>

      <section>
        <h2>Mensagens no WhatsApp</h2>
        <p>
          Ao marcar um horário, você recebe no WhatsApp a confirmação e o lembrete daquele horário. São mensagens sobre o serviço
          que você pediu, não propaganda. Se não quiser mais receber, fale com a barbearia ou com a gente.
        </p>
      </section>

      <section>
        <h2>Com quem compartilhamos</h2>
        <ul>
          <li><strong>Hospedagem e banco de dados:</strong> Vercel e Supabase, com servidores em São Paulo.</li>
          <li><strong>WhatsApp:</strong> Meta (WhatsApp Business), que pode processar dados fora do Brasil, com as garantias da própria Meta.</li>
          <li><strong>E-mail:</strong> serviço de envio usado na recuperação de senha.</li>
          <li><strong>Pagamento da assinatura</strong> (só para donos): Asaas.</li>
          <li>Autoridades, quando a lei obrigar.</li>
        </ul>
      </section>

      <section>
        <h2>Por quanto tempo</h2>
        <ul>
          <li>Enquanto a conta estiver ativa. Se a barbearia cancelar, os dados ficam disponíveis por 30 dias e depois podem ser apagados.</li>
          <li>Registros de segurança e tentativas de login: até 6 meses. Registro de erros: até 1 ano.</li>
          <li>Lançamentos financeiros podem ser guardados pelo prazo que a lei fiscal exigir.</li>
        </ul>
      </section>

      <section>
        <h2>Seus direitos</h2>
        <p>Você pode, a qualquer momento:</p>
        <ul>
          <li>confirmar se tratamos seus dados e ter acesso a eles;</li>
          <li>corrigir dados errados;</li>
          <li>baixar uma cópia dos seus dados;</li>
          <li>pedir a exclusão (anonimização) da sua conta;</li>
          <li>saber com quem compartilhamos.</li>
        </ul>
        <p className="mt-2">
          <strong>Cliente:</strong> em &ldquo;Meus horários&rdquo;, no link da barbearia, tem os botões &ldquo;Baixar meus dados&rdquo; e
          &ldquo;Apagar minha conta&rdquo;. Para qualquer outro pedido, fale com a gente {contato}. Respondemos em até 15 dias.
        </p>
      </section>

      <section>
        <h2>Segurança</h2>
        <p>
          Conexão criptografada (HTTPS), senhas com algoritmo forte (argon2id), bloqueio contra tentativas repetidas,
          acesso separado por barbearia e registro de quem fez cada alteração. Se acontecer um incidente que possa te
          prejudicar, avisamos você e a ANPD.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>Usamos só o cookie necessário para manter você logado. Não usamos cookies de propaganda nem de rastreamento.</p>
      </section>

      <section>
        <h2>Encarregado (DPO) e contato</h2>
        <p>Dúvidas, pedidos ou reclamações sobre seus dados: fale com a gente {contato}. Você também pode procurar a ANPD.</p>
      </section>
    </PaginaLegal>
  )
}
