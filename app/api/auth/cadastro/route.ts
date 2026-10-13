import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { criarClienteServico } from '@/lib/supabase/server'
import { hashSenha, criarToken, slugify, COOKIE_SESSION, SLUGS_RESERVADOS } from '@/lib/auth'
import { problemaNaSenha } from '@/lib/senha'

const Schema = z.object({
  barbearia_nome: z.string().min(2).max(80),
  barbearia_instagram: z.string().max(50).optional(),
  barbearia_telefone: z.string().max(20).optional(),
  barbearia_endereco: z.string().max(200).optional(),
  dono_nome: z.string().min(2).max(80),
  dono_email: z.string().email(),
  dono_senha: z.string().min(8).max(128),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parse = Schema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parse.error.flatten() }, { status: 400 })
  }

  const d = parse.data
  d.dono_email = d.dono_email.trim().toLowerCase()

  const problema = problemaNaSenha(d.dono_senha, [d.dono_email.split('@')[0], d.barbearia_telefone ?? ''])
  if (problema) return NextResponse.json({ erro: problema }, { status: 400 })
  const db = criarClienteServico()

  // Verifica email duplicado
  const { data: emailExiste } = await db
    .from('usuarios')
    .select('id')
    .eq('email', d.dono_email)
    .maybeSingle()
  if (emailExiste) {
    return NextResponse.json({ erro: 'E-mail já cadastrado' }, { status: 409 })
  }

  // Gera slug único
  let slug = slugify(d.barbearia_nome).replace(/^-+|-+$/g, '').slice(0, 50) || 'barbearia'
  if (SLUGS_RESERVADOS.has(slug)) slug = `barbearia-${slug}`
  const { count } = await db.from('barbearias').select('id', { count: 'exact', head: true }).eq('slug', slug)
  if (count && count > 0) slug = `${slug}-${Date.now().toString(36)}`

  // Cria barbearia
  const { data: barbearia, error: errBarbearia } = await db
    .from('barbearias')
    .insert({
      nome: d.barbearia_nome,
      slug,
      instagram: d.barbearia_instagram || null,
      telefone: d.barbearia_telefone || null,
      endereco: d.barbearia_endereco || null,
    })
    .select('id')
    .single()

  if (errBarbearia || !barbearia) {
    return NextResponse.json({ erro: 'Erro ao criar barbearia' }, { status: 500 })
  }

  // Cria usuário dono
  const senhaHash = await hashSenha(d.dono_senha)
  const { data: usuario, error: errUsuario } = await db
    .from('usuarios')
    .insert({
      barbearia_id: barbearia.id,
      nome: d.dono_nome,
      email: d.dono_email,
      senha_hash: senhaHash,
      papel: 'dono',
      status: 'aprovado',
    })
    .select('id')
    .single()

  if (errUsuario || !usuario) {
    // Rollback barbearia
    await db.from('barbearias').delete().eq('id', barbearia.id)
    return NextResponse.json({ erro: 'Erro ao criar usuário' }, { status: 500 })
  }

  const token = await criarToken({
    usuario_id: usuario.id,
    papel: 'dono',
    barbearia_id: barbearia.id,
  })

  const res = NextResponse.json({ ok: true }, { status: 201 })
  res.cookies.set(COOKIE_SESSION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
