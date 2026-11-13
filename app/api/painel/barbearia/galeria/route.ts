import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { FOTO_MAX_BYTES, tipoRealDaImagem, EXTENSAO } from '@/lib/upload-imagem'
import { falhaInterna } from '@/lib/erros'
import { semColuna, AVISO_ATUALIZACAO } from '@/lib/extras'

/* Galeria de fotos da barbearia (só o dono), até 8 fotos.
   POST envia uma · DELETE ?url= remove uma */
const MAX = 8

async function carregar() {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return { erro: NextResponse.json({ erro: 'Sem permissão' }, { status: 403 }) }
  const db = criarClienteServico()
  const { data, error } = await db.from('barbearias').select('galeria').eq('id', sessao.barbearia_id).maybeSingle<{ galeria: unknown }>()
  if (semColuna(error)) return { erro: NextResponse.json({ erro: AVISO_ATUALIZACAO }, { status: 409 }) }
  const galeria = Array.isArray(data?.galeria) ? (data!.galeria as unknown[]).filter((u): u is string => typeof u === 'string') : []
  return { sessao, db, galeria }
}

export async function POST(req: NextRequest) {
  const c = await carregar()
  if ('erro' in c) return c.erro
  const { sessao, db, galeria } = c
  if (galeria.length >= MAX) return NextResponse.json({ erro: `A galeria vai até ${MAX} fotos. Tire uma pra colocar outra.` }, { status: 400 })

  const arquivo = (await req.formData().catch(() => null))?.get('arquivo')
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: 'Escolha uma imagem' }, { status: 400 })
  if (arquivo.size > FOTO_MAX_BYTES) return NextResponse.json({ erro: 'Imagem grande demais (máximo 2 MB)' }, { status: 400 })
  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  const mime = tipoRealDaImagem(bytes)
  if (!mime) return NextResponse.json({ erro: 'Use uma imagem JPG, PNG ou WEBP' }, { status: 400 })

  const caminho = `${sessao.barbearia_id}/galeria/${Date.now()}.${EXTENSAO[mime]}`
  const { error: errUp } = await db.storage.from('fotos').upload(caminho, bytes, { contentType: mime, upsert: false })
  if (errUp) return falhaInterna('painel/barbearia/galeria', errUp, 'Não deu pra enviar a imagem')
  const url = db.storage.from('fotos').getPublicUrl(caminho).data.publicUrl
  const nova = [...galeria, url]
  const { error } = await db.from('barbearias').update({ galeria: nova }).eq('id', sessao.barbearia_id)
  if (error) { await db.storage.from('fotos').remove([caminho]); return falhaInterna('painel/barbearia/galeria', error, 'Não deu pra salvar a imagem') }
  return NextResponse.json({ galeria: nova })
}

export async function DELETE(req: NextRequest) {
  const c = await carregar()
  if ('erro' in c) return c.erro
  const { sessao, db, galeria } = c
  const url = req.nextUrl.searchParams.get('url')
  if (!url || !galeria.includes(url)) return NextResponse.json({ erro: 'Foto não encontrada' }, { status: 404 })
  const nova = galeria.filter(u => u !== url)
  const { error } = await db.from('barbearias').update({ galeria: nova }).eq('id', sessao.barbearia_id)
  if (error) return falhaInterna('painel/barbearia/galeria', error, 'Não deu pra remover a imagem')
  // Só apaga arquivo da pasta desta barbearia
  const caminho = url.split('/object/public/fotos/')[1]
  if (caminho?.startsWith(`${sessao.barbearia_id}/`)) await db.storage.from('fotos').remove([caminho])
  return NextResponse.json({ galeria: nova })
}
