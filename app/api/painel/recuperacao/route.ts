import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { gerarTokenNovaSenha, textoLinkNovaSenha } from '@/lib/recuperacao'
import { registrarAuditoria } from '@/lib/auditoria'
import { urlDoSiteAtual } from '@/lib/site-url'
import { falhaInterna } from '@/lib/erros'

/* Dono gera um link de nova senha pra cliente ou barbeiro da barbearia
   e manda pelo WhatsApp (wa.me — sem custo). Vale 24h e uma vez só. */

const VALIDADE_H = 24

export async function POST(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

  const parse = z.object({ usuario_id: z.string().uuid() }).safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })

  const { data: u } = await criarClienteServico()
    .from('usuarios')
    .select('id, nome, whatsapp, papel, ativo')
    .eq('id', parse.data.usuario_id)
    .eq('barbearia_id', sessao.barbearia_id)
    .in('papel', ['barbeiro', 'cliente'])
    .maybeSingle()
  if (!u) return NextResponse.json({ erro: 'Pessoa não encontrada' }, { status: 404 })
  if (!u.ativo) return NextResponse.json({ erro: 'Essa conta está desativada' }, { status: 400 })

  const token = await gerarTokenNovaSenha(u.id, VALIDADE_H)
  if (!token) return falhaInterna('painel/recuperacao', 'sem resultado', 'Não deu pra gerar o link')
  const link = `${await urlDoSiteAtual()}/nova-senha/${token}`

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id,
    usuario_id: sessao.usuario_id,
    acao: 'link_nova_senha',
    tabela: 'usuarios',
    registro_id: u.id,
    depois: { para: u.nome, papel: u.papel },
    req,
  })

  return NextResponse.json({ link, whatsapp: u.whatsapp, texto: textoLinkNovaSenha(u.nome, link, VALIDADE_H) })
}
