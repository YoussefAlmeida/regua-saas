import type { NextRequest } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'

/* ================================================================
   Bloqueio progressivo de login — seção 10.1
   Conta falhas por identificador (protege a conta) e por IP
   (protege contra quem testa várias contas do mesmo lugar).
   ================================================================ */

const IP_LIMITE = 20                     // falhas por IP antes de travar
const IP_TRAVA_MS = 15 * 60 * 1000

function travaPorFalhas(falhas: number): number {
  if (falhas >= 8) return 60 * 60 * 1000
  if (falhas >= 5) return 5 * 60 * 1000
  if (falhas >= 3) return 30 * 1000
  return 0
}

export function ipDa(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconhecido'
}

/** Se alguma das chaves está travada, devolve quantos segundos faltam */
export async function segundosBloqueado(chaves: string[]): Promise<number> {
  const { data } = await criarClienteServico()
    .from('tentativas_login')
    .select('bloqueado_ate')
    .in('chave', chaves)
  const agora = Date.now()
  let max = 0
  for (const l of data ?? []) {
    if (!l.bloqueado_ate) continue
    max = Math.max(max, new Date(l.bloqueado_ate).getTime() - agora)
  }
  return max > 0 ? Math.ceil(max / 1000) : 0
}

export async function registrarFalha(identificador: string, ip: string): Promise<void> {
  const db = criarClienteServico()
  const chaves = [`id:${identificador}`, `ip:${ip}`]
  const { data } = await db.from('tentativas_login').select('chave, falhas, atualizado_em').in('chave', chaves)
  const agora = Date.now()
  // Contador "esfria": IP zera depois de 15min sem erro, conta depois de 24h
  const atual = new Map((data ?? []).map(l => {
    const janela = l.chave.startsWith('ip:') ? IP_TRAVA_MS : 24 * 60 * 60 * 1000
    const frio = agora - new Date(l.atualizado_em).getTime() > janela
    return [l.chave, frio ? 0 : (l.falhas as number)]
  }))

  const linhas = chaves.map(chave => {
    const falhas = (atual.get(chave) ?? 0) + 1
    const ms = chave.startsWith('ip:')
      ? (falhas >= IP_LIMITE ? IP_TRAVA_MS : 0)
      : travaPorFalhas(falhas)
    return {
      chave,
      falhas,
      bloqueado_ate: ms ? new Date(agora + ms).toISOString() : null,
      atualizado_em: new Date(agora).toISOString(),
    }
  })
  await db.from('tentativas_login').upsert(linhas)
}

export async function limparFalhas(identificador: string): Promise<void> {
  await criarClienteServico().from('tentativas_login').delete().eq('chave', `id:${identificador}`)
}

export function textoEspera(segundos: number): string {
  if (segundos < 60) return `${segundos} segundos`
  const min = Math.ceil(segundos / 60)
  return min === 1 ? '1 minuto' : `${min} minutos`
}

/**
 * Limite de uso por janela (ex.: contas novas por IP). Usa a mesma tabela:
 * falhas = quantas vezes na janela; bloqueado_ate = quando a janela acaba.
 * Devolve false quando passou do limite.
 */
export async function permitirUso(chave: string, limite: number, janelaMs: number): Promise<boolean> {
  const db = criarClienteServico()
  const agora = Date.now()
  const { data } = await db.from('tentativas_login').select('falhas, bloqueado_ate').eq('chave', chave).maybeSingle()
  const dentro = data?.bloqueado_ate && new Date(data.bloqueado_ate).getTime() > agora
  if (dentro && data!.falhas >= limite) return false
  await db.from('tentativas_login').upsert({
    chave,
    falhas: dentro ? data!.falhas + 1 : 1,
    bloqueado_ate: dentro ? data!.bloqueado_ate : new Date(agora + janelaMs).toISOString(),
    atualizado_em: new Date(agora).toISOString(),
  })
  return true
}
