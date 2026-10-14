import { criarClienteServico } from '@/lib/supabase/server'

/* Sai da agenda (plano menor ou o dono desligou): não recebe horário
   novo, mas o que já estava marcado continua e ele atende normal. */
export async function desligarDaAgenda(profissional_id: string) {
  const db = criarClienteServico()
  await db.from('profissionais').update({ ativo: false }).eq('id', profissional_id)
  const { count } = await db.from('agendamentos')
    .select('id', { count: 'exact', head: true })
    .eq('profissional_id', profissional_id).in('status', ['agendado', 'confirmado'])
    .gt('inicio', new Date().toISOString())
  return count ?? 0
}

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
