import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { registrarAuditoria } from '@/lib/auditoria'
import { CHAVES, type Permissao } from '@/lib/permissoes-equipe'
import { semColuna, AVISO_ATUALIZACAO } from '@/lib/extras'

/* O dono define o que a equipe pode fazer */
const Schema = z.object(Object.fromEntries(CHAVES.map(k => [k, z.boolean()])) as Record<Permissao, z.ZodBoolean>)

export async function PUT(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  const parse = Schema.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })

  const { error } = await criarClienteServico().from('barbearias').update({ permissoes: parse.data }).eq('id', sessao.barbearia_id)
  if (semColuna(error)) return NextResponse.json({ erro: AVISO_ATUALIZACAO }, { status: 409 })
  if (error) return NextResponse.json({ erro: 'Não deu pra salvar' }, { status: 500 })
  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id, usuario_id: sessao.usuario_id,
    acao: 'permissoes', tabela: 'barbearias', registro_id: sessao.barbearia_id, depois: parse.data, req,
  })
  return NextResponse.json({ ok: true })
}
