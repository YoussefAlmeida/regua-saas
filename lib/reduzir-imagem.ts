/* ================================================================
   Reduz a foto no próprio aparelho antes de enviar. A pessoa escolhe
   a foto como saiu da câmera (10 MB, 4000 px) e o que sobe é uma
   versão leve, do tamanho que a tela usa. Só roda no navegador.
   ================================================================ */

const LIMITE = 1.5 * 1024 * 1024      // folga sobre os 2 MB que o servidor aceita
const LEVE = 500 * 1024               // abaixo disso e sem passar do lado, vai como está

async function abrir(arquivo: File): Promise<{ fonte: CanvasImageSource; w: number; h: number; soltar: () => void }> {
  // createImageBitmap respeita a rotação que a câmera grava na foto
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
      return { fonte: bmp, w: bmp.width, h: bmp.height, soltar: () => bmp.close() }
    } catch { /* tenta pelo <img> */ }
  }
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => falha(new Error('imagem ilegível'))
      i.src = url
    })
    return { fonte: img, w: img.naturalWidth, h: img.naturalHeight, soltar: () => URL.revokeObjectURL(url) }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

const paraBlob = (c: HTMLCanvasElement, tipo: string, q: number) => new Promise<Blob | null>(ok => c.toBlob(ok, tipo, q))

/**
 * Devolve a foto pronta pra enviar (JPG; com `transparente`, WEBP ou PNG pra manter o fundo vazado do logo).
 * Lança erro se o navegador não conseguir abrir a imagem.
 */
export async function reduzirImagem(arquivo: File, { lado = 1600, transparente = false }: { lado?: number; transparente?: boolean } = {}): Promise<File> {
  const img = await abrir(arquivo)
  try {
    const aceito = ['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type)
    if (aceito && arquivo.size <= LEVE && Math.max(img.w, img.h) <= lado) return arquivo

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('sem canvas')
    const tipo = transparente ? 'image/webp' : 'image/jpeg'

    let alvo = lado
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      const escala = Math.min(1, alvo / Math.max(img.w, img.h))
      canvas.width = Math.max(1, Math.round(img.w * escala))
      canvas.height = Math.max(1, Math.round(img.h * escala))
      if (!transparente) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height) }
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img.fonte, 0, 0, canvas.width, canvas.height)
      for (const q of [0.85, 0.75, 0.65]) {
        const blob = await paraBlob(canvas, tipo, q)
        // Navegador que não gera WEBP devolve PNG: serve, se couber
        if (blob && blob.size <= LIMITE) {
          const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
          return new File([blob], `foto.${ext}`, { type: blob.type })
        }
        if (blob?.type === 'image/png') break   // qualidade não muda PNG: só diminuindo
      }
      alvo = Math.round(alvo * 0.75)
    }
    throw new Error('não coube')
  } finally {
    img.soltar()
  }
}

export const ERRO_IMAGEM = 'Não deu pra abrir essa imagem. Tenta outra foto (JPG, PNG ou WEBP).'
