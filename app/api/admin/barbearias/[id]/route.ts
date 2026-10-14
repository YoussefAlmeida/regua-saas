import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { criarClienteServico } from '@/lib/supabase/server'
import { adminLogado, registrarAcaoAdmin, PLANOS_ADMIN } from '@/lib/admin'

const Schema = z.discriminatedUnion('acao', [
  z.object({ acao: z.literal('estender_teste'), dias: z.number().int().min(1).max(90) }),
  z.object({ acao: z.literal('ativar_plano'), plano: z.enum(['cadeira', 'barbearia', 'rede']) }),
  z.object({ acao: z.literal('suspender') }),   // só leitura: vê os dados, não lança nada
  z.object({ acao: z.literal('cancelar') }),    // sai do ar: página pública e lançamentos bloqueados
  z.object({ acao: z.literal('reativar') }),
])

const DIA = 86_400_000

async function carregar(id: string) {
  const { data } = await criarClienteServico()
    .from('barbearias')
    .select('id, nome, slug, plano, status, trial_fim')
    .eq('id', id)
    .maybeSingle()
  return data
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminLogado())) return NextResponse.json({ erro: 'Entre de novo no admin' }, { status: 401 })

  const parse = Schema.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })

  const { id } = await params
  const b = await carregar(id)
  if (!b) return NextResponse.json({ erro: 'Barbearia não encontrada' }, { status: 404 })

  const a = parse.data
  let mudanca: Record<string, unknown>

  switch (a.acao) {
    case 'estender_teste': {
      // Soma a partir de hoje se o teste já acabou; senão, a partir do fim atual
      const base = Math.max(Date.now(), new Date(b.trial_fim).getTime())
      mudanca = { trial_fim: new Date(base + a.dias * DIA).toISOString(), status: 'trial', plano: 'trial' }
      break
    }
    case 'ativar_plano':
      mudanca = { status: 'ativo', plano: a.plano }
      break
    case 'suspender':
      mudanca = { status: 'leitura' }
      break
    case 'cancelar':
      mudanca = { status: 'cancelado' }
      break
    case 'reativar': {
      // Volta pro que faz sentido: plano pago → ativo; senão, teste (dá 7 dias se já venceu)
      if (b.plano !== 'trial') {
        mudanca = { status: 'ativo' }
      } else {
        const fim = new Date(b.trial_fim).getTime()
        mudanca = fim > Date.now()
          ? { status: 'trial' }
          : { status: 'trial', trial_fim: new Date(Date.now() + 7 * DIA).toISOString() }
      }
      break
    }
  }

  const { data, error } = await criarClienteServico()
    .from('barbearias')
    .update({ ...mudanca, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select('id, nome, slug, plano, status, trial_fim')
    .single()
  if (error) return NextResponse.json({ erro: 'Erro ao salvar' }, { status: 500 })

  await registrarAcaoAdmin(req, a.acao, b, {
    antes: { status: b.status, plano: b.plano, trial_fim: b.trial_fim },
    depois: mudanca,
    ...(a.acao === 'ativar_plano' ? { preco: PLANOS_ADMIN[a.plano].preco } : {}),
    ...(a.acao === 'estender_teste' ? { dias: a.dias } : {}),
  })

  // Rebaixou pra um plano menor que a equipe atual? Avisa (o dono escolhe quem fica)
  let aviso: string | null = null
  if (a.acao === 'ativar_plano') {
    const max = PLANOS_ADMIN[a.plano].maxProfissionais
    const { count } = await criarClienteServico().from('profissionais')
      .select('id', { count: 'exact', head: true }).eq('barbearia_id', id).eq('ativo', true)
    if (max !== null && (count ?? 0) > max) {
      aviso = `Atenção: ${b.nome} tem ${count} na agenda e o ${PLANOS_ADMIN[a.plano].nome} vai até ${max}. O dono vai ver o aviso pra escolher quem fica; até lá só os ${max} mais antigos aparecem pros clientes.`
    }
  }

  return NextResponse.json({ ...data, aviso })
}

/** Apaga a barbearia e TUDO dela. Precisa digitar o link (slug) pra confirmar. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminLogado())) return NextResponse.json({ erro: 'Entre de novo no admin' }, { status: 401 })

  const { id } = await params
  const b = await carregar(id)
  if (!b) return NextResponse.json({ erro: 'Barbearia não encontrada' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  if (body?.confirmacao !== b.slug) {
    return NextResponse.json({ erro: `Digite exatamente "${b.slug}" pra confirmar` }, { status: 400 })
  }

  const db = criarClienteServico()

  // Um comando só: o banco apaga em cascata usuários, agendamentos, financeiro…
  // Se algo falhar, nada é apagado (é tudo ou nada).
  const { error } = await db.from('barbearias').delete().eq('id', id)
  if (error) {
    console.error('[admin apagar]', error.message)
    return NextResponse.json({ erro: 'Não deu pra apagar a barbearia. Nada foi removido.' }, { status: 500 })
  }

  // Fotos guardadas no Storage
  const { data: pastas } = await db.storage.from('fotos').list(`${id}/barbeiros`, { limit: 100 })
  if (pastas?.length) await db.storage.from('fotos').remove(pastas.map(f => `${id}/barbeiros/${f.name}`))

  await registrarAcaoAdmin(req, 'apagar', b, { slug: b.slug, status: b.status, plano: b.plano })
  return NextResponse.json({ ok: true })
}
