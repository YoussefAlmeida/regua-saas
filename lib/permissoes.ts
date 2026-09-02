/* ================================================================
   RÉGUA — Função central de checagem de permissão
   Seção 6.1.1 do documento de produto

   ⚠️  Toda ação que modifica dados DEVE passar por aqui.
       Nunca duplicar a lógica tela por tela.
   ================================================================ */

export type Papel = "dono" | "barbeiro" | "cliente"

export interface PermissaoCtx {
  papel: Papel
  usuario_id: string
  barbearia_id: string
  /** Preenchido apenas quando papel === 'barbeiro' */
  profissional_id?: string
}

/* ── Mapa de permissões (seção 6.1.1) ────────────────────── */
const PERMISSOES = {
  // Só dono
  "servicos:write":    (c: PermissaoCtx) => c.papel === "dono",
  "barbearia:write":   (c: PermissaoCtx) => c.papel === "dono",
  "barbeiro:aprovar":  (c: PermissaoCtx) => c.papel === "dono",
  "barbeiro:remover":  (c: PermissaoCtx) => c.papel === "dono",
  "financeiro:read":   (c: PermissaoCtx) => c.papel === "dono",
  "financeiro:write":  (c: PermissaoCtx) => c.papel === "dono",
  "relatorios:read":   (c: PermissaoCtx) => c.papel === "dono",
  "plano:manage":      (c: PermissaoCtx) => c.papel === "dono",

  // Dono e barbeiro
  "horario:write":     (c: PermissaoCtx) => c.papel === "dono" || c.papel === "barbeiro",
  "bloqueio:write":    (c: PermissaoCtx) => c.papel === "dono" || c.papel === "barbeiro",

  // Dono e barbeiro — barbeiro só nos próprios atendimentos (validação de profissional_id no DB)
  "agendamento:status": (c: PermissaoCtx) => c.papel === "dono" || c.papel === "barbeiro",

  // Todos os papéis — regras de quem é o dono do agendamento ficam no DB (RLS)
  "agendamento:criar":   () => true,
  "agendamento:cancelar": () => true,

  // Só barbeiro
  "desempenho:read":   (c: PermissaoCtx) => c.papel === "barbeiro",

  // Só cliente
  "meus-agendamentos:read": (c: PermissaoCtx) => c.papel === "cliente",
} as const

export type Permissao = keyof typeof PERMISSOES

/** Retorna true se o usuário pode executar a ação */
export function podeExecutar(permissao: Permissao, ctx: PermissaoCtx): boolean {
  return PERMISSOES[permissao](ctx)
}

/** Lança erro se o usuário não tiver permissão */
export function exigirPermissao(permissao: Permissao, ctx: PermissaoCtx): void {
  if (!podeExecutar(permissao, ctx)) {
    throw new Error(`Sem permissão: ${permissao}`)
  }
}
