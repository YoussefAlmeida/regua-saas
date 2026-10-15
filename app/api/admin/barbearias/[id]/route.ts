import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { criarClienteServico } from '@/lib/supabase/server'
import { adminLogado, registrarAcaoAdmin, PLANOS_ADMIN } from '@/lib/admin'
import { pagamentoConfirmado } from '@/lib/mudanca-plano'

const Schema = z.discriminatedUnion('acao', [
  z.object({ acao: z.literal('estender_teste'), dias: z.number().int().min(1).max(90) }),
  z.object({ acao: z.literal('ativar_plano'), plano: z.enum(['cadeira', 'barbearia', 'rede']), mesmoAssim: z.boolean().optional() }),
  z.object({ acao: z.literal('suspender') }),   // só leitura: vê os dados, não lança nada
  z.object({ acao: z.literal('cancelar') }),    // sai do ar: página pública e lançamentos bloqueados
  z.object({ acao: z.literal('reativar') }),
])

const DIA = 86_400_000

async function carregar(id: string) {
  const { data } = await criarClienteServico()
    .from('barbearias')
    .select('id, nome, slug, plano, status, trial_fim, plano_ciclo_fim, plano_agendado')
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
    case 'ativar_plano': {
      // O botão não sabe qual pagamento é: se já entrou um nos últimos 3 dias
      // (aqui ou pelo Asaas), pergunta antes de somar mais um mês
      if (!a.mesmoAssim) {
        const { data: recente } = await criarClienteServico().from('admin_log')
          .select('acao, criado_em').eq('barbearia_id', id).in('acao', ['ativar_plano', 'pagamento_asaas'])
          .gte('criado_em', new Date(Date.now() - 3 * DIA).toISOString())
          .order('criado_em', { ascending: false }).limit(1).maybeSingle()
        if (recente) {
          const quando = new Date(recente.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
          const quem = recente.acao === 'pagamento_asaas' ? 'pelo Asaas' : 'aqui no admin'
          return NextResponse.json({ erro: `Já entrou um pagamento ${quem} em ${quando}.`, jaPago: true }, { status: 409 })
        }
      }
      // = pagamento confirmado (mesma regra do Asaas)
      mudanca = await pagamentoConfirmado(b, a.plano)
      break
    }
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
    .select('id, nome, slug, plano, status, trial_fim, plano_ciclo_fim')
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
      aviso = `Atenção: ${b.nome} tem ${count} na agenda e o ${PLANOS_ADMIN[a.plano].nome} vai até ${max}. Quando o dono abrir o painel, ele precisa escolher quem fica antes de seguir.`
    }
  }

  return NextResponse.json({ ...data, aviso })
}

/** Todas as fotos da barbearia no Storage ({id}/barbeiros/…, {id}/…) */
async function apagarFotos(db: ReturnType<typeof criarClienteServico>, id: string) {
  const caminhos: string[] = []
  const pastas = [id]
  while (pastas.length) {
    const pasta = pastas.pop()!
    for (let pagina = 0; ; pagina++) {
      const { data } = await db.storage.from('fotos').list(pasta, { limit: 100, offset: pagina * 100 })
      if (!data?.length) break
      for (const f of data) {
        // Sem id = é uma pasta
        if (f.id) caminhos.push(`${pasta}/${f.name}`)
        else pastas.push(`${pasta}/${f.name}`)
      }
      if (data.length < 100) break
    }
  }
  for (let i = 0; i < caminhos.length; i += 100) {
    await db.storage.from('fotos').remove(caminhos.slice(i, i + 100))
  }
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

  // Antes de apagar: quem é da barbearia (pra limpar os bloqueios de login deles)
  const { data: pessoas } = await db.from('usuarios').select('id, email, whatsapp').eq('barbearia_id', id)
  const chavesLogin = (pessoas ?? []).flatMap(u => [
    `id:reauth:${u.id}`,
    ...(u.email ? [`id:${u.email.toLowerCase()}`, `id:rec:${u.email.toLowerCase()}`] : []),
    ...(u.whatsapp ? [`id:${u.whatsapp}`, `id:rec:${u.whatsapp}`] : []),
  ])

  // Um comando só: o banco apaga em cascata usuários, agendamentos, financeiro,
  // serviços, horários, auditoria… Se algo falhar, nada é apagado (tudo ou nada).
  const { error } = await db.from('barbearias').delete().eq('id', id)
  if (error) {
    console.error('[admin apagar]', error.message)
    return NextResponse.json({ erro: 'Não deu pra apagar a barbearia. Nada foi removido.' }, { status: 500 })
  }

  // O que fica fora do banco da barbearia: a pasta do admin (erros e
  // ações), bloqueios de login e as fotos no Storage
  await Promise.all([
    db.from('erros_sistema').delete().eq('barbearia_id', id),
    db.from('admin_log').delete().eq('barbearia_id', id),
    chavesLogin.length ? db.from('tentativas_login').delete().in('chave', chavesLogin) : null,
    apagarFotos(db, id),
  ])

  // Só um recibo no registro geral (sem ligação com a pasta, que não existe mais)
  await registrarAcaoAdmin(req, 'apagar', null, { barbearia: b.nome, slug: b.slug, status: b.status, plano: b.plano })
  return NextResponse.json({ ok: true })
}
