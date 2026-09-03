import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { criarClienteServico } from '@/lib/supabase/server'
import { hashSenha } from '@/lib/auth'

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

  const { profissional_id, servico_id, inicio, cliente_nome, cliente_whatsapp } = parse.data

  const db = criarClienteServico()

  const { data: barbearia } = await db
    .from('barbearias')
    .select('id, status')
    .eq('slug', slug)
    .single()

  if (!barbearia) return NextResponse.json({ erro: 'Barbearia não encontrada' }, { status: 404 })
  if (barbearia.status === 'cancelado') return NextResponse.json({ erro: 'Barbearia inativa' }, { status: 410 })

  const { data: servico } = await db
    .from('servicos')
    .select('id, preco, duracao_min, ativo')
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

  // Cria ou encontra cliente pelo WhatsApp
  const { data: clienteExistente } = await db
    .from('usuarios')
    .select('id, barbearia_id')
    .eq('whatsapp', cliente_whatsapp)
    .maybeSingle()

  let cliente_id: string

  if (clienteExistente) {
    if (clienteExistente.barbearia_id !== barbearia.id) {
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

  return NextResponse.json({ agendamento, ok: true }, { status: 201 })
}
