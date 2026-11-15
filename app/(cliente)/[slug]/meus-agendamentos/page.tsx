import { redirect } from 'next/navigation'

/* Os horários do cliente agora ficam em Perfil → Meus agendamentos.
   O endereço antigo continua valendo pra não quebrar links já enviados. */
export default async function MeusAgendamentosAntigo({ params }: { params: Promise<{ slug: string }> }) {
  redirect(`/${(await params).slug}/perfil/agendamentos`)
}
