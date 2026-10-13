import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { FOTO_MAX_BYTES, tipoRealDaImagem, EXTENSAO } from '@/lib/upload-imagem'

export async function POST(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'barbeiro' || !sessao.profissional_id) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const form = await req.formData().catch(() => null)
  const arquivo = form?.get('foto')
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: 'Escolha uma foto' }, { status: 400 })
  if (arquivo.size > FOTO_MAX_BYTES) return NextResponse.json({ erro: 'Foto grande demais (máximo 2 MB)' }, { status: 400 })

  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  const tipo = tipoRealDaImagem(bytes)
  if (!tipo) return NextResponse.json({ erro: 'Use uma foto JPG, PNG ou WEBP' }, { status: 400 })

  const db = criarClienteServico()
  // Nome novo a cada envio: evita cache mostrando a foto antiga
  const caminho = `${sessao.barbearia_id}/barbeiros/${sessao.profissional_id}-${Date.now()}.${EXTENSAO[tipo]}`
  const { error: errUp } = await db.storage.from('fotos').upload(caminho, bytes, { contentType: tipo, upsert: false })
  if (errUp) return NextResponse.json({ erro: 'Não deu pra enviar a foto' }, { status: 500 })

  const { data: pub } = db.storage.from('fotos').getPublicUrl(caminho)

  // Apaga a foto anterior pra não acumular arquivo
  const { data: atual } = await db.from('profissionais').select('foto_url').eq('id', sessao.profissional_id).single()
  await db.from('profissionais').update({ foto_url: pub.publicUrl }).eq('id', sessao.profissional_id)
  const anterior = atual?.foto_url?.split('/object/public/fotos/')[1]
  if (anterior) await db.storage.from('fotos').remove([anterior])

  return NextResponse.json({ foto_url: pub.publicUrl })
}
