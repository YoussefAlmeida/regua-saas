import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'
import { enviarTexto, textoLembreteCliente, urlDoSite } from '@/lib/whatsapp'

/* Roda a cada 15 minutos. O plano Hobby da Vercel só permite cron diário,
   então quem chama esta rota é um agendador externo (ex.: cron-job.org)
   com o header  Authorization: Bearer <CRON_SECRET>. */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const db = criarClienteServico()

  const agora = new Date()
  const em1h45 = new Date(agora.getTime() + 105 * 60 * 1000) // +1h45m
  const em2h   = new Date(agora.getTime() + 120 * 60 * 1000) // +2h

  const { data: agendamentos, error } = await db
    .from('agendamentos')
    .select(`
      id, inicio, valor_servico,
      barbearia:barbearias!barbearia_id(nome, slug),
      cliente:usuarios!cliente_id(nome, whatsapp),
      profissional:profissionais!profissional_id(nome),
      servico:servicos!servico_id(nome)
    `)
    .in('status', ['confirmado'])
    .eq('lembrete_cliente_enviado', false)
    .gte('inicio', em1h45.toISOString())
    .lte('inicio', em2h.toISOString())

  if (error) return NextResponse.json({ erro: 'Erro ao buscar agendamentos' }, { status: 500 })
  if (!agendamentos || agendamentos.length === 0) {
    return NextResponse.json({ ok: true, lembretes_enviados: 0 })
  }

  let enviados = 0

  for (const ag of agendamentos) {
    const cliente   = Array.isArray(ag.cliente)   ? ag.cliente[0]   : ag.cliente
    const barbearia = Array.isArray(ag.barbearia) ? ag.barbearia[0] : ag.barbearia
    const profissional = Array.isArray(ag.profissional) ? ag.profissional[0] : ag.profissional
    const servico   = Array.isArray(ag.servico)   ? ag.servico[0]   : ag.servico

    if (!cliente?.whatsapp) continue

    const hora = new Date(ag.inicio).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia',
    })

    const texto = textoLembreteCliente({
      clienteNome:   cliente.nome,
      barbeariaNome: barbearia?.nome ?? 'RÉGUA',
      servicoNome:   servico?.nome ?? 'Serviço',
      barbeiiroNome: profissional?.nome ?? 'Barbeiro',
      hora,
      linkCancelar: barbearia?.slug ? `${urlDoSite()}/${barbearia.slug}/meus-agendamentos` : undefined,
    })

    const ok = await enviarTexto(cliente.whatsapp, texto)
    if (ok) {
      await db
        .from('agendamentos')
        .update({ lembrete_cliente_enviado: true })
        .eq('id', ag.id)
      enviados++
    }
  }

  return NextResponse.json({ ok: true, lembretes_enviados: enviados })
}
