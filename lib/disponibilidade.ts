import type { SupabaseClient } from '@supabase/supabase-js'

/* ================================================================
   Disponibilidade de horário — uma regra só, usada em todo lugar
   (página pública, criação de agendamento, tela de horários).

   Ordem de quem vence (seção 6.1 Módulo 2):
   1. Dia fechado da barbearia (feriado)          → ninguém agenda
   2. Dia da semana fechado na barbearia          → ninguém agenda
   3. Horário próprio do barbeiro naquele dia     → usa o dele
      (sem horário próprio → usa o da barbearia)
   4. Tira agendamentos, bloqueios e horário que já passou
   ================================================================ */

export const PASSO_MIN = 30
const FUSO = '-03:00' // Bahia, sem horário de verão

export interface HorarioDia {
  ativo?: boolean
  inicio?: string
  fim?: string
  intervalo_inicio?: string
  intervalo_fim?: string
}

export interface BarbeariaHorario {
  id: string
  horario_funcionamento: Record<string, HorarioDia> | null
  dias_fechados: string[] | null
}

export const paraMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
export const paraHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/** Limites UTC do dia local (Bahia) */
export function limitesDoDia(data: string): { gte: string; lt: string } {
  const [y, m, d] = data.split('-').map(Number)
  return {
    gte: new Date(Date.UTC(y, m - 1, d, 3, 0, 0)).toISOString(),
    lt: new Date(Date.UTC(y, m - 1, d + 1, 3, 0, 0)).toISOString(),
  }
}

export function diaDaSemana(data: string): number {
  return new Date(`${data}T12:00:00${FUSO}`).getUTCDay()
}

/** Expediente do barbeiro naquele dia, já aplicando a hierarquia; null = fechado */
export async function expedienteDoDia(
  db: SupabaseClient,
  barbearia: BarbeariaHorario,
  profissional_id: string,
  data: string,
): Promise<{ inicio: string; fim: string; intervalo_inicio?: string; intervalo_fim?: string; motivo?: string } | null> {
  if ((barbearia.dias_fechados ?? []).includes(data)) return null

  const dia = diaDaSemana(data)
  const hBarbearia = barbearia.horario_funcionamento?.[String(dia)]
  // Barbearia configurou esse dia como fechado → vence o horário do barbeiro
  if (hBarbearia && hBarbearia.ativo === false) return null

  const { data: proprio } = await db
    .from('horarios_trabalho')
    .select('inicio, fim, intervalo_inicio, intervalo_fim')
    .eq('profissional_id', profissional_id)
    .eq('dia_semana', dia)
    .maybeSingle()

  if (proprio) {
    return {
      inicio: proprio.inicio.slice(0, 5),
      fim: proprio.fim.slice(0, 5),
      intervalo_inicio: proprio.intervalo_inicio?.slice(0, 5) ?? undefined,
      intervalo_fim: proprio.intervalo_fim?.slice(0, 5) ?? undefined,
    }
  }

  // Barbeiro que já configurou a semana e deixou esse dia de fora = folga
  const { count } = await db
    .from('horarios_trabalho')
    .select('id', { count: 'exact', head: true })
    .eq('profissional_id', profissional_id)
  if (count) return null

  if (hBarbearia?.ativo && hBarbearia.inicio && hBarbearia.fim) {
    return {
      inicio: hBarbearia.inicio,
      fim: hBarbearia.fim,
      intervalo_inicio: hBarbearia.intervalo_inicio,
      intervalo_fim: hBarbearia.intervalo_fim,
    }
  }
  return null
}

/** Horários livres (HH:MM) do barbeiro no dia, pra um serviço dessa duração */
export async function horariosLivres(
  db: SupabaseClient,
  barbearia: BarbeariaHorario,
  profissional_id: string,
  data: string,
  duracao_min: number,
  ignorarAgendamentoId?: string,
): Promise<string[]> {
  const exp = await expedienteDoDia(db, barbearia, profissional_id, data)
  if (!exp) return []

  const ini = paraMin(exp.inicio)
  const fim = paraMin(exp.fim)
  const iIni = exp.intervalo_inicio ? paraMin(exp.intervalo_inicio) : null
  const iFim = exp.intervalo_fim ? paraMin(exp.intervalo_fim) : null

  const candidatos: string[] = []
  for (let t = ini; t + duracao_min <= fim; t += PASSO_MIN) {
    if (iIni !== null && iFim !== null && t < iFim && t + duracao_min > iIni) continue
    candidatos.push(paraHora(t))
  }
  if (candidatos.length === 0) return []

  const { gte, lt } = limitesDoDia(data)

  let qAg = db
    .from('agendamentos')
    .select('id, inicio, fim')
    .eq('profissional_id', profissional_id)
    .lt('inicio', lt)
    .gt('fim', gte)
    .not('status', 'in', '("cancelado","faltou")')
  if (ignorarAgendamentoId) qAg = qAg.neq('id', ignorarAgendamentoId)

  const [{ data: ags }, { data: bloqs }] = await Promise.all([
    qAg,
    db
      .from('bloqueios_agenda')
      .select('inicio, fim')
      .eq('profissional_id', profissional_id)
      .lt('inicio', lt)
      .gt('fim', gte),
  ])

  const ocupado = [...(ags ?? []), ...(bloqs ?? [])].map(o => ({
    a: new Date(o.inicio).getTime(),
    b: new Date(o.fim).getTime(),
  }))
  const agora = Date.now()

  return candidatos.filter(h => {
    const a = new Date(`${data}T${h}:00${FUSO}`).getTime()
    const b = a + duracao_min * 60_000
    if (a <= agora) return false
    return !ocupado.some(o => a < o.b && b > o.a)
  })
}

/** Converte um instante ISO em { data, hora } no fuso da Bahia */
export function dataHoraLocal(iso: string): { data: string; hora: string } {
  const d = new Date(iso)
  return {
    data: d.toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' }),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia', hourCycle: 'h23' }),
  }
}
