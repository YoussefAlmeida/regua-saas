import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

function gerarSlots(
  inicio: string,
  fim: string,
  duracao: number,
  intervaloInicio?: string,
  intervaloFim?: string,
): string[] {
  const slots: string[] = []
  let cur = timeToMin(inicio)
  const end = timeToMin(fim)
  const lStart = intervaloInicio ? timeToMin(intervaloInicio) : null
  const lEnd   = intervaloFim   ? timeToMin(intervaloFim)   : null

  while (cur + duracao <= end) {
    if (lStart && lEnd && cur < lEnd && cur + duracao > lStart) {
      cur += 30
      continue
    }
    slots.push(minToTime(cur))
    cur += 30
  }
  return slots
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sp = req.nextUrl.searchParams
  const profissional_id = sp.get('profissional_id')
  const servico_id      = sp.get('servico_id')
  const data            = sp.get('data')

  if (!profissional_id || !servico_id || !data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ erro: 'Parâmetros obrigatórios: profissional_id, servico_id, data' }, { status: 400 })
  }

  const db = criarClienteServico()

  const { data: barbearia } = await db
    .from('barbearias')
    .select('id, horario_funcionamento')
    .eq('slug', slug)
    .single()

  if (!barbearia) return NextResponse.json({ erro: 'Barbearia não encontrada' }, { status: 404 })

  const { data: servico } = await db
    .from('servicos')
    .select('duracao_min')
    .eq('id', servico_id)
    .eq('barbearia_id', barbearia.id)
    .single()

  if (!servico) return NextResponse.json({ erro: 'Serviço não encontrado' }, { status: 404 })

  const diaSemana = new Date(data + 'T12:00:00').getDay()

  // Busca horário do profissional para esse dia
  const { data: horarioProfissional } = await db
    .from('horarios_trabalho')
    .select('inicio, fim, intervalo_inicio, intervalo_fim')
    .eq('profissional_id', profissional_id)
    .eq('dia_semana', diaSemana)
    .maybeSingle()

  // Fallback: horário da barbearia
  const hFunc = barbearia.horario_funcionamento as Record<string, { ativo?: boolean; inicio?: string; fim?: string; intervalo_inicio?: string; intervalo_fim?: string }>
  const hDia = hFunc?.[String(diaSemana)]

  let inicio: string, fim: string, intInicio: string | undefined, intFim: string | undefined

  if (horarioProfissional) {
    inicio   = horarioProfissional.inicio
    fim      = horarioProfissional.fim
    intInicio = horarioProfissional.intervalo_inicio ?? undefined
    intFim    = horarioProfissional.intervalo_fim   ?? undefined
  } else if (hDia?.ativo && hDia.inicio && hDia.fim) {
    inicio   = hDia.inicio
    fim      = hDia.fim
    intInicio = hDia.intervalo_inicio
    intFim    = hDia.intervalo_fim
  } else {
    // Dia sem horário cadastrado = fechado
    return NextResponse.json({ slots: [] })
  }

  const slots = gerarSlots(inicio, fim, servico.duracao_min, intInicio, intFim)

  // Agendamentos existentes do profissional no dia
  const [y, mo, d] = data.split('-').map(Number)
  const inicio_gte = new Date(Date.UTC(y, mo - 1, d, 3, 0, 0)).toISOString()
  const inicio_lt  = new Date(Date.UTC(y, mo - 1, d + 1, 3, 0, 0)).toISOString()

  const { data: agendamentos } = await db
    .from('agendamentos')
    .select('inicio, fim')
    .eq('profissional_id', profissional_id)
    .gte('inicio', inicio_gte)
    .lt('inicio', inicio_lt)
    .not('status', 'in', '("cancelado","faltou")')

  const ocupados = agendamentos ?? []

  // Filtra slots que conflitam com agendamentos existentes
  const slotsLivres = slots.filter(slot => {
    const slotStart = new Date(`${data}T${slot}:00-03:00`)
    const slotEnd   = new Date(slotStart.getTime() + servico.duracao_min * 60 * 1000)
    return !ocupados.some(ag => {
      const agStart = new Date(ag.inicio)
      const agEnd   = new Date(ag.fim)
      return slotStart < agEnd && slotEnd > agStart
    })
  })

  // Remove slots no passado
  const agora = new Date()
  const slotsValidos = slotsLivres.filter(slot => {
    return new Date(`${data}T${slot}:00-03:00`) > agora
  })

  return NextResponse.json({ slots: slotsValidos })
}
