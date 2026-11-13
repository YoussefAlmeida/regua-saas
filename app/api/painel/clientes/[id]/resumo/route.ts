import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao, type SessaoUsuario } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { semColuna, AVISO_ATUALIZACAO } from '@/lib/extras'

/* Ficha rápida do cliente pra quem atende: quantas vezes veio, o último
   serviço e a observação da equipe.
   Dono vê qualquer cliente da barbearia; barbeiro só de quem ele atende
   ou já atendeu (não abre a base de clientes inteira pra ele). */

async function podeVer(sessao: SessaoUsuario, cliente_id: string) {
  const db = criarClienteServico()
  const { data: c } = await db.from('usuarios').select('id, nome')
    .eq('id', cliente_id).eq('barbearia_id', sessao.barbearia_id).eq('papel', 'cliente').maybeSingle()
  if (!c) return null
  if (sessao.papel === 'dono') return c
  if (sessao.papel !== 'barbeiro' || !sessao.profissional_id) return null
  const { count } = await db.from('agendamentos').select('id', { count: 'exact', head: true })
    .eq('cliente_id', cliente_id).eq('profissional_id', sessao.profissional_id).eq('barbearia_id', sessao.barbearia_id)
  return count ? c : null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  const { id } = await params
  const c = await podeVer(sessao, id)
  if (!c) return NextResponse.json({ erro: 'Cliente não encontrado' }, { status: 404 })

  const db = criarClienteServico()
  const [{ count: visitas }, { data: ultimo }, { data: nota }] = await Promise.all([
    db.from('agendamentos').select('id', { count: 'exact', head: true })
      .eq('cliente_id', id).eq('barbearia_id', sessao.barbearia_id).eq('status', 'concluido'),
    db.from('agendamentos').select('inicio, servico:servicos!servico_id(nome)')
      .eq('cliente_id', id).eq('barbearia_id', sessao.barbearia_id).eq('status', 'concluido')
      .order('inicio', { ascending: false }).limit(1).maybeSingle(),
    db.from('usuarios').select('nota_equipe').eq('id', id).maybeSingle<{ nota_equipe: string | null }>(),
  ])
  const srv = ultimo ? (Array.isArray(ultimo.servico) ? ultimo.servico[0] : ultimo.servico) as { nome?: string } | null : null
  return NextResponse.json({
    nome: c.nome,
    visitas: visitas ?? 0,
    ultimo: ultimo ? { quando: ultimo.inicio, servico: srv?.nome ?? null } : null,
    nota: nota?.nota_equipe ?? null,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  const parse = z.object({ nota: z.string().trim().max(300).nullable() }).safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'A observação pode ter até 300 letras' }, { status: 400 })
  const { id } = await params
  if (!(await podeVer(sessao, id))) return NextResponse.json({ erro: 'Cliente não encontrado' }, { status: 404 })

  const { error } = await criarClienteServico().from('usuarios')
    .update({ nota_equipe: parse.data.nota || null }).eq('id', id).eq('barbearia_id', sessao.barbearia_id)
  if (semColuna(error)) return NextResponse.json({ erro: AVISO_ATUALIZACAO }, { status: 409 })
  if (error) return NextResponse.json({ erro: 'Não deu pra salvar a observação' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
