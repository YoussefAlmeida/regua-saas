import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServico } from '@/lib/supabase/server'
import { adminLogado, registrarAcaoAdmin } from '@/lib/admin'
import { gerarTokenNovaSenha, textoLinkNovaSenha } from '@/lib/recuperacao'
import { urlDoSiteAtual } from '@/lib/site-url'

/* Admin gera link de nova senha pro DONO de uma barbearia (vale 24h) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminLogado())) return NextResponse.json({ erro: 'Entre de novo no admin' }, { status: 401 })
  const { id } = await params

  const db = criarClienteServico()
  const [{ data: b }, { data: dono }] = await Promise.all([
    db.from('barbearias').select('id, nome, telefone').eq('id', id).maybeSingle(),
    db.from('usuarios').select('id, nome, email').eq('barbearia_id', id).eq('papel', 'dono').maybeSingle(),
  ])
  if (!b || !dono) return NextResponse.json({ erro: 'Dono não encontrado' }, { status: 404 })

  const token = await gerarTokenNovaSenha(dono.id, 24)
  if (!token) return NextResponse.json({ erro: 'Não deu pra gerar o link' }, { status: 500 })
  const link = `${await urlDoSiteAtual()}/nova-senha/${token}`

  await registrarAcaoAdmin(req, 'link_nova_senha', b, { dono: dono.email })
  return NextResponse.json({ link, telefone: b.telefone, email: dono.email, texto: textoLinkNovaSenha(dono.nome, link, 24) })
}
