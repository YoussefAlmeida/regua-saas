/* Planos e preços (usado no admin, no servidor e na tela) */
export const PLANOS_ADMIN = {
  cadeira:   { nome: 'Cadeira',   preco: 39.99 },
  barbearia: { nome: 'Barbearia', preco: 79.99 },
  rede:      { nome: 'Rede',      preco: 129.99 },
} as const
export type PlanoPago = keyof typeof PLANOS_ADMIN
