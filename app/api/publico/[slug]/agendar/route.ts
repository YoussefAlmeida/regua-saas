import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { criarClienteServico } from '@/lib/supabase/server'
import { horariosLivres, dataHoraLocal } from '@/lib/disponibilidade'
import { normalizarWhatsapp } from '@/lib/utils'
import { hashSenha } from '@/lib/auth'
import { enviarTexto, textoConfirmacaoCliente, textoNotificacaoBarbeiro } from '@/lib/whatsapp'

const SchemaAgendar = z.object({
  profissional_id: z.string().uuid(),
  servico_id: z.string().uuid(),
  inicio: z.string(),
  cliente_nome: z.string().min(2).max(100),
  cliente_whatsapp: z.string().min(8).max(20),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json().catch(() => null)
  const parse = SchemaAgendar.safeParse(body)
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })

  const { profissional_id, servico_id, inicio, cliente_nome } = parse.data
  const cliente_whatsapp = normalizarWhatsapp(parse.data.cliente_whatsapp)
  if (cliente_whatsapp.length < 10 || cliente_whatsapp.length > 11) {
    return NextResponse.json({ erro: 'WhatsApp inválido. Use DDD + número.' }, { status: 400 })
  }

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

  const { data: servico } = await db
    .from('servicos')
    .select('id, nome, preco, duracao_min, ativo')
    .eq('id', servico_id)
    .eq('barbearia_id', barbearia.id)
    .single()

  if (!servico || !servico.ativo) {
    return NextResponse.json({ erro: 'Serviço não disponível' }, { status: 404 })
  }

  const { data: profissional } = await db
    .from('profissionais')
    .select('id, usuario_id')
    .eq('id', profissional_id)
    .eq('barbearia_id', barbearia.id)
    .eq('ativo', true)
    .single()

  if (!profissional) return NextResponse.json({ erro: 'Profissional não disponível' }, { status: 404 })

  // O horário precisa estar livre de verdade (expediente, feriado, bloqueio, passado)
  const inicioPedido = new Date(inicio)
  if (isNaN(inicioPedido.getTime())) return NextResponse.json({ erro: 'Horário inválido' }, { status: 400 })
  const local = dataHoraLocal(inicioPedido.toISOString())
  const livres = await horariosLivres(db, barbearia, profissional_id, local.data, servico.duracao_min)
  if (!livres.includes(local.hora)) {
    return NextResponse.json({ erro: 'Esse horário não está mais disponível. Escolhe outro.' }, { status: 409 })
  }

  // Cria ou encontra cliente pelo WhatsApp
  const { data: clienteExistente } = await db
    .from('usuarios')
    .select('id, barbearia_id, papel')
    .eq('whatsapp', cliente_whatsapp)
    .maybeSingle()

  let cliente_id: string

  if (clienteExistente) {
    if (clienteExistente.barbearia_id !== barbearia.id || clienteExistente.papel !== 'cliente') {
      return NextResponse.json({
        erro: 'Este WhatsApp já está cadastrado em outra barbearia. Entre em contato com a barbearia.',
      }, { status: 409 })
    }
    cliente_id = clienteExistente.id
  } else {
    const senha_hash = await hashSenha(crypto.randomUUID())
    const { data: novoCliente, error: errCliente } = await db
      .from('usuarios')
      .insert({
        barbearia_id: barbearia.id,
        nome: cliente_nome,
        whatsapp: cliente_whatsapp,
        senha_hash,
        papel: 'cliente',
        status: 'aprovado',
      })
      .select('id')
      .single()

    if (errCliente) return NextResponse.json({ erro: 'Erro ao registrar cliente' }, { status: 500 })
    cliente_id = novoCliente.id
  }

  const inicioDate = new Date(inicio)
  const fimDate    = new Date(inicioDate.getTime() + servico.duracao_min * 60 * 1000)

  const { data: agendamento, error } = await db
    .from('agendamentos')
    .insert({
      barbearia_id: barbearia.id,
      profissional_id,
      servico_id,
      cliente_id,
      inicio: inicioDate.toISOString(),
      fim: fimDate.toISOString(),
      valor_servico: servico.preco,
      criado_por: cliente_id,
    })
    .select('id, inicio, fim, status')
    .single()

  if (error) {
    const msg = error.message.includes('sem_conflito') ? 'Horário já ocupado. Escolha outro horário.' : 'Erro ao criar agendamento'
    return NextResponse.json({ erro: msg }, { status: 409 })
  }

  // Notificações WhatsApp (fire-and-forget)
  const dataLocal = inicioDate.toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' })
  const horaLocal = inicioDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' })

  const { data: profDetalhes } = await db
    .from('profissionais')
    .select('nome, usuarios!usuario_id(whatsapp)')
    .eq('id', profissional_id)
    .single()

  const profNome = profDetalhes?.nome ?? 'Barbeiro'
  const profWhatsapp = Array.isArray(profDetalhes?.usuarios)
    ? (profDetalhes.usuarios[0] as { whatsapp?: string })?.whatsapp
    : (profDetalhes?.usuarios as unknown as { whatsapp?: string } | null)?.whatsapp

  const textoCliente = textoConfirmacaoCliente({
    clienteNome: cliente_nome,
    barbeariaNome: barbearia.nome ?? 'Barbearia',
    servicoNome: servico.nome ?? 'Serviço',
    barbeiiroNome: profNome,
    data: dataLocal,
    hora: horaLocal,
  })

  const textoBarbeiro = textoNotificacaoBarbeiro({
    barbeiiroNome: profNome,
    clienteNome: cliente_nome,
    servicoNome: servico.nome ?? 'Serviço',
    data: dataLocal,
    hora: horaLocal,
  })

  await Promise.allSettled([
    enviarTexto(cliente_whatsapp, textoCliente),
    profWhatsapp ? enviarTexto(profWhatsapp, textoBarbeiro) : Promise.resolve(false),
  ])

  return NextResponse.json({ agendamento, ok: true }, { status: 201 })
}
