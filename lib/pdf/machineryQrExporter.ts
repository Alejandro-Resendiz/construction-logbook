import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QRCodeSVG } from 'qrcode.react'
import { addPdfFooters } from '@/lib/pdf/chartExporter'

export interface MachineryItemForQR {
  machinery_id: number
  machinery_full_name: string
  machinery_name?: string | null
  external_code?: string | null
  machinery_model?: string | null
  machinery_serial_code?: string | null
  observations?: string | null
  is_rented?: boolean | null
  machine_type?: string | null
  expected_consumption_hours?: number | null
  expected_consumption_liters?: number | null
  expected_consumption_rate?: number | null
}

/**
 * Converts a QRCodeSVG component rendered as static SVG markup into a high-DPI PNG Data URL.
 */
async function generateQrDataUrl(payload: string, size = 512): Promise<string> {
  const svgString = renderToStaticMarkup(
    React.createElement(QRCodeSVG, {
      value: payload,
      size,
      level: 'H',
      includeMargin: true,
      marginSize: 2,
    })
  )

  return new Promise((resolve, reject) => {
    try {
      let cleanSvg = svgString
      if (!cleanSvg.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
        cleanSvg = cleanSvg.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"')
      }

      const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' })
      const URLObj = window.URL || window.webkitURL || window
      const blobUrl = URLObj.createObjectURL(svgBlob)

      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URLObj.revokeObjectURL(blobUrl)
          return reject(new Error('Canvas 2D context unavailable'))
        }
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, size, size)
        ctx.drawImage(image, 0, 0, size, size)

        const pngUrl = canvas.toDataURL('image/png')
        URLObj.revokeObjectURL(blobUrl)
        resolve(pngUrl)
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
 * Generates and downloads a printable Letter label sheet for a specific machinery item.
 */
export async function exportMachineryQrPdf(machine: MachineryItemForQR): Promise<void> {
  const { jsPDF } = (await import('jspdf/dist/jspdf.es.min.js')) as any

  // Create standard US Letter page (215.9 x 279.4 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // 1. Top Header Banner
  doc.setFillColor(37, 99, 235) // Primary Blue (#2563EB)
  doc.rect(0, 0, pageWidth, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('SIGMA LOGBOOK', 16, 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('FICHA DE IDENTIFICACIÓN Y ACCESO RÁPIDO QR', 16, 18)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(new Date().toLocaleDateString('es-MX'), pageWidth - 16, 15, { align: 'right' })

  // 2. Main Printable Label Card
  const cardWidth = 180
  const cardX = (pageWidth - cardWidth) / 2
  const cardY = 32
  const cardHeight = 220

  // Card Outer Shadow / Border
  doc.setDrawColor(226, 232, 240) // Slate-200
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'FD')

  // Card Title Header Area
  doc.setFillColor(248, 250, 252) // Slate-50
  doc.roundedRect(cardX, cardY, cardWidth, 26, 3, 3, 'F')
  doc.rect(cardX, cardY + 22, cardWidth, 4, 'F') // straighten bottom corners

  // External Code Badge
  doc.setTextColor(30, 41, 59) // Slate-800
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  const codeText = machine.external_code ? `[${machine.external_code}]` : `[ID-${machine.machinery_id}]`
  doc.text(codeText, cardX + 10, cardY + 12)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(machine.machinery_name || 'Maquinaria', cardX + 10, cardY + 19)

  // Status Badge (Propia vs Rentada)
  const isRented = !!machine.is_rented
  const badgeText = isRented ? 'RENTADA' : 'PROPIA'
  const badgeBg = isRented ? [219, 234, 254] : [241, 245, 249]
  const badgeFg = isRented ? [29, 78, 216] : [71, 85, 105]

  doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2])
  doc.roundedRect(cardX + cardWidth - 36, cardY + 8, 26, 8, 2, 2, 'F')
  doc.setTextColor(badgeFg[0], badgeFg[1], badgeFg[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(badgeText, cardX + cardWidth - 23, cardY + 13.5, { align: 'center' })

  // Machine Full Name
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(machine.machinery_full_name, cardX + cardWidth / 2, cardY + 38, {
    align: 'center',
    maxWidth: cardWidth - 20,
  })

  // 3. QR Code Rendering
  const payload = `machinery:${machine.machinery_id}`
  const qrDataUrl = await generateQrDataUrl(payload, 600)

  const qrSize = 75
  const qrX = cardX + (cardWidth - qrSize) / 2
  const qrY = cardY + 46

  // QR background border
  doc.setDrawColor(203, 213, 225) // Slate-300
  doc.setLineWidth(0.5)
  doc.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 2, 2, 'D')

  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

  // QR Payload text below QR
  doc.setFont('courier', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(payload, cardX + cardWidth / 2, qrY + qrSize + 6, { align: 'center' })

  // 4. Machinery Specifications Table
  const specY = qrY + qrSize + 13
  doc.setDrawColor(226, 232, 240)
  doc.line(cardX + 10, specY, cardX + cardWidth - 10, specY)

  const col1X = cardX + 14
  const col2X = cardX + cardWidth / 2 + 6
  let rowY = specY + 8

  // Row 1: Modelo & Serie
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('MODELO:', col1X, rowY)
  doc.text('NÚMERO DE SERIE:', col2X, rowY)

  rowY += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text(machine.machinery_model || 'No registrado', col1X, rowY)
  doc.text(machine.machinery_serial_code || 'No registrado', col2X, rowY)

  rowY += 8
  // Row 2: ID del Sistema & Observaciones
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('ID SISTEMA:', col1X, rowY)
  doc.text('OBSERVACIONES:', col2X, rowY)

  rowY += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text(`#${machine.machinery_id}`, col1X, rowY)
  doc.text(machine.observations || 'Sin observaciones', col2X, rowY, {
    maxWidth: cardWidth / 2 - 16,
  })

  // 5. Operational Instructions Box
  const instrY = cardY + cardHeight - 34
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(cardX + 10, instrY, cardWidth - 20, 26, 2, 2, 'F')

  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('INSTRUCCIONES PARA EL OPERADOR:', cardX + 14, instrY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(71, 85, 105)
  doc.text(
    '1. Abra la aplicación SIGMA Logbook en su teléfono o tableta al inicio del turno.',
    cardX + 14,
    instrY + 11
  )
  doc.text(
    '2. En el formulario de registro, apunte la cámara al código QR superior.',
    cardX + 14,
    instrY + 16
  )
  doc.text(
    '3. La máquina se seleccionará de manera automática y verificada.',
    cardX + 14,
    instrY + 21
  )

  // 6. Page Footer
  addPdfFooters(doc, 'SIGMA Logbook - Ficha de Identificación de Maquinaria')

  // 7. Save File
  const safeCode = (machine.external_code || `ID_${machine.machinery_id}`).replace(/[^a-zA-Z0-9_-]/g, '_')
  doc.save(`QR_Maquinaria_${safeCode}.pdf`)
}

/**
 * Generates and downloads a standalone SVG vector file containing the machinery QR code.
 */
export function exportMachineryQrSvg(machine: MachineryItemForQR): void {
  const payload = `machinery:${machine.machinery_id}`
  let svgString = renderToStaticMarkup(
    React.createElement(QRCodeSVG, {
      value: payload,
      size: 512,
      level: 'H',
      includeMargin: true,
      marginSize: 2,
    })
  )

  if (!svgString.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"')
  }

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const safeCode = (machine.external_code || `ID_${machine.machinery_id}`).replace(/[^a-zA-Z0-9_-]/g, '_')
  link.href = url
  link.download = `QR_Maquinaria_${safeCode}.svg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
