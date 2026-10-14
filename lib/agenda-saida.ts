import { criarClienteServico } from '@/lib/supabase/server'

/* Tira alguém da agenda: cancela os horários futuros (o histórico fica)
   e devolve a lista pro dono avisar cada cliente pelo WhatsApp. */
export async function tirarDaAgenda(profissional_id: string) {
  const db = criarClienteServico()
  await db.from('profissionais').update({ ativo: false }).eq('id', profissional_id)
  const { data } = await db
    .from('agendamentos')
    .update({ status: 'cancelado', cancelado_por: 'dono', atualizado_em: new Date().toISOString() })
    .eq('profissional_id', profissional_id)
    .in('status', ['agendado', 'confirmado'])
    .gt('inicio', new Date().toISOString())
    .select('id, inicio, cliente:usuarios!cliente_id(nome, whatsapp), servico:servicos!servico_id(nome)')
  return data ?? []
}
