/* Traduz um registro de auditoria em frase (Histórico do dono e pasta do admin) */

type Json = Record<string, unknown> | null
export interface LinhaAuditoria {
  id: string
  acao: string
  tabela: string
  valor_antes: Json
  valor_depois: Json
  criado_em: string
  usuario: { nome: string; papel: string } | { nome: string; papel: string }[] | null
}

const brl = (v: unknown) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const STATUS: Record<string, string> = {
  agendado: 'reabriu', confirmado: 'confirmou', concluido: 'concluiu', faltou: 'marcou falta em', cancelado: 'cancelou',
}

export function descreverAuditoria(l: LinhaAuditoria): { texto: string; alerta: boolean } {
  const a = l.valor_antes ?? {}, d = l.valor_depois ?? {}
  switch (`${l.tabela}:${l.acao.split(':')[0]}`) {
    case 'movimentacoes:criar':
      return { texto: `lançou ${d.tipo === 'entrada' ? 'entrada' : 'saída'} de ${brl(d.valor)} — ${d.descricao}`, alerta: false }
    case 'movimentacoes:editar': {
      const partes = []
      if (d.valor !== undefined && d.valor !== a.valor) partes.push(`valor de ${brl(a.valor)} para ${brl(d.valor)}`)
      if (d.descricao !== undefined && d.descricao !== a.descricao) partes.push(`descrição para "${d.descricao}"`)
      if (d.data !== undefined && d.data !== a.data) partes.push(`data para ${String(d.data).split('-').reverse().join('/')}`)
      return { texto: `editou lançamento "${a.descricao}": ${partes.join(', ') || 'sem mudança'}`, alerta: true }
    }
    case 'movimentacoes:apagar':
      return { texto: `apagou ${a.tipo === 'entrada' ? 'entrada' : 'saída'} de ${brl(a.valor)} — ${a.descricao}`, alerta: true }
    case 'movimentacoes:exportar':
      return { texto: `exportou o extrato de ${d.mes}`, alerta: false }
    case 'agendamentos:status': {
      const novo = String(d.status)
      const extra = d.entrada === 'removida' ? ' (entrada saiu do caixa)' : d.entrada === 'lancada' ? ' (entrada lançada)' : ''
      return { texto: `${STATUS[novo] ?? 'mudou'} um atendimento${a.status === 'concluido' ? ' que estava concluído' : ''}${extra}`, alerta: a.status === 'concluido' }
    }
    case 'agendamentos:criar':
      return { texto: `marcou um horário${d.origem === 'link' ? ' pelo link' : ''}`, alerta: false }
    case 'bloqueios_agenda:criar': return { texto: 'bloqueou um horário na agenda', alerta: false }
    case 'bloqueios_agenda:apagar': return { texto: 'liberou um horário bloqueado', alerta: false }
    case 'horarios_trabalho:editar': return { texto: 'mudou o horário de trabalho', alerta: false }
    case 'despesas_fixas:apagar': return { texto: `apagou a despesa fixa "${a.descricao}"`, alerta: true }
    case 'profissionais:ativar_agenda': return { texto: `colocou ${d.quem ?? 'alguém'} na agenda`, alerta: false }
    case 'profissionais:desativar_agenda': return { texto: `tirou ${d.quem ?? 'alguém'} da agenda${d.agendamentos_cancelados ? ` (${d.agendamentos_cancelados} horários cancelados)` : d.horarios_mantidos ? ` (${d.horarios_mantidos} horários marcados continuam)` : ''}`, alerta: !!d.agendamentos_cancelados }
    case 'barbearias:agendar_plano': return { texto: `pediu mudança pro plano ${d.para ?? ''}${d.em ? ` a partir de ${new Date(String(d.em)).toLocaleDateString('pt-BR')}` : ' (vale quando pagar)'}`, alerta: false }
    case 'barbearias:cancelar_mudanca_plano': return { texto: 'cancelou o pedido de mudança de plano', alerta: false }
    case 'barbearias:aplicar_mudanca_plano': return { texto: `plano mudou pra ${d.para ?? ''}${Array.isArray(d.saiu) && d.saiu.length ? ` (${d.saiu.join(', ')} saiu da agenda)` : ''}`, alerta: false }
    case 'usuarios:aprovar': return { texto: 'aprovou um barbeiro na equipe', alerta: false }
    case 'usuarios:link_nova_senha': return { texto: `gerou link de senha nova pra ${d.para ?? 'alguém'}`, alerta: false }
    case 'usuarios:nova_senha': return { texto: 'criou uma senha nova pelo link', alerta: false }
    case 'usuarios:remover': return { texto: `removeu um barbeiro (${d.agendamentos_cancelados ?? 0} horários cancelados)`, alerta: true }
    default: return { texto: `${l.acao} em ${l.tabela}`, alerta: false }
  }
}

