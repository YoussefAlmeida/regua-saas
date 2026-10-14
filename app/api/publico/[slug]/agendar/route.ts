import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { criarClienteServico } from '@/lib/supabase/server'
import { gravarCookieSessao } from '@/lib/auth'
import { horariosLivres, dataHoraLocal } from '@/lib/disponibilidade'
import { SchemaAcesso, resolverCliente } from '@/lib/conta-cliente'
import { registrarAuditoria } from '@/lib/auditoria'
import { enviarTexto, textoConfirmacaoCliente, textoNotificacaoBarbeiro } from '@/lib/whatsapp'

const SchemaAgendar = z.object({
  profissional_id: z.string().uuid(),
  servico_id: z.string().uuid(),
  inicio: z.string().datetime({ offset: true }),
  cliente: SchemaAcesso,
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const parse = SchemaAgendar.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Confere os dados e tenta de novo' }, { status: 400 })

  const { profissional_id, servico_id, inicio } = parse.data
  const db = criarClienteServico()

  const { data: barbearia } = await db
    .from('barbearias')
    .select('id, nome, status, horario_funcionamento, dias_fechados')
    .eq('slug', slug)
    .single()

  if (!barbearia) return NextResponse.json({ erro: 'Barbearia não encontrada' }, { status: 404 })
  if (barbearia.status === 'cancelado' || barbearia.status === 'leitura') {
    return NextResponse.json({ erro: 'Essa barbearia não está aceitando agendamentos online no momento' }, { status: 410 })
  }

  const [{ data: servico }, { data: profissional }] = await Promise.all([
    db.from('servicos').select('id, nome, preco, duracao_min, ativo').eq('id', servico_id).eq('barbearia_id', barbearia.id).maybeSingle(),
    db.from('profissionais')
      .select('id, nome, usuario:usuarios!usuario_id(whatsapp)')
      .eq('id', profissional_id).eq('barbearia_id', barbearia.id).eq('ativo', true).maybeSingle(),
  ])

  if (!servico || !servico.ativo) return NextResponse.json({ erro: 'Esse serviço não está mais disponível' }, { status: 404 })
  if (!profissional) return NextResponse.json({ erro: 'Esse barbeiro não está disponível' }, { status: 404 })

  // O horário precisa estar livre de verdade (expediente, feriado, bloqueio, passado)
  const inicioDate = new Date(inicio)
  const local = dataHoraLocal(inicioDate.toISOString())
  const livres = await horariosLivres(db, barbearia, profissional_id, local.data, servico.duracao_min)
  if (!livres.includes(local.hora)) {
    return NextResponse.json({ erro: 'Esse horário acabou de ser ocupado. Escolhe outro.', horarioOcupado: true }, { status: 409 })
  }

  // Quem é o cliente (sessão, conta nova ou login)
  const quem = await resolverCliente(parse.data.cliente, barbearia.id, req)
  if (!quem.ok) return quem.res
  const cliente = quem.cliente

  // Evita o mesmo cliente marcar duas vezes no mesmo dia/horário por clique duplo
  const fimDate = new Date(inicioDate.getTime() + servico.duracao_min * 60_000)
  const { count: duplicado } = await db
    .from('agendamentos')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', cliente.id)
    .in('status', ['agendado', 'confirmado'])
    .lt('inicio', fimDate.toISOString())
    .gt('fim', inicioDate.toISOString())
  if (duplicado) {
    return NextResponse.json({ erro: 'Você já tem um horário marcado nesse período. Confere em "Meus agendamentos".' }, { status: 409 })
  }

  const { data: agendamento, error } = await db
    .from('agendamentos')
    .insert({
      barbearia_id: barbearia.id,
      profissional_id,
      servico_id,
      cliente_id: cliente.id,
      inicio: inicioDate.toISOString(),
      fim: fimDate.toISOString(),
      valor_servico: servico.preco,
      criado_por: cliente.id,
    })
    .select('id, inicio, fim, status')
    .single()

  if (error || !agendamento) {
    console.error('[agendar] criar agendamento:', error?.code, error?.message)
    const conflito = error?.code === '23P01' || error?.message.includes('sem_conflito')
    return NextResponse.json(
      { erro: conflito ? 'Esse horário acabou de ser ocupado. Escolhe outro.' : 'Erro ao agendar. Tenta de novo.', horarioOcupado: conflito },
      { status: conflito ? 409 : 500 },
    )
  }

  await registrarAuditoria({
    barbearia_id: barbearia.id,
    usuario_id: cliente.id,
    acao: 'criar',
    tabela: 'agendamentos',
    registro_id: agendamento.id,
    depois: { inicio: agendamento.inicio, profissional_id, servico_id, valor: servico.preco, origem: 'link' },
    req,
  })

  // Notificações WhatsApp — não travam a resposta se falharem
  const usuarioProf = Array.isArray(profissional.usuario) ? profissional.usuario[0] : profissional.usuario
  const profWhatsapp = (usuarioProf as { whatsapp?: string } | null)?.whatsapp

  const [, avisoBarbeiro] = await Promise.allSettled([
    enviarTexto(cliente.whatsapp, textoConfirmacaoCliente({
      clienteNome: cliente.nome.split(' ')[0],
      barbeariaNome: barbearia.nome,
      servicoNome: servico.nome,
      barbeiiroNome: profissional.nome,
      data: local.data,
      hora: local.hora,
    })),
    profWhatsapp
      ? enviarTexto(profWhatsapp, textoNotificacaoBarbeiro({
          barbeiiroNome: profissional.nome,
          clienteNome: cliente.nome,
          servicoNome: servico.nome,
          data: local.data,
          hora: local.hora,
        }))
      : Promise.resolve(false),
  ])
  if (avisoBarbeiro.status === 'fulfilled' && avisoBarbeiro.value) {
    await db.from('agendamentos')
      .update({ notificacao_barbeiro_enviada: true, notificacao_via: 'api' })
      .eq('id', agendamento.id)
  }

  const res = NextResponse.json({ ok: true, agendamento, cliente: { nome: cliente.nome } }, { status: 201 })
  if (cliente.token) gravarCookieSessao(res, cliente.token)
  return res
}
