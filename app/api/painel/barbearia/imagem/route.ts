import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { FOTO_MAX_BYTES, tipoRealDaImagem, EXTENSAO } from '@/lib/upload-imagem'
import { registrarAuditoria } from '@/lib/auditoria'
import { falhaInterna } from '@/lib/erros'

/* Logo e capa da barbearia (só o dono). O arquivo sempre vai pra pasta
   da própria barbearia — o caminho vem da sessão, nunca do navegador —
   e o tipo é conferido pelos bytes, não pela extensão.
   POST (form: tipo=logo|capa, arquivo) envia · DELETE ?tipo= remove */

const COLUNA = { logo: 'logo_url', capa: 'capa_url' } as const
type Tipo = keyof typeof COLUNA
const ehTipo = (t: unknown): t is Tipo => t === 'logo' || t === 'capa'
const caminhoDe = (url: string | null | undefined) => url?.split('/object/public/fotos/')[1] ?? null

export async function POST(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

  const form = await req.formData().catch(() => null)
  const tipo = form?.get('tipo'), arquivo = form?.get('arquivo')
  if (!ehTipo(tipo)) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: 'Escolha uma imagem' }, { status: 400 })
  if (arquivo.size > FOTO_MAX_BYTES) return NextResponse.json({ erro: 'Imagem grande demais (máximo 2 MB)' }, { status: 400 })

  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  const mime = tipoRealDaImagem(bytes)
  if (!mime) return NextResponse.json({ erro: 'Use uma imagem JPG, PNG ou WEBP' }, { status: 400 })

  const db = criarClienteServico()
  const coluna = COLUNA[tipo]
  const { data: atual, error: errAtual } = await db.from('barbearias').select(coluna).eq('id', sessao.barbearia_id).maybeSingle<Record<string, string | null>>()
  if (errAtual?.code === '42703') {
    return NextResponse.json({ erro: 'A aparência ainda não foi liberada nesta conta. Fala com o suporte do RÉGUA.' }, { status: 409 })
  }

  // Nome novo a cada envio: o navegador não fica mostrando a imagem antiga
  const caminho = `${sessao.barbearia_id}/marca/${tipo}-${Date.now()}.${EXTENSAO[mime]}`
  const { error: errUp } = await db.storage.from('fotos').upload(caminho, bytes, { contentType: mime, upsert: false })
  if (errUp) return falhaInterna('painel/barbearia/imagem', errUp, 'Não deu pra enviar a imagem')

  const url = db.storage.from('fotos').getPublicUrl(caminho).data.publicUrl
  const { error } = await db.from('barbearias').update({ [coluna]: url, atualizado_em: new Date().toISOString() }).eq('id', sessao.barbearia_id)
  if (error) {
    await db.storage.from('fotos').remove([caminho])
    return falhaInterna('painel/barbearia/imagem', error, 'Não deu pra salvar a imagem')
  }
  // Apaga a anterior — só se for da pasta desta barbearia
  const anterior = caminhoDe(atual?.[coluna])
  if (anterior?.startsWith(`${sessao.barbearia_id}/`)) await db.storage.from('fotos').remove([anterior])

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id, usuario_id: sessao.usuario_id,
    acao: 'aparencia', tabela: 'barbearias', registro_id: sessao.barbearia_id, depois: { [tipo]: 'trocou' }, req,
  })
  return NextResponse.json({ url })
}

export async function DELETE(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  const tipo = req.nextUrl.searchParams.get('tipo')
  if (!ehTipo(tipo)) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })

  const db = criarClienteServico()
  const coluna = COLUNA[tipo]
  const { data: atual } = await db.from('barbearias').select(coluna).eq('id', sessao.barbearia_id).maybeSingle<Record<string, string | null>>()
  const { error } = await db.from('barbearias').update({ [coluna]: null }).eq('id', sessao.barbearia_id)
  if (error) return falhaInterna('painel/barbearia/imagem', error, 'Não deu pra remover a imagem')
  const anterior = caminhoDe(atual?.[coluna])
  if (anterior?.startsWith(`${sessao.barbearia_id}/`)) await db.storage.from('fotos').remove([anterior])

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id, usuario_id: sessao.usuario_id,
    acao: 'aparencia', tabela: 'barbearias', registro_id: sessao.barbearia_id, depois: { [tipo]: 'removeu' }, req,
  })
  return NextResponse.json({ ok: true })
}
