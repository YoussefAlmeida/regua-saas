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

   Desempenho: busca tudo do período em 3 consultas paralelas e
   calcula os dias em memória (antes eram até 7 consultas em fila
   a cada dia tocado).
   ================================================================ */

export const PASSO_MIN = 30
const FUSO = '-03:00' // Bahia, sem horário de verão
const DIA_MS = 86_400_000

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

interface HorarioTrabalho {
  dia_semana: number
  inicio: string
  fim: string
  intervalo_inicio: string | null
  intervalo_fim: string | null
}

interface Expediente { inicio: string; fim: string; intervalo_inicio?: string; intervalo_fim?: string }
interface Ocupado { a: number; b: number }

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

export function somarDias(data: string, n: number): string {
  const [y, m, d] = data.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Busca, em paralelo, o que o cálculo precisa pro período [de, ate) */
async function carregarPeriodo(
  db: SupabaseClient,
  profissional_id: string,
  gte: string,
  lt: string,
  ignorarAgendamentoId?: string,
): Promise<{ horarios: HorarioTrabalho[]; ocupados: Ocupado[] }> {
  let qAg = db
    .from('agendamentos')
    .select('id, inicio, fim')
    .eq('profissional_id', profissional_id)
    .lt('inicio', lt)
    .gt('fim', gte)
    .not('status', 'in', '("cancelado","faltou")')
  if (ignorarAgendamentoId) qAg = qAg.neq('id', ignorarAgendamentoId)

  const [{ data: horarios }, { data: ags }, { data: bloqs }] = await Promise.all([
    db.from('horarios_trabalho')
      .select('dia_semana, inicio, fim, intervalo_inicio, intervalo_fim')
      .eq('profissional_id', profissional_id),
    qAg,
    db.from('bloqueios_agenda')
      .select('inicio, fim')
      .eq('profissional_id', profissional_id)
      .lt('inicio', lt)
      .gt('fim', gte),
  ])

  return {
    horarios: (horarios ?? []) as HorarioTrabalho[],
    ocupados: [...(ags ?? []), ...(bloqs ?? [])].map(o => ({
      a: new Date(o.inicio).getTime(),
      b: new Date(o.fim).getTime(),
    })),
  }
}

/** Expediente do barbeiro no dia, já com a hierarquia aplicada; null = fechado */
function expediente(barbearia: BarbeariaHorario, horarios: HorarioTrabalho[], data: string): Expediente | null {
  if ((barbearia.dias_fechados ?? []).includes(data)) return null

  const dia = diaDaSemana(data)
  const hBarbearia = barbearia.horario_funcionamento?.[String(dia)]
  if (hBarbearia && hBarbearia.ativo === false) return null

  if (horarios.length > 0) {
    // Barbeiro configurou a semana: dia que ficou de fora é folga
    const proprio = horarios.find(h => h.dia_semana === dia)
    if (!proprio) return null
    return {
      inicio: proprio.inicio.slice(0, 5),
      fim: proprio.fim.slice(0, 5),
      intervalo_inicio: proprio.intervalo_inicio?.slice(0, 5) ?? undefined,
      intervalo_fim: proprio.intervalo_fim?.slice(0, 5) ?? undefined,
    }
  }

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

function slotsDoDia(exp: Expediente | null, ocupados: Ocupado[], data: string, duracao_min: number, agora: number): string[] {
  if (!exp) return []
  const ini = paraMin(exp.inicio)
  const fim = paraMin(exp.fim)
  const iIni = exp.intervalo_inicio ? paraMin(exp.intervalo_inicio) : null
  const iFim = exp.intervalo_fim ? paraMin(exp.intervalo_fim) : null

  const livres: string[] = []
  for (let t = ini; t + duracao_min <= fim; t += PASSO_MIN) {
    if (iIni !== null && iFim !== null && t < iFim && t + duracao_min > iIni) continue
    const h = paraHora(t)
    const a = new Date(`${data}T${h}:00${FUSO}`).getTime()
    const b = a + duracao_min * 60_000
    if (a <= agora) continue
    if (ocupados.some(o => a < o.b && b > o.a)) continue
    livres.push(h)
  }
  return livres
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
  const { gte, lt } = limitesDoDia(data)
  const { horarios, ocupados } = await carregarPeriodo(db, profissional_id, gte, lt, ignorarAgendamentoId)
  return slotsDoDia(expediente(barbearia, horarios, data), ocupados, data, duracao_min, Date.now())
}

/** Vários dias de uma vez (página pública): { 'YYYY-MM-DD': ['09:00', …] } */
export async function horariosLivresPeriodo(
  db: SupabaseClient,
  barbearia: BarbeariaHorario,
  profissional_id: string,
  de: string,
  dias: number,
  duracao_min: number,
): Promise<Record<string, string[]>> {
  const gte = limitesDoDia(de).gte
  const lt = new Date(new Date(gte).getTime() + dias * DIA_MS).toISOString()
  const { horarios, ocupados } = await carregarPeriodo(db, profissional_id, gte, lt)
  const agora = Date.now()

  const resultado: Record<string, string[]> = {}
  for (let i = 0; i < dias; i++) {
    const data = somarDias(de, i)
    resultado[data] = slotsDoDia(expediente(barbearia, horarios, data), ocupados, data, duracao_min, agora)
  }
  return resultado
}

/** Converte um instante ISO em { data, hora } no fuso da Bahia */
export function dataHoraLocal(iso: string): { data: string; hora: string } {
  const d = new Date(iso)
  return {
    data: d.toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' }),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia', hourCycle: 'h23' }),
  }
}
