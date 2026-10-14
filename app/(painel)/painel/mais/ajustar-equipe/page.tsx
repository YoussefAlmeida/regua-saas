import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getSessao } from '@/lib/auth'
import { planoDaBarbearia, agendaDoPlano, pessoasDaEquipe } from '@/lib/plano-servidor'
import { PLANOS, planoParaProfissionais } from '@/lib/planos'
import ListaAgenda from '@/components/lista-agenda'

/* Escolher quem fica na agenda quando a equipe passa do limite do plano
   (ex.: o plano mudou pra um menor). Ninguém é tirado sozinho. */
export default async function AjustarEquipePage() {
  const sessao = await getSessao()
  if (!sessao) redirect('/entrar')
  if (sessao.papel !== 'dono') redirect('/painel/mais')

  const [plano, agenda, pessoas] = await Promise.all([
    planoDaBarbearia(sessao.barbearia_id),
    agendaDoPlano(sessao.barbearia_id),
    pessoasDaEquipe(sessao.barbearia_id),
  ])
  const sugerido = PLANOS[planoParaProfissionais(agenda.profissionais.length)]

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/painel/mais" className="text-fg-muted hover:text-fg" aria-label="Voltar"><ChevronLeft size={20} /></Link>
        <h1 className="font-display text-[28px] font-semibold leading-tight text-fg">Quem fica na agenda</h1>
      </div>

      {agenda.excedente === 0 ? (
        <div className="bg-surface border border-entrada/30 rounded-card p-4 space-y-3">
          <p className="font-body text-sm text-fg">
            Tudo certo: sua agenda cabe no plano {plano.nome}{agenda.max !== null ? ` (até ${agenda.max})` : ''}.
          </p>
          <Link href="/painel/hoje" className="font-semibold inline-block bg-amber text-accent-fg font-ui text-xs px-4 py-2 rounded-button">
            Voltar pro painel
          </Link>
        </div>
      ) : (
        <div className="bg-surface border border-saida/30 rounded-card p-4 space-y-2">
          <p className="font-body text-sm text-fg">
            Seu plano <strong>{plano.nome}</strong> vai até <strong>{agenda.max}</strong> na agenda e hoje tem{' '}
            <strong>{agenda.profissionais.length}</strong>. Desligue {agenda.excedente === 1 ? '1 pessoa' : `${agenda.excedente} pessoas`} pra continuar.
          </p>
          <p className="font-body text-xs text-fg-muted">
            Quem sai da agenda continua na equipe e atende os horários que já estão marcados. Só não entra horário novo.
          </p>
        </div>
      )}

      <ListaAgenda
        max={agenda.max}
        pessoas={pessoas.map(p => ({ alvo: p.souDono ? 'eu' : p.usuario_id, nome: p.nome, naAgenda: p.naAgenda, souEu: p.souDono }))}
      />

      {agenda.excedente > 0 && (
        <Link href="/painel/mais/plano" className="block text-center font-ui text-xs uppercase tracking-wider text-amber hover:underline">
          Prefiro o plano {sugerido.nome} e manter todos
        </Link>
      )}
    </div>
  )
}
