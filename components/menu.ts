import { LayoutDashboard, CalendarDays, Users2, Users, Scissors, Clock, Wallet, Settings, CreditCard, Home, UserRound, type LucideIcon } from 'lucide-react'

/* O menu de cada público, num lugar só: a lateral do computador, a barra
   de baixo do celular e a tela "Mais" leem daqui e mostram a mesma coisa. */

export interface ItemMenu { href: string; label: string; desc: string; icon: LucideIcon }

export const MENU_DONO: { grupo: string; itens: ItemMenu[] }[] = [
  { grupo: 'Dia a dia', itens: [
    { href: '/painel/inicio', label: 'Início', desc: 'O dia de hoje e os últimos 30 dias', icon: LayoutDashboard },
    { href: '/painel/agenda', label: 'Agenda', desc: 'Ver, marcar, remarcar e concluir horários', icon: CalendarDays },
    { href: '/painel/mais/clientes', label: 'Clientes', desc: 'Quem já marcou e quando veio', icon: Users2 },
  ] },
  { grupo: 'Barbearia', itens: [
    { href: '/painel/mais/barbeiros', label: 'Equipe', desc: 'Barbeiros, aprovações e permissões', icon: Users },
    { href: '/painel/mais/servicos', label: 'Serviços', desc: 'Preço, duração e foto', icon: Scissors },
    { href: '/painel/mais/horarios', label: 'Horários', desc: 'Funcionamento, almoço, feriados e bloqueios', icon: Clock },
  ] },
  { grupo: 'Gestão', itens: [
    { href: '/painel/financeiro', label: 'Financeiro', desc: 'Caixa, despesas e relatório do mês', icon: Wallet },
    { href: '/painel/mais/configuracoes', label: 'Configurações', desc: 'Dados e aparência da barbearia', icon: Settings },
    { href: '/painel/mais/plano', label: 'Plano', desc: 'Sua assinatura do RÉGUA', icon: CreditCard },
  ] },
]

/** Barra de baixo do dono no celular: o que se usa toda hora; o resto fica em "Mais" */
export const ATALHOS_DONO = ['/painel/inicio', '/painel/agenda', '/painel/financeiro']

export const MENU_BARBEIRO: ItemMenu[] = [
  { href: '/barbeiro/hoje', label: 'Hoje', desc: 'Seus atendimentos de hoje', icon: Home },
  { href: '/barbeiro/agenda', label: 'Agenda', desc: 'Sua agenda dos próximos dias', icon: CalendarDays },
  { href: '/barbeiro/perfil', label: 'Perfil', desc: 'Foto, horário e desempenho', icon: UserRound },
]
