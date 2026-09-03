import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { jwtVerify } from 'jose'
import { criarClienteServico } from '@/lib/supabase/server'
import { hashSenha, COOKIE_SESSION } from '@/lib/auth'

const getSecret = () => new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!)

const Schema = z.object({
  token: z.string(),
  nome: z.string().min(2).max(80),
  whatsapp: z.string().min(10).max(20),
  senha: z.string().min(8).max(128),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parse = Schema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
  }

  const { token, nome, whatsapp, senha } = parse.data

  // Valida token de convite
  let barbearia_id: string
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.tipo !== 'convite') throw new Error()
    barbearia_id = payload.barbearia_id as string
  } catch {
    return NextResponse.json({ erro: 'Link inválido ou expirado' }, { status: 400 })
  }

  const waNorm = whatsapp.replace(/\D/g, '')
  const db = criarClienteServico()

  // Verifica WhatsApp duplicado
  const { data: waExiste } = await db
    .from('usuarios')
    .select('id')
    .eq('whatsapp', waNorm)
    .maybeSingle()
  if (waExiste) {
    return NextResponse.json({ erro: 'WhatsApp já cadastrado' }, { status: 409 })
  }

  const senhaHash = await hashSenha(senha)
  const { error } = await db.from('usuarios').insert({
    barbearia_id,
    nome,
    whatsapp: waNorm,
    senha_hash: senhaHash,
    papel: 'barbeiro',
    status: 'pendente', // aguarda aprovação do dono
  })

  if (error) {
    return NextResponse.json({ erro: 'Erro ao criar conta' }, { status: 500 })
  }

  // Não cria sessão — barbeiro precisa esperar aprovação
  const res = NextResponse.json({ ok: true, mensagem: 'Cadastro realizado. Aguarde a aprovação do dono.' })
  res.cookies.delete(COOKIE_SESSION)
  return res
}
