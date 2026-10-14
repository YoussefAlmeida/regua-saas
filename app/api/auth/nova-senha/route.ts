import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { criarClienteServico } from '@/lib/supabase/server'
import { hashSenha, criarToken, gravarCookieSessao } from '@/lib/auth'
import { problemaNaSenha, SENHA_MIN, SENHA_MIN_CLIENTE } from '@/lib/senha'
import { validarTokenNovaSenha } from '@/lib/recuperacao'
import { registrarAuditoria } from '@/lib/auditoria'
import { falhaInterna } from '@/lib/erros'

const Schema = z.object({ token: z.string().min(10), senha: z.string().min(1).max(128) })

export async function POST(req: NextRequest) {
  const parse = Schema.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })

  const v = await validarTokenNovaSenha(parse.data.token)
  if ('erro' in v) return NextResponse.json({ erro: v.erro }, { status: 400 })
  const u = v.usuario

  const db = criarClienteServico()
  const { data: contato } = await db.from('usuarios').select('email, whatsapp').eq('id', u.id).single()
  const min = u.papel === 'cliente' ? SENHA_MIN_CLIENTE : SENHA_MIN
  const problema = problemaNaSenha(parse.data.senha, [contato?.whatsapp ?? '', contato?.email?.split('@')[0] ?? ''], min)
  if (problema) return NextResponse.json({ erro: problema }, { status: 400 })

  const { error } = await db.from('usuarios')
    .update({ senha_hash: await hashSenha(parse.data.senha), senha_definida: true, atualizado_em: new Date().toISOString() })
    .eq('id', u.id)
  if (error) {
    return falhaInterna('nova-senha', error, 'Não deu pra salvar a senha. Tenta de novo.', { barbearia_id: u.barbearia_id, usuario_id: u.id })
  }

  // Libera quem estava travado por errar a senha
  const chave = contato?.email ?? contato?.whatsapp
  if (chave) await db.from('tentativas_login').delete().eq('chave', `id:${chave}`)

  await registrarAuditoria({
    barbearia_id: u.barbearia_id,
    usuario_id: u.id,
    acao: 'nova_senha',
    tabela: 'usuarios',
    registro_id: u.id,
    req,
  })

  // Barbeiro esperando aprovação ainda não entra
  if (u.status !== 'aprovado') {
    return NextResponse.json({ ok: true, destino: '/entrar', aviso: 'Senha salva. Sua conta ainda espera o dono aprovar.' })
  }

  let profissional_id: string | undefined
  if (u.papel === 'barbeiro') {
    const { data: p } = await db.from('profissionais').select('id').eq('usuario_id', u.id).eq('ativo', true).maybeSingle()
    profissional_id = p?.id
  }
  const token = await criarToken({ usuario_id: u.id, papel: u.papel, barbearia_id: u.barbearia_id, profissional_id })
  const destino = u.papel === 'cliente' ? (u.slug ? `/${u.slug}/meus-agendamentos` : '/') : '/painel/hoje'

  const res = NextResponse.json({ ok: true, destino })
  gravarCookieSessao(res, token)
  return res
}
