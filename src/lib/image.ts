/**
 * Reads an image file (PNG, JPG, GIF, SVG, ...) and returns it as a PNG data URL,
 * scaled down so the checklist file stays small. PNG works in both print and Word.
 */
export async function imageFileToPng(file: File, maxHeight = 240): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const w = img.naturalWidth || 300
    const h = img.naturalHeight || 100
    const scale = Math.min(1, maxHeight / h)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}
