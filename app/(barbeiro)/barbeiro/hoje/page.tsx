import { redirect } from 'next/navigation'
import { getSessao } from '@/lib/auth'
import HojeClient from '@/components/hoje-client'
import { carregarHoje } from '@/lib/dados-hoje'

export const metadata = { title: 'Hoje' }

/* Hoje do barbeiro: os atendimentos dele, um por um, com Concluir e Faltou */
export default async function HojeBarbeiro() {
  const sessao = await getSessao()
  if (!sessao) redirect('/entrar')
  const dados = await carregarHoje({ barbearia_id: sessao.barbearia_id, usuario_id: sessao.usuario_id, souBarbeiro: true, meuProfissionalId: sessao.profissional_id ?? '' })
  return <HojeClient {...dados} />
}
