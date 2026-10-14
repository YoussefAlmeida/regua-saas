import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { jwtVerify } from 'jose'
import { criarClienteServico } from '@/lib/supabase/server'
import { hashSenha, COOKIE_SESSION } from '@/lib/auth'
import { problemaNaSenha } from '@/lib/senha'
import { normalizarWhatsapp } from '@/lib/utils'
import { falhaInterna } from '@/lib/erros'

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

  const problema = problemaNaSenha(senha, [whatsapp])
  if (problema) return NextResponse.json({ erro: problema }, { status: 400 })

  // Valida token de convite
  let barbearia_id: string
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.tipo !== 'convite') throw new Error()
    barbearia_id = payload.barbearia_id as string
  } catch {
    return NextResponse.json({ erro: 'Link inválido ou expirado' }, { status: 400 })
  }

  const waNorm = normalizarWhatsapp(whatsapp)
  const db = criarClienteServico()

  // Barbeiro: um WhatsApp = uma barbearia (limite do MVP).
  // Ser cliente em outra barbearia não atrapalha.
  const { data: contas } = await db
    .from('usuarios')
    .select('id, papel, barbearia_id')
    .eq('whatsapp', waNorm)
  if (contas?.some(c => c.papel === 'barbeiro')) {
    return NextResponse.json({ erro: 'Esse WhatsApp já é de um barbeiro cadastrado no RÉGUA' }, { status: 409 })
  }
  if (contas?.some(c => c.barbearia_id === barbearia_id)) {
    return NextResponse.json({ erro: 'Esse WhatsApp já está cadastrado como cliente nessa barbearia. Use outro número.' }, { status: 409 })
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
    return falhaInterna('convite/aceitar', error, 'Erro ao criar conta', { barbearia_id, usuario_id: null })
  }

  // Não cria sessão — barbeiro precisa esperar aprovação
  const res = NextResponse.json({ ok: true, mensagem: 'Cadastro realizado. Aguarde a aprovação do dono.' })
  res.cookies.delete(COOKIE_SESSION)
  return res
}
