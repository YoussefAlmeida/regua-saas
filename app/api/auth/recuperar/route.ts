import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { criarClienteServico } from '@/lib/supabase/server'
import { normalizarWhatsapp } from '@/lib/utils'
import { ipDa, segundosBloqueado, registrarFalha, textoEspera } from '@/lib/limite-login'
import { gerarTokenNovaSenha, textoLinkNovaSenha } from '@/lib/recuperacao'
import { emailConfigurado, enviarEmail } from '@/lib/email'
import { enviarTexto } from '@/lib/whatsapp'
import { urlDoSiteAtual } from '@/lib/site-url'

/* "Esqueci minha senha"
   A resposta é sempre a mesma, exista a conta ou não (não revela quem
   tem cadastro). Se o envio automático estiver configurado, o link vai
   sozinho; senão, a tela mostra com quem falar. */

const Schema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('email'), email: z.string().email() }),
  z.object({ tipo: z.literal('whatsapp'), whatsapp: z.string().min(8).max(20), slug: z.string().max(80).optional() }),
])

const VALIDADE_H = 1
const whatsappConfigurado = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID)

export async function POST(req: NextRequest) {
  const parse = Schema.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Confere o que você digitou' }, { status: 400 })
  const d = parse.data

  const chave = d.tipo === 'email' ? d.email.trim().toLowerCase() : normalizarWhatsapp(d.whatsapp)
  const ip = ipDa(req)
  const espera = await segundosBloqueado([`id:rec:${chave}`, `ip:${ip}`])
  if (espera > 0) return NextResponse.json({ erro: `Muitos pedidos. Espera ${textoEspera(espera)}.` }, { status: 429 })
  // Conta como "tentativa": evita alguém disparar mensagem sem parar pro mesmo número/e-mail
  await registrarFalha(`rec:${chave}`, ip)

  const db = criarClienteServico()
  const site = await urlDoSiteAtual()
  const automatico = d.tipo === 'email' ? emailConfigurado() : whatsappConfigurado()

  if (automatico) {
    if (d.tipo === 'email') {
      const { data: dono } = await db.from('usuarios').select('id, nome, ativo')
        .eq('email', chave).eq('papel', 'dono').maybeSingle()
      if (dono?.ativo) {
        const token = await gerarTokenNovaSenha(dono.id, VALIDADE_H)
        if (token) {
          await enviarEmail(chave, 'RÉGUA — criar senha nova',
            `${textoLinkNovaSenha(dono.nome, `${site}/nova-senha/${token}`, VALIDADE_H)}\n\nSe não foi você que pediu, pode ignorar este e-mail.`)
        }
      }
    } else {
      const q = db.from('usuarios').select('id, nome, ativo, papel, barbearia:barbearias!barbearia_id(slug)')
        .eq('whatsapp', chave).in('papel', ['barbeiro', 'cliente'])
      const { data: contas } = await q
      const alvo = (contas ?? [])
        .filter(c => c.ativo)
        .find(c => c.papel === 'barbeiro' || !d.slug
          || (Array.isArray(c.barbearia) ? c.barbearia[0] : c.barbearia as { slug?: string } | null)?.slug === d.slug)
      if (alvo) {
        const token = await gerarTokenNovaSenha(alvo.id, VALIDADE_H)
        if (token) await enviarTexto(chave, textoLinkNovaSenha(alvo.nome, `${site}/nova-senha/${token}`, VALIDADE_H))
      }
    }
  }

  // Caminho manual: telefone da barbearia (cliente na página dela) ou suporte RÉGUA
  let contatoBarbearia: { nome: string; telefone: string } | null = null
  if (d.tipo === 'whatsapp' && d.slug) {
    const { data: b } = await db.from('barbearias').select('nome, telefone').eq('slug', d.slug).maybeSingle()
    if (b?.telefone) contatoBarbearia = { nome: b.nome, telefone: b.telefone }
  }

  return NextResponse.json({
    ok: true,
    automatico,
    contatoBarbearia,
    suporte: process.env.SUPORTE_WHATSAPP ?? '75982727760',
  })
}
