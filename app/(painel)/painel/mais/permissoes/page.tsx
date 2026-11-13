import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getSessao } from '@/lib/auth'
import { permissoesDaEquipe } from '@/lib/permissoes-equipe'
import PermissoesClient from './permissoes-client'

export const metadata = { title: 'Permissões' }

export default async function PermissoesPage() {
  const sessao = await getSessao()
  if (!sessao) redirect('/entrar')
  if (sessao.papel !== 'dono') redirect('/painel/mais')

  return (
    <div className="px-4 md:px-8 py-6 max-w-lg md:max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/painel/mais" className="text-fg-muted hover:text-fg md:hidden" aria-label="Voltar"><ChevronLeft size={20} /></Link>
        <div>
          <h1 className="ds-titulo">Permissões</h1>
          <p className="font-body text-sm text-fg-muted">O que os barbeiros podem fazer na própria agenda</p>
        </div>
      </div>
      <PermissoesClient iniciais={await permissoesDaEquipe(sessao.barbearia_id)} />
      <p className="font-body text-xs text-fg-muted">
        Você, como dono, sempre pode tudo. O barbeiro nunca vê o financeiro da barbearia, a equipe, os relatórios nem as configurações, e só mexe na agenda dele: isso não muda por aqui.
      </p>
    </div>
  )
}
