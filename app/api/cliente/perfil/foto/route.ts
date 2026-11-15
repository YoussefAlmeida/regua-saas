import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { FOTO_MAX_BYTES, tipoRealDaImagem, EXTENSAO } from '@/lib/upload-imagem'
import { falhaInterna } from '@/lib/erros'
import { semColuna, AVISO_ATUALIZACAO } from '@/lib/extras'

/* Foto de perfil do cliente. Vai pra pasta da barbearia dele e o tipo é
   conferido pelos bytes. POST envia · DELETE remove */

const caminhoDe = (url: string | null | undefined) => url?.split('/object/public/fotos/')[1] ?? null

async function carregar() {
  const s = await getSessao()
  if (!s || s.papel !== 'cliente') return { erro: NextResponse.json({ erro: 'Entre na sua conta' }, { status: 401 }) }
  const db = criarClienteServico()
  const { data, error } = await db.from('usuarios').select('foto_url').eq('id', s.usuario_id).eq('barbearia_id', s.barbearia_id).maybeSingle<{ foto_url: string | null }>()
  if (semColuna(error)) return { erro: NextResponse.json({ erro: AVISO_ATUALIZACAO }, { status: 409 }) }
  return { s, db, anterior: caminhoDe(data?.foto_url) }
}

export async function POST(req: NextRequest) {
  const c = await carregar()
  if ('erro' in c) return c.erro
  const { s, db, anterior } = c

  const arquivo = (await req.formData().catch(() => null))?.get('arquivo')
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: 'Escolha uma imagem' }, { status: 400 })
  if (arquivo.size > FOTO_MAX_BYTES) return NextResponse.json({ erro: 'Imagem grande demais (máximo 2 MB)' }, { status: 400 })
  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  const mime = tipoRealDaImagem(bytes)
  if (!mime) return NextResponse.json({ erro: 'Use uma imagem JPG, PNG ou WEBP' }, { status: 400 })

  const caminho = `${s.barbearia_id}/clientes/${s.usuario_id}-${Date.now()}.${EXTENSAO[mime]}`
  const { error: errUp } = await db.storage.from('fotos').upload(caminho, bytes, { contentType: mime, upsert: false })
  if (errUp) return falhaInterna('cliente/perfil/foto', errUp, 'Não deu pra enviar a imagem')
  const url = db.storage.from('fotos').getPublicUrl(caminho).data.publicUrl
  const { error } = await db.from('usuarios').update({ foto_url: url }).eq('id', s.usuario_id).eq('barbearia_id', s.barbearia_id)
  if (error) { await db.storage.from('fotos').remove([caminho]); return falhaInterna('cliente/perfil/foto', error, 'Não deu pra salvar a imagem') }
  if (anterior?.startsWith(`${s.barbearia_id}/clientes/${s.usuario_id}-`)) await db.storage.from('fotos').remove([anterior])
  return NextResponse.json({ url })
}

export async function DELETE() {
  const c = await carregar()
  if ('erro' in c) return c.erro
  const { s, db, anterior } = c
  const { error } = await db.from('usuarios').update({ foto_url: null }).eq('id', s.usuario_id).eq('barbearia_id', s.barbearia_id)
  if (error) return falhaInterna('cliente/perfil/foto', error, 'Não deu pra remover a imagem')
  if (anterior?.startsWith(`${s.barbearia_id}/clientes/${s.usuario_id}-`)) await db.storage.from('fotos').remove([anterior])
  return NextResponse.json({ ok: true })
}
