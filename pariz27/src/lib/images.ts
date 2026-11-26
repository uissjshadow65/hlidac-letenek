const MAX_EDGE = 2048
const QUALITY = 0.85

export interface PreparedImage {
  blob: Blob
  width: number | null
  height: number | null
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
    } catch {
      // některé formáty umí jen <img>
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

/**
 * Zmenší fotografii na rozumnou velikost (max. 2048 px) a uloží jako JPEG.
 * Šetří místo v telefonu i v úložišti a urychlí synchronizaci.
 * Pokud fotografii nejde zpracovat, vrátí původní soubor.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  try {
    const img = await decode(file)
    try {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img.source, 0, 0, w, h)
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', QUALITY))
      if (!blob) throw new Error('toBlob')
      // malý obrázek, který by se převodem zvětšil, necháme v originále
      if (scale === 1 && file.size < blob.size && /^image\/(jpeg|png|webp)$/.test(file.type)) {
        return { blob: file, width: w, height: h }
      }
      return { blob, width: w, height: h }
    } finally {
      img.close()
    }
  } catch {
    return { blob: file, width: null, height: null }
  }
}
