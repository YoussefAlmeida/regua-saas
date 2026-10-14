import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { exigirSenha } from '@/lib/reautenticar'
import { registrarAuditoria } from '@/lib/auditoria'
import { falhaInterna } from '@/lib/erros'
import { PLANOS, LISTA_PLANOS, type PlanoPagoId } from '@/lib/planos'
import { aplicarMudanca } from '@/lib/mudanca-plano'

/* Agendar (POST) ou desistir (DELETE) da mudança pra um plano menor.
   Vale no fim do mês já pago; sem mês pago registrado, vale na hora. */

const Schema = z.object({
  para: z.enum(['cadeira', 'barbearia', 'rede']),
  manter: z.array(z.string().uuid()).max(50),
  senha: z.string().optional(),
})

const ordem = (id: string) => LISTA_PLANOS.findIndex(p => p.id === id)

export async function POST(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parse = Schema.safeParse(body)
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
  const { para, manter } = parse.data

  const db = criarClienteServico()
  const { data: b } = await db.from('barbearias')
    .select('plano, status, plano_ciclo_fim').eq('id', sessao.barbearia_id).single()
  if (!b || b.status !== 'ativo' || !(b.plano in PLANOS)) {
    return NextResponse.json({ erro: 'A mudança de plano vale pra conta com plano ativo. Fale com a gente pelo WhatsApp.' }, { status: 400 })
  }
  if (ordem(para) >= ordem(b.plano)) {
    return NextResponse.json({ erro: 'Pra subir de plano, fale com a gente: a troca é na hora.' }, { status: 400 })
  }

  // Quem fica precisa estar na agenda hoje e caber no plano novo
  const max = PLANOS[para as PlanoPagoId].maxProfissionais
  const { data: profs } = await db.from('profissionais')
    .select('usuario_id').eq('barbearia_id', sessao.barbearia_id).eq('ativo', true)
  const naAgenda = new Set((profs ?? []).map(p => p.usuario_id))
  const escolhidos = [...new Set(manter)].filter(id => naAgenda.has(id))
  if (max !== null && escolhidos.length > max) {
    return NextResponse.json({ erro: `O plano ${PLANOS[para].nome} vai até ${max} na agenda. Escolha no máximo ${max}.` }, { status: 400 })
  }

  const negado = await exigirSenha(sessao, body?.senha, req)
  if (negado) return negado

  const fim = b.plano_ciclo_fim ? new Date(b.plano_ciclo_fim) : null
  const imediato = !fim || fim.getTime() <= Date.now()
  const em = imediato ? new Date().toISOString() : fim!.toISOString()

  const { error } = await db.from('barbearias').update({
    plano_agendado: para,
    plano_agendado_em: em,
    plano_agendado_manter: escolhidos,
  }).eq('id', sessao.barbearia_id)
  if (error) return falhaInterna('plano/mudanca', error, 'Não deu pra agendar a mudança')

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id, usuario_id: sessao.usuario_id,
    acao: 'agendar_plano', tabela: 'barbearias', registro_id: sessao.barbearia_id,
    antes: { plano: b.plano }, depois: { para, em, manter: escolhidos.length }, req,
  })

  if (imediato) await aplicarMudanca(sessao.barbearia_id)
  return NextResponse.json({ ok: true, em, imediato })
}

export async function DELETE(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

  const db = criarClienteServico()
  const { data: b } = await db.from('barbearias')
    .select('plano_agendado').eq('id', sessao.barbearia_id).single()
  if (!b?.plano_agendado) return NextResponse.json({ ok: true })

  const { error } = await db.from('barbearias').update({
    plano_agendado: null, plano_agendado_em: null, plano_agendado_manter: null,
  }).eq('id', sessao.barbearia_id)
  if (error) return falhaInterna('plano/mudanca', error, 'Não deu pra cancelar a mudança')

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id, usuario_id: sessao.usuario_id,
    acao: 'cancelar_mudanca_plano', tabela: 'barbearias', registro_id: sessao.barbearia_id,
    antes: { para: b.plano_agendado }, req,
  })
  return NextResponse.json({ ok: true })
}
