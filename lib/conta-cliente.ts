import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { criarClienteServico } from '@/lib/supabase/server'
import { getSessao, hashSenha, verificarSenha, criarToken } from '@/lib/auth'
import { problemaNaSenha, SENHA_MIN_CLIENTE } from '@/lib/senha'
import { normalizarWhatsapp } from '@/lib/utils'
import { ipDa, segundosBloqueado, registrarFalha, limparFalhas, textoEspera } from '@/lib/limite-login'

/* ================================================================
   Quem é o cliente que está agendando pelo link — Módulo 1
   - 'sessao' : já entrou antes (cookie)
   - 'novo'   : primeira vez — nome, WhatsApp e senha (mín. 4)
   - 'entrar' : já tem conta — WhatsApp e senha
   ================================================================ */

export const SchemaAcesso = z.discriminatedUnion('acesso', [
  z.object({ acesso: z.literal('sessao') }),
  z.object({
    acesso: z.literal('novo'),
    nome: z.string().trim().min(2).max(100),
    whatsapp: z.string().min(8).max(20),
    senha: z.string().min(1).max(128),
  }),
  z.object({
    acesso: z.literal('entrar'),
    whatsapp: z.string().min(8).max(20),
    senha: z.string().min(1).max(128),
  }),
])
export type Acesso = z.infer<typeof SchemaAcesso>

export interface ClienteResolvido {
  id: string
  nome: string
  whatsapp: string
  /** Token novo quando o cliente acabou de entrar/criar conta — gravar no cookie */
  token?: string
}

type Resultado = { ok: true; cliente: ClienteResolvido } | { ok: false; res: NextResponse }

const falha = (erro: string, status: number, extra: Record<string, unknown> = {}): Resultado =>
  ({ ok: false, res: NextResponse.json({ erro, ...extra }, { status }) })

export async function resolverCliente(acesso: Acesso, barbearia_id: string, req: NextRequest): Promise<Resultado> {
  const db = criarClienteServico()

  if (acesso.acesso === 'sessao') {
    const s = await getSessao()
    if (!s || s.papel !== 'cliente' || s.barbearia_id !== barbearia_id) {
      return falha('Sua sessão expirou. Entre de novo.', 401, { sessaoExpirada: true })
    }
    const { data } = await db.from('usuarios').select('id, nome, whatsapp, ativo').eq('id', s.usuario_id).maybeSingle()
    if (!data?.ativo) return falha('Sua sessão expirou. Entre de novo.', 401, { sessaoExpirada: true })
    return { ok: true, cliente: { id: data.id, nome: data.nome, whatsapp: data.whatsapp } }
  }

  const whatsapp = normalizarWhatsapp(acesso.whatsapp)
  if (whatsapp.length < 10 || whatsapp.length > 11) return falha('WhatsApp inválido. Use DDD + número.', 400)

  const ip = ipDa(req)
  const espera = await segundosBloqueado([`id:${whatsapp}`, `ip:${ip}`])
  if (espera > 0) return falha(`Muitas tentativas. Espera ${textoEspera(espera)} e tenta de novo.`, 429)

  const { data: existente } = await db
    .from('usuarios')
    .select('id, nome, whatsapp, senha_hash, papel, barbearia_id, ativo, senha_definida')
    .eq('whatsapp', whatsapp)
    .maybeSingle()

  const tokenDe = (id: string) => criarToken({ usuario_id: id, papel: 'cliente', barbearia_id })

  if (acesso.acesso === 'novo') {
    const problema = problemaNaSenha(acesso.senha, [whatsapp], SENHA_MIN_CLIENTE)
    if (problema) return falha(problema, 400)

    if (existente) {
      if (existente.barbearia_id !== barbearia_id || existente.papel !== 'cliente') {
        return falha('Esse WhatsApp já está cadastrado em outra barbearia do RÉGUA. Fala com a barbearia.', 409)
      }
      if (existente.senha_definida) {
        return falha('Você já tem conta aqui. Toca em "Já tenho conta" e entra com sua senha.', 409, { jaTemConta: true })
      }
      // Cliente que a barbearia cadastrou: no primeiro acesso ele escolhe a senha
      const { error } = await db
        .from('usuarios')
        .update({ senha_hash: await hashSenha(acesso.senha), senha_definida: true, nome: acesso.nome, atualizado_em: new Date().toISOString() })
        .eq('id', existente.id)
      if (error) return falha('Erro ao criar sua conta', 500)
      return { ok: true, cliente: { id: existente.id, nome: acesso.nome, whatsapp, token: await tokenDe(existente.id) } }
    }

    const { data: novo, error } = await db
      .from('usuarios')
      .insert({
        barbearia_id,
        nome: acesso.nome,
        whatsapp,
        senha_hash: await hashSenha(acesso.senha),
        papel: 'cliente',
        status: 'aprovado',
        senha_definida: true,
      })
      .select('id')
      .single()
    if (error || !novo) return falha('Erro ao criar sua conta', 500)
    return { ok: true, cliente: { id: novo.id, nome: acesso.nome, whatsapp, token: await tokenDe(novo.id) } }
  }

  // acesso === 'entrar'
  const conta = existente && existente.papel === 'cliente' && existente.barbearia_id === barbearia_id && existente.senha_definida
    ? existente : null
  const senhaOk = conta ? await verificarSenha(acesso.senha, conta.senha_hash).catch(() => false) : false
  if (!conta || !senhaOk) {
    await registrarFalha(whatsapp, ip)
    return falha('WhatsApp ou senha incorretos. Primeira vez agendando pelo link? Toca em "Primeira vez".', 401)
  }
  await limparFalhas(whatsapp)
  if (!conta.ativo) return falha('Essa conta está desativada. Fala com a barbearia.', 403)

  return { ok: true, cliente: { id: conta.id, nome: conta.nome, whatsapp, token: await tokenDe(conta.id) } }
}
