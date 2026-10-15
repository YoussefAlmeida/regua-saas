import { NextResponse, type NextRequest } from 'next/server'
import { getSessao, renovarSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { exigirVagaProfissional } from '@/lib/plano-servidor'
import { falhaInterna } from '@/lib/erros'
import { exigirSenha } from '@/lib/reautenticar'
import { tirarDaAgenda } from '@/lib/agenda-saida'
import { registrarAuditoria } from '@/lib/auditoria'

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

  if (existente?.ativo) return renovarSessao(NextResponse.json({ id: existente.id }), sessao)

  const semVaga = await exigirVagaProfissional(sessao.barbearia_id)
  if (semVaga) return semVaga

  if (existente) {
    await db.from('profissionais').update({ ativo: true }).eq('id', existente.id)
    return renovarSessao(NextResponse.json({ id: existente.id }), sessao)
  }

  const { data: dono } = await db.from('usuarios').select('nome').eq('id', sessao.usuario_id).single()
  const { data, error } = await db
    .from('profissionais')
    .insert({ barbearia_id: sessao.barbearia_id, usuario_id: sessao.usuario_id, nome: dono?.nome ?? 'Dono' })
    .select('id')
    .single()

  if (error) return falhaInterna('painel/onboarding/eu-corto', error, 'Não deu pra te colocar na agenda')
  return renovarSessao(NextResponse.json({ id: data.id }, { status: 201 }), sessao)
}

/** "Parar de atender": o dono sai da agenda (com senha). Horários futuros dele são cancelados. */
export async function DELETE(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const negado = await exigirSenha(sessao, body?.senha, req)
  if (negado) return negado

  const { data: prof } = await criarClienteServico()
    .from('profissionais').select('id').eq('usuario_id', sessao.usuario_id).eq('ativo', true).maybeSingle()
  if (!prof) return NextResponse.json({ erro: 'Você já não está na agenda' }, { status: 400 })

  const cancelados = await tirarDaAgenda(prof.id)
  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id, usuario_id: sessao.usuario_id,
    acao: 'remover', tabela: 'profissionais', registro_id: prof.id,
    depois: { dono_parou_de_atender: true, agendamentos_cancelados: cancelados.length }, req,
  })
  return NextResponse.json({ ok: true, cancelados })
}
