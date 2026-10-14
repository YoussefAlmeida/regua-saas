import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

/* Compara segredo sem vazar tempo e FECHADO por padrão:
   variável não configurada = ninguém entra (antes, sem a variável,
   qualquer um passava — ex.: "Bearer undefined"). */
export function segredoConfere(recebido: string | null | undefined, esperado: string | undefined): boolean {
  if (!esperado || !recebido) return false
  const a = Buffer.from(recebido), b = Buffer.from(esperado)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Chamadas de cron: Authorization: Bearer <CRON_SECRET> */
export function cronAutorizado(req: NextRequest): boolean {
  const h = req.headers.get('authorization') ?? ''
  return segredoConfere(h.startsWith('Bearer ') ? h.slice(7) : null, process.env.CRON_SECRET)
}
