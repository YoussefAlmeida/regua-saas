import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getSessao } from '@/lib/auth'
import { planoDaBarbearia, agendaDoPlano } from '@/lib/plano-servidor'
import { PLANOS, planoParaProfissionais } from '@/lib/planos'
import AjustarEquipe from './ajustar-equipe'

export default async function AjustarEquipePage() {
  const sessao = await getSessao()
  if (!sessao) redirect('/entrar')
  if (sessao.papel !== 'dono') redirect('/painel/mais')

  const [plano, agenda] = await Promise.all([planoDaBarbearia(sessao.barbearia_id), agendaDoPlano(sessao.barbearia_id)])
  const sugerido = PLANOS[planoParaProfissionais(agenda.profissionais.length)]

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/painel/mais" className="text-fg-muted hover:text-fg" aria-label="Voltar"><ChevronLeft size={20} /></Link>
        <h1 className="font-ui text-xl uppercase tracking-widest text-fg">Ajustar equipe</h1>
      </div>

      {agenda.excedente === 0 ? (
        <p className="bg-surface border border-entrada/30 rounded-card p-4 font-body text-sm text-fg">
          Tudo certo: sua equipe cabe no plano {plano.nome}{agenda.max !== null ? ` (até ${agenda.max})` : ''}.
        </p>
      ) : (
        <div className="bg-surface border border-saida/30 rounded-card p-4 space-y-2">
          <p className="font-body text-sm text-fg">
            Seu plano <strong>{plano.nome}</strong> vai até <strong>{agenda.max}</strong> profissional{agenda.max === 1 ? '' : 'is'} na agenda,
            e hoje tem <strong>{agenda.profissionais.length}</strong>. Tire {agenda.excedente} da agenda ou mude pro plano {sugerido.nome}.
          </p>
          <p className="font-body text-xs text-fg-muted">
            Enquanto isso, quem está como &ldquo;pausado&rdquo; não aparece pros clientes e não recebe agendamento novo.
          </p>
        </div>
      )}

      <AjustarEquipe
        profissionais={agenda.profissionais.map(p => ({ id: p.id, nome: p.nome, usuario_id: p.usuario_id, permitido: p.permitido, souEu: p.usuario_id === sessao.usuario_id }))}
        temExcedente={agenda.excedente > 0}
      />

      <Link href="/painel/mais/plano" className="block text-center font-ui text-xs uppercase tracking-wider text-amber hover:underline">
        Prefiro mudar de plano
      </Link>
    </div>
  )
}
