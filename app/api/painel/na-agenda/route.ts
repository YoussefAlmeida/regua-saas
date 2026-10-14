import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { exigirVagaProfissional } from '@/lib/plano-servidor'
import { bloqueioSomenteLeitura } from '@/lib/conta'
import { tirarDaAgenda } from '@/lib/agenda-saida'
import { registrarAuditoria } from '@/lib/auditoria'
import { falhaInterna } from '@/lib/erros'
import { exigirSenha } from '@/lib/reautenticar'

/* ================================================================
   Ativar / desativar alguém NA AGENDA (só o dono)
   - Desativado continua com conta e histórico; não aparece pros
     clientes e não recebe agendamento. Volta com um toque.
   - Ativar respeita o limite de profissionais do plano.
   - Desativar quem tem horário marcado pede a senha (cancela tudo).
   alvo = 'eu' (o dono) ou o id de usuário do barbeiro
   ================================================================ */

const Alvo = z.union([z.literal('eu'), z.string().uuid()])

async function futurosDe(profissional_id: string) {
  const { count } = await criarClienteServico().from('agendamentos')
    .select('id', { count: 'exact', head: true })
    .eq('profissional_id', profissional_id).in('status', ['agendado', 'confirmado'])
    .gt('inicio', new Date().toISOString())
  return count ?? 0
}

async function acharAlvo(barbearia_id: string, dono_id: string, alvo: string) {
  const db = criarClienteServico()
  const usuario_id = alvo === 'eu' ? dono_id : alvo
  const { data: u } = await db.from('usuarios')
    .select('id, nome, papel, status, ativo')
    .eq('id', usuario_id).eq('barbearia_id', barbearia_id).in('papel', ['dono', 'barbeiro'])
    .maybeSingle()
  if (!u) return null
  const { data: prof } = await db.from('profissionais')
    .select('id, ativo').eq('usuario_id', u.id).eq('barbearia_id', barbearia_id).maybeSingle()
  return { u, prof }
}

/** Prévia: quantos horários futuros cairiam ao desativar */
export async function GET(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  const alvo = Alvo.safeParse(req.nextUrl.searchParams.get('alvo'))
  if (!alvo.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })

  const a = await acharAlvo(sessao.barbearia_id, sessao.usuario_id, alvo.data)
  if (!a?.prof) return NextResponse.json({ futuros: 0 })
  return NextResponse.json({ futuros: await futurosDe(a.prof.id) })
}

export async function POST(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parse = z.object({ alvo: Alvo, naAgenda: z.boolean() }).safeParse(body)
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
  const { alvo, naAgenda } = parse.data

  const a = await acharAlvo(sessao.barbearia_id, sessao.usuario_id, alvo)
  if (!a) return NextResponse.json({ erro: 'Pessoa não encontrada' }, { status: 404 })
  const { u, prof } = a
  const db = criarClienteServico()

  if (naAgenda) {
    if (prof?.ativo) return NextResponse.json({ ok: true })
    if (u.papel === 'barbeiro' && (!u.ativo || u.status !== 'aprovado')) {
      return NextResponse.json({ erro: 'Esse barbeiro precisa estar aprovado e ativo na equipe' }, { status: 400 })
    }
    const leitura = await bloqueioSomenteLeitura(sessao.barbearia_id)
    if (leitura) return leitura
    const semVaga = await exigirVagaProfissional(sessao.barbearia_id)
    if (semVaga) return semVaga

    const { error } = prof
      ? await db.from('profissionais').update({ ativo: true }).eq('id', prof.id)
      : await db.from('profissionais').insert({ barbearia_id: sessao.barbearia_id, usuario_id: u.id, nome: u.nome })
    if (error) return falhaInterna('na-agenda/ativar', error, 'Não deu pra colocar na agenda')
  }

  let cancelados: unknown[] = []
  if (!naAgenda) {
    if (!prof?.ativo) return NextResponse.json({ ok: true, cancelados })
    if (await futurosDe(prof.id) > 0) {
      const negado = await exigirSenha(sessao, body?.senha, req)
      if (negado) return negado
    }
    cancelados = await tirarDaAgenda(prof.id)
  }

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id,
    usuario_id: sessao.usuario_id,
    acao: naAgenda ? 'ativar_agenda' : 'desativar_agenda',
    tabela: 'profissionais',
    registro_id: prof?.id ?? null,
    depois: { quem: u.nome, agendamentos_cancelados: cancelados.length },
    req,
  })

  return NextResponse.json({ ok: true, cancelados })
}
