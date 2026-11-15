import { redirect } from 'next/navigation'

/* As permissões da equipe ficam na tela Equipe */
export default function PermissoesPage() {
  redirect('/painel/mais/barbeiros')
}
