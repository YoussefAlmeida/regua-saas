import { redirect } from 'next/navigation'

/* O Dashboard virou a tela Início do dono */
export default function DashboardAntigo() {
  redirect('/painel/inicio')
}
