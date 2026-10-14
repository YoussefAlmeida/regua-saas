import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { falhaInterna } from '@/lib/erros'

const SchemaPatch = z.object({
  nome: z.string().min(1).max(100).optional(),
  telefone: z.string().max(20).nullable().optional(),
  endereco: z.string().max(200).nullable().optional(),
  instagram: z.string().max(50).nullable().optional(),
  logo_url: z.string().nullable().optional(),
  horario_funcionamento: z.record(
    z.object({
      ativo: z.boolean(),
      inicio: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      fim: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      intervalo_inicio: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      intervalo_fim: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    }),
  ).optional(),
  dias_fechados: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(60).optional(),
})

export async function GET() {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const db = criarClienteServico()
  const { data, error } = await db
    .from('barbearias')
    .select('id, nome, slug, telefone, endereco, instagram, logo_url, horario_funcionamento, dias_fechados, plano, status, trial_fim')
    .eq('id', sessao.barbearia_id)
    .single()

  if (error) return falhaInterna('painel/barbearia', error, 'Erro ao buscar dados')
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parse = SchemaPatch.safeParse(body)
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })

  if (parse.data.dias_fechados) {
    parse.data.dias_fechados = [...new Set(parse.data.dias_fechados)].sort()
  }

  const db = criarClienteServico()
  const { data, error } = await db
    .from('barbearias')
    .update({ ...parse.data, atualizado_em: new Date().toISOString() })
    .eq('id', sessao.barbearia_id)
    .select('id, nome, slug, telefone, endereco, instagram, logo_url, horario_funcionamento, dias_fechados')
    .single()

  if (error) return falhaInterna('painel/barbearia', error, 'Erro ao salvar')
  return NextResponse.json(data)
}
