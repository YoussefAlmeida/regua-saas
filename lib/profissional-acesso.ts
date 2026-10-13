import type { SessaoUsuario } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'

/* Dono mexe na agenda de qualquer barbeiro da barbearia;
   barbeiro só na própria (seção 6.1.1). */
export async function podeMexerNaAgendaDe(sessao: SessaoUsuario, profissional_id: string): Promise<boolean> {
  if (sessao.papel === 'cliente') return false
  if (sessao.papel === 'barbeiro' && sessao.profissional_id !== profissional_id) return false
  const { data } = await criarClienteServico()
    .from('profissionais')
    .select('id')
    .eq('id', profissional_id)
    .eq('barbearia_id', sessao.barbearia_id)
    .maybeSingle()
  return !!data
}
