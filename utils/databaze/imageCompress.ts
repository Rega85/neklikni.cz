/**
 * Browser-side image komprese pro modul /databaze.
 *
 * Použití: před přidáním obrázku do formuláře nahlášení ho
 * zmenšíme na max 1920px stranu @ JPEG quality 0.82.
 *
 * Důsledky:
 * - Drasticky sníží velikost (5-10MB → 0.8-1.5MB typicky)
 * - Strip EXIF / GPS metadata (intentional kvůli GDPR — uživatel
 *   může nahrát fotky, které obsahují polohu pořízení)
 * - Konvertuje vše na JPEG (i z PNG/WEBP) kvůli predictable
 *   payload size
 *
 * Žádné externí dependencies — pouze nativní canvas + File API.
 */

const MAX_DIMENSION = 1920
const JPEG_QUALITY = 0.82


/**
 * True pokud MIME typ je obrázek, který umíme komprimovat
 * přes canvas (JPEG, PNG, WEBP).
 *
 * Pro PDF a jiné typy vracíme false — soubor se nekomprimuje
 * a jen se validuje proti MAX_FILE_SIZE_BYTES.
 */
export function isCompressibleImage(mimeType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)
}


/**
 * Komprimuje obrázek browser-side. Vrátí nový File objekt
 * s upraveným payloadem.
 *
 * Fallback: pokud komprese selže (CORS, OOM, neznámý formát),
 * vrátí původní File objekt. Volající kód musí validovat
 * velikost znovu po této funkci.
 *
 * @example
 *   const compressed = await compressImage(originalFile)
 *   // originalFile = 8.2 MB JPEG (4032x3024)
 *   // compressed = 1.1 MB JPEG (1920x1440)
 */
export async function compressImage(file: File): Promise<File> {
  return new Promise<File>((resolve) => {
    const reader = new FileReader()

    reader.onerror = () => resolve(file)

    reader.onload = (e) => {
      const dataUrl = e.target?.result
      if (typeof dataUrl !== 'string') {
        resolve(file)
        return
      }

      const img = new Image()
      img.onerror = () => resolve(file)

      img.onload = () => {
        // Spočítej target dimensions se zachováním aspect ratio.
        let { width, height } = img
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width)
            width = MAX_DIMENSION
          } else {
            width = Math.round((width * MAX_DIMENSION) / height)
            height = MAX_DIMENSION
          }
        }

        // Canvas render
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)

        // Export jako JPEG blob.
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            // Ponech base jméno, ale přípona vždy .jpg (konvertujeme).
            const baseName = file.name.replace(/\.[^.]+$/, '')
            const compressedFile = new File([blob], `${baseName}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          'image/jpeg',
          JPEG_QUALITY,
        )
      }

      img.src = dataUrl
    }

    reader.readAsDataURL(file)
  })
}
