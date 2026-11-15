import { redirect } from 'next/navigation'

/* O RÉGUA não calcula comissão; quanto cada um gerou está no Financeiro */
export default function ComissoesPage() {
  redirect('/painel/financeiro')
}
