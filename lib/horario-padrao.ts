/* Horário de funcionamento que toda barbearia nova já ganha
   (o dono ajusta em Mais → Configurações). Chaves: 0 = domingo … 6 = sábado. */
export interface HorarioPadraoDia { ativo: boolean; inicio?: string; fim?: string; intervalo_inicio?: string; intervalo_fim?: string }

export const HORARIO_PADRAO: Record<string, HorarioPadraoDia> = {
  '0': { ativo: false },
  '1': { ativo: true, inicio: '08:00', fim: '19:00' },
  '2': { ativo: true, inicio: '08:00', fim: '19:00' },
  '3': { ativo: true, inicio: '08:00', fim: '19:00' },
  '4': { ativo: true, inicio: '08:00', fim: '19:00' },
  '5': { ativo: true, inicio: '08:00', fim: '19:00' },
  '6': { ativo: true, inicio: '08:00', fim: '17:00' },
}
