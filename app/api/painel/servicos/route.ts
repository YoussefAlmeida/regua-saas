import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao, COOKIE_SESSION } from '@/lib/auth'
import { criarClienteAutenticado, criarClienteServico } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { podeExecutar } from '@/lib/permissoes'

const Schema = z.object({
  nome: z.string().min(1).max(80),
  preco: z.number().min(0),
  duracao_min: z.number().int().min(5).max(480),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_SESSION)?.value
  if (!token) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const db = criarClienteAutenticado(token)
  const { data, error } = await db.from('servicos').select('*').order('nome')

  if (error) return NextResponse.json({ erro: 'Erro ao buscar serviços' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!podeExecutar('servicos:write', sessao)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parse = Schema.safeParse(body)
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })

  const db = criarClienteServico()
  const { data, error } = await db
    .from('servicos')
    .insert({ ...parse.data, barbearia_id: sessao.barbearia_id })
    .select()
    .single()

  if (error) return NextResponse.json({ erro: 'Erro ao criar serviço' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
