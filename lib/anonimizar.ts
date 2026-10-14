import { randomBytes } from 'node:crypto'
import { criarClienteServico } from '@/lib/supabase/server'
import { hashSenha } from '@/lib/auth'

/* ================================================================
   LGPD — exclusão da conta de um cliente (art. 18, VI)
   Apaga o que identifica a pessoa e mantém só o que a barbearia
   precisa guardar por lei (valores dos atendimentos já feitos,
   sem nome nem telefone). Horários futuros são cancelados.
   ================================================================ */
export async function anonimizarCliente(usuario_id: string, barbearia_id: string, quem: 'cliente' | 'dono') {
  const db = criarClienteServico()
  const { data: u } = await db.from('usuarios').select('id, whatsapp, papel')
    .eq('id', usuario_id).eq('barbearia_id', barbearia_id).maybeSingle()
  if (!u || u.papel !== 'cliente') return { ok: false as const, cancelados: 0 }

  const agora = new Date().toISOString()
  const { data: cancelados } = await db.from('agendamentos')
    .update({ status: 'cancelado', cancelado_por: quem, observacao: null, atualizado_em: agora })
    .eq('cliente_id', u.id).in('status', ['agendado', 'confirmado']).gt('inicio', agora)
    .select('id')
  await db.from('agendamentos').update({ observacao: null }).eq('cliente_id', u.id)

  await db.from('usuarios').update({
    nome: 'Cliente removido',
    // WhatsApp é obrigatório pra cliente: fica um marcador que não é telefone
    whatsapp: `removido-${u.id.slice(0, 8)}`,
    senha_hash: await hashSenha(randomBytes(32).toString('hex')),
    senha_definida: false,
    ativo: false,
    atualizado_em: agora,
  }).eq('id', u.id)

  if (u.whatsapp) {
    await db.from('tentativas_login').delete().in('chave', [`id:${u.whatsapp}`, `id:rec:${u.whatsapp}`, `id:reauth:${u.id}`])
  }
  await db.from('dispositivos').delete().eq('usuario_id', u.id)
  return { ok: true as const, cancelados: cancelados?.length ?? 0 }
}

/** Tudo que o RÉGUA guarda sobre o cliente nessa barbearia (art. 18, II e V) */
export async function dadosDoCliente(usuario_id: string, barbearia_id: string) {
  const db = criarClienteServico()
  const [{ data: u }, { data: b }, { data: ags }] = await Promise.all([
    db.from('usuarios').select('nome, whatsapp, criado_em, termos_aceitos_em').eq('id', usuario_id).maybeSingle(),
    db.from('barbearias').select('nome, telefone, endereco').eq('id', barbearia_id).maybeSingle(),
    db.from('agendamentos')
      .select('inicio, fim, status, valor_servico, cancelado_por, criado_em, servico:servicos!servico_id(nome), profissional:profissionais!profissional_id(nome)')
      .eq('cliente_id', usuario_id).order('inicio', { ascending: false }),
  ])
  return {
    gerado_em: new Date().toISOString(),
    controladora: b ? { barbearia: b.nome, telefone: b.telefone, endereco: b.endereco } : null,
    operador: 'RÉGUA (sistema de agendamento usado pela barbearia)',
    voce: u,
    agendamentos: ags ?? [],
    politica: '/privacidade',
  }
}
