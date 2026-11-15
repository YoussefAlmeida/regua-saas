import { redirect } from 'next/navigation'

/* O dia de hoje do dono fica no Início; a tela Hoje é do barbeiro (/barbeiro/hoje) */
export default function HojeAntigo() {
  redirect('/painel/inicio')
}
