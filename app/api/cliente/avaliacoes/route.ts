import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { registrarErro } from '@/lib/erros'

/* O cliente avalia um atendimento que ELE fez e que foi concluído.
   Uma avaliação por atendimento; mandar de novo corrige a anterior. */
const Schema = z.object({
  agendamento_id: z.string().uuid(),
  nota: z.number().int().min(1).max(5),
  comentario: z.string().trim().max(300).optional(),
})

export async function POST(req: NextRequest) {
  const s = await getSessao()
  if (!s || s.papel !== 'cliente') return NextResponse.json({ erro: 'Entre na sua conta' }, { status: 401 })
  const parse = Schema.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Escolha de 1 a 5 estrelas' }, { status: 400 })

  const db = criarClienteServico()
  const { data: ag } = await db.from('agendamentos').select('id, status, profissional_id')
    .eq('id', parse.data.agendamento_id).eq('cliente_id', s.usuario_id).eq('barbearia_id', s.barbearia_id).maybeSingle()
  if (!ag) return NextResponse.json({ erro: 'Atendimento não encontrado' }, { status: 404 })
  if (ag.status !== 'concluido') return NextResponse.json({ erro: 'Dá pra avaliar depois que o atendimento for concluído' }, { status: 400 })

  const { error } = await db.from('avaliacoes').upsert({
    barbearia_id: s.barbearia_id, agendamento_id: ag.id, cliente_id: s.usuario_id, profissional_id: ag.profissional_id,
    nota: parse.data.nota, comentario: parse.data.comentario || null,
  }, { onConflict: 'agendamento_id' })
  if (error) {
    await registrarErro('cliente/avaliacoes', error, { barbearia_id: s.barbearia_id, usuario_id: s.usuario_id })
    return NextResponse.json({ erro: 'As avaliações ainda não estão disponíveis nesta barbearia.' }, { status: 409 })
  }
  return NextResponse.json({ ok: true, nota: parse.data.nota }, { status: 201 })
}
