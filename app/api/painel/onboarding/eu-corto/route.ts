import { NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { falhaInterna } from '@/lib/erros'

/* "Sou eu que corto" — o dono também aparece como barbeiro na agenda
   e na página de agendamento (seção 6.1.2, passo 2). */
export async function POST() {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

  const db = criarClienteServico()
  const { data: existente } = await db
    .from('profissionais')
    .select('id, ativo')
    .eq('usuario_id', sessao.usuario_id)
    .maybeSingle()

  if (existente) {
    if (!existente.ativo) await db.from('profissionais').update({ ativo: true }).eq('id', existente.id)
    return NextResponse.json({ id: existente.id })
  }

  const { data: dono } = await db.from('usuarios').select('nome').eq('id', sessao.usuario_id).single()
  const { data, error } = await db
    .from('profissionais')
    .insert({ barbearia_id: sessao.barbearia_id, usuario_id: sessao.usuario_id, nome: dono?.nome ?? 'Dono' })
    .select('id')
    .single()

  if (error) return falhaInterna('painel/onboarding/eu-corto', error, 'Não deu pra te colocar na agenda')
  return NextResponse.json({ id: data.id }, { status: 201 })
}
