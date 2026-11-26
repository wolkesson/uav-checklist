/**
 * Reads an image file (PNG, JPG, GIF, SVG, ...) and returns it as a PNG data URL,
 * scaled down so the checklist file stays small. PNG works in both print and Word.
 *
 * The file is read as a data: URL rather than a blob: URL, because the site's
 * Content-Security-Policy (public/_headers) only allows images from 'self' and data:.
 */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function imageFileToPng(file: File, maxHeight = 240): Promise<string> {
  const img = new Image()
  img.src = await readAsDataUrl(file)
  await img.decode()
  const w = img.naturalWidth || 300
  const h = img.naturalHeight || 100
  const scale = Math.min(1, maxHeight / h)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}
