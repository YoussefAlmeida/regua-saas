import { notFound } from 'next/navigation'
import AgendamentoPublico from './agendamento-publico'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function AgendamentoPublicoPage({ params }: Props) {
  const { slug } = await params

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/publico/${slug}`, {
    cache: 'no-store',
  })

  if (!res.ok) notFound()

  const { barbearia, profissionais, servicos } = await res.json()

  if (!barbearia) notFound()

  return <AgendamentoPublico barbearia={barbearia} profissionais={profissionais} servicos={servicos} />
}
