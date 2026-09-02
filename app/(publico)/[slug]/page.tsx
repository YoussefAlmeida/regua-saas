// Dia 3 — Página pública de agendamento: regua.app/nome-da-barbearia

interface Props {
  params: Promise<{ slug: string }>
}

export default async function AgendamentoPublicoPage({ params }: Props) {
  const { slug } = await params
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <p className="font-ui text-fg-muted uppercase tracking-wider">
        Agendamento público — {slug} — Dia 3
      </p>
    </div>
  )
}
