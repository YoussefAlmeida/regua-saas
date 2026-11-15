import { redirect } from 'next/navigation'

/* O relatório agora mora dentro do Financeiro */
export default function RelatoriosPage() {
  redirect('/painel/financeiro?aba=relatorio')
}
