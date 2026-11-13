import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { registrarAuditoria } from '@/lib/auditoria'
import { semColuna, AVISO_ATUALIZACAO } from '@/lib/extras'

/* Comissão (%) e meta do mês (R$) de um profissional — só o dono define */
const Schema = z.object({
  comissao_pct: z.number().min(0).max(100).nullable().optional(),
  meta_mensal: z.number().min(0).max(1_000_000).nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  const parse = Schema.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Comissão de 0 a 100% e meta em reais' }, { status: 400 })

  const { id } = await params
  const { data, error } = await criarClienteServico().from('profissionais')
    .update(parse.data).eq('id', id).eq('barbearia_id', sessao.barbearia_id).select('id').maybeSingle()
  if (semColuna(error)) return NextResponse.json({ erro: AVISO_ATUALIZACAO }, { status: 409 })
  if (error) return NextResponse.json({ erro: 'Não deu pra salvar' }, { status: 500 })
  if (!data) return NextResponse.json({ erro: 'Profissional não encontrado' }, { status: 404 })

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id, usuario_id: sessao.usuario_id,
    acao: 'comissao_meta', tabela: 'profissionais', registro_id: id, depois: parse.data, req,
  })
  return NextResponse.json({ ok: true })
}
