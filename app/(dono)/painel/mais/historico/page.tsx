import { redirect } from 'next/navigation'

/* O histórico de auditoria é visto só pelo admin do RÉGUA (/admin → Atividade) */
export default function HistoricoPage() {
  redirect('/painel/mais')
}
