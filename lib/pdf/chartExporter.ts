import type { jsPDF } from 'jspdf'

/**
 * Converts an SVG element into a high-DPI PNG Data URL.
 */
export async function svgToPngDataUrl(svgElement: SVGSVGElement, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const clone = svgElement.cloneNode(true) as SVGSVGElement
      const bbox = svgElement.getBoundingClientRect()
      const width = bbox.width || 600
      const height = bbox.height || 300

      clone.setAttribute('width', width.toString())
      clone.setAttribute('height', height.toString())

      const serializer = new XMLSerializer()
      let svgString = serializer.serializeToString(clone)

      if (!svgString.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"')
      }

      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const URLObj = window.URL || window.webkitURL || window
      const blobUrl = URLObj.createObjectURL(svgBlob)

      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width * scale
        canvas.height = height * scale
        const context = canvas.getContext('2d')
        if (!context) {
          URLObj.revokeObjectURL(blobUrl)
          return reject(new Error('Failed to get 2D canvas context'))
        }
        context.scale(scale, scale)
        // White background for charts on PDF
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, width, height)
        context.drawImage(image, 0, 0, width, height)

        const pngDataUrl = canvas.toDataURL('image/png')
        URLObj.revokeObjectURL(blobUrl)
        resolve(pngDataUrl)
      }

      image.onerror = (err) => {
        URLObj.revokeObjectURL(blobUrl)
        reject(err)
      }

      image.src = blobUrl
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Safely adds page number footers to jsPDF document.
 */
export function addPdfFooters(doc: jsPDF, footerText = 'Hivaco Logbook System') {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()

    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text(footerText, 14, pageHeight - 10)
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' })
  }
}
