import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { FOTO_MAX_BYTES, tipoRealDaImagem, EXTENSAO } from '@/lib/upload-imagem'
import { falhaInterna } from '@/lib/erros'
import { semColuna, AVISO_ATUALIZACAO } from '@/lib/extras'

/* Foto do serviço (só o dono). Vai pra pasta da própria barbearia e o
   tipo é conferido pelos bytes. POST envia · DELETE remove */

const caminhoDe = (url: string | null | undefined) => url?.split('/object/public/fotos/')[1] ?? null

async function carregar(id: string) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return { erro: NextResponse.json({ erro: 'Sem permissão' }, { status: 403 }) }
  const db = criarClienteServico()
  const { data: srv } = await db.from('servicos').select('id').eq('id', id).eq('barbearia_id', sessao.barbearia_id).maybeSingle()
  if (!srv) return { erro: NextResponse.json({ erro: 'Serviço não encontrado' }, { status: 404 }) }
  const { data: atual, error } = await db.from('servicos').select('foto_url').eq('id', id).maybeSingle<{ foto_url: string | null }>()
  if (semColuna(error)) return { erro: NextResponse.json({ erro: AVISO_ATUALIZACAO }, { status: 409 }) }
  return { sessao, db, anterior: caminhoDe(atual?.foto_url) }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = await carregar(id)
  if ('erro' in c) return c.erro
  const { sessao, db, anterior } = c

  const arquivo = (await req.formData().catch(() => null))?.get('arquivo')
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: 'Escolha uma imagem' }, { status: 400 })
  if (arquivo.size > FOTO_MAX_BYTES) return NextResponse.json({ erro: 'Imagem grande demais (máximo 2 MB)' }, { status: 400 })
  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  const mime = tipoRealDaImagem(bytes)
  if (!mime) return NextResponse.json({ erro: 'Use uma imagem JPG, PNG ou WEBP' }, { status: 400 })

  const caminho = `${sessao.barbearia_id}/servicos/${id}-${Date.now()}.${EXTENSAO[mime]}`
  const { error: errUp } = await db.storage.from('fotos').upload(caminho, bytes, { contentType: mime, upsert: false })
  if (errUp) return falhaInterna('painel/servicos/foto', errUp, 'Não deu pra enviar a imagem')
  const url = db.storage.from('fotos').getPublicUrl(caminho).data.publicUrl
  const { error } = await db.from('servicos').update({ foto_url: url }).eq('id', id).eq('barbearia_id', sessao.barbearia_id)
  if (error) { await db.storage.from('fotos').remove([caminho]); return falhaInterna('painel/servicos/foto', error, 'Não deu pra salvar a imagem') }
  if (anterior?.startsWith(`${sessao.barbearia_id}/`)) await db.storage.from('fotos').remove([anterior])
  return NextResponse.json({ url })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = await carregar(id)
  if ('erro' in c) return c.erro
  const { sessao, db, anterior } = c
  const { error } = await db.from('servicos').update({ foto_url: null }).eq('id', id).eq('barbearia_id', sessao.barbearia_id)
  if (error) return falhaInterna('painel/servicos/foto', error, 'Não deu pra remover a imagem')
  if (anterior?.startsWith(`${sessao.barbearia_id}/`)) await db.storage.from('fotos').remove([anterior])
  return NextResponse.json({ ok: true })
}
