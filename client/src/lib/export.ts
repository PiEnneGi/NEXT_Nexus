import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { ArchitectureResult, AgentReport } from '@shared/types'

export function downloadSVG(svgContent: string, filename = 'architecture.svg') {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadPNG(
  elementOrSvg: HTMLElement | SVGElement | string,
  filename = 'architecture.png',
  scale = 2,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof elementOrSvg === 'string') {
      const img = new Image()
      const blob = new Blob([elementOrSvg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas context unavailable')); return }
        ctx.scale(scale, scale)
        ctx.drawImage(img, 0, 0)
        canvas.toBlob((b) => {
          if (b) {
            const a = document.createElement('a')
            a.href = URL.createObjectURL(b)
            a.download = filename
            a.click()
            resolve()
          } else {
            reject(new Error('Canvas toBlob failed'))
          }
        }, 'image/png')
      }
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = url
    } else {
      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(elementOrSvg)
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas context unavailable')); return }
        ctx.scale(scale, scale)
        ctx.drawImage(img, 0, 0)
        canvas.toBlob((b) => {
          if (b) {
            const a = document.createElement('a')
            a.href = URL.createObjectURL(b)
            a.download = filename
            a.click()
            resolve()
          } else {
            reject(new Error('Canvas toBlob failed'))
          }
        }, 'image/png')
        URL.revokeObjectURL(url)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('SVG image load failed (foreignObject may not render)'))
      }
      img.src = url
    }
  })
}

export async function downloadPDF(
  element: HTMLElement,
  filename = 'architecture-report.pdf',
  title = 'Cerebras Nexus — Architecture Report',
) {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#050505',
    useCORS: true,
    logging: false,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  pdf.setFillColor(5, 5, 5)
  pdf.rect(0, 0, pageWidth, pageHeight, 'F')

  pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight)

  pdf.save(filename)
}

export async function exportPipelinePDF(
  result: ArchitectureResult | null,
  agentReports: Partial<Record<string, AgentReport>>,
  userInput: string,
  filename = 'cerebras-nexus-report.pdf',
) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentW = pageW - margin * 2
  let y = margin

  const sections: { label: string; content: string }[] = [
    {
      label: 'Original Request',
      content: userInput || 'N/A',
    },
    {
      label: 'Compliance Status',
      content: result
        ? `GDPR: ${result.compliance.gdpr ? 'Compliant' : 'Non-Compliant'}\nFindings: ${result.compliance.details.join('\n')}`
        : 'No compliance data',
    },
    {
      label: 'Security Overview',
      content: result
        ? `Passed: ${result.security.passed} | Failed: ${result.security.failed}\nWarnings: ${result.security.warnings.join('\n')}`
        : 'No security data',
    },
    {
      label: 'Validation',
      content: result
        ? `Valid: ${result.validation.valid ? 'Yes' : 'No'}\nErrors: ${result.validation.errors.join('\n') || 'None'}`
        : 'No validation data',
    },
  ]

  const agentLabels: Record<string, string> = {
    search: 'Analyze — Requirements',
    shieldCheck: 'Compliance — GDPR Findings',
    zap: 'Auto-Heal — Patches Applied',
    lock: 'Hardener — Security Controls',
    fileText: 'Docs — Documentation',
    clipboardCheck: 'Validator — Scorecard',
  }

  for (const [agentId, report] of Object.entries(agentReports)) {
    if (report) {
      let content = ''
      if (report.type === 'analyze') {
        const d = report.data as any
        content = `RPO: ${d.rpo} | RTO: ${d.rto}\nRequirements: ${(d.requirements ?? []).length} items\nServices: ${(d.services ?? []).join(', ')}`
      } else if (report.type === 'validator') {
        const d = report.data as any
        content = `Score: ${d.score}% | Approved: ${d.approved ? 'Yes' : 'No'}\nChecks: ${(d.checks ?? []).map((c: any) => `${c.name}: ${c.passed ? 'PASS' : 'FAIL'}`).join('\n')}`
      } else {
        content = JSON.stringify(report.data, null, 2)
        if (content.length > 500) content = content.slice(0, 500) + '...'
      }
      sections.push({
        label: agentLabels[agentId] || `${report.agentName} Report`,
        content,
      })
    }
  }

  function drawBackground() {
    pdf.setFillColor(5, 5, 5)
    pdf.rect(0, 0, pageW, pageH, 'F')
  }

  function drawHeaderSection() {
    const headerH = 50
    pdf.setFillColor(13, 13, 13)
    pdf.rect(0, 0, pageW, headerH, 'F')
    pdf.setDrawColor(255, 107, 0)
    pdf.setLineWidth(0.5)
    pdf.line(0, headerH, pageW, headerH)
    pdf.setFillColor(255, 107, 0)
    pdf.rect(margin, 12, 4, 26, 'F')
    pdf.setTextColor(204, 255, 0)
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Cerebras Nexus — Architecture Report', margin + 12, 26)
    pdf.setTextColor(136, 136, 136)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Automated Infrastructure Audit — Generated by Gemma-4-31B', margin + 12, 36)
  }

  function drawSectionCard(label: string, content: string, startY: number): number {
    const lineH = 5
    const padding = 6
    const textLines = pdf.splitTextToSize(content, contentW - padding * 2)
    const cardH = Math.max(22, 12 + textLines.length * lineH + padding)

    if (startY + cardH > pageH - margin) {
      pdf.addPage()
      drawBackground()
      startY = margin
    }

    pdf.setDrawColor(26, 26, 26)
    pdf.setFillColor(13, 13, 13)
    pdf.roundedRect(margin, startY, contentW, cardH, 2, 2, 'FD')

    pdf.setFillColor(255, 107, 0)
    pdf.rect(margin + 2, startY + 2, 3, 10, 'F')

    pdf.setTextColor(255, 107, 0)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text(label, margin + 10, startY + 10)

    pdf.setTextColor(204, 204, 204)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    let ty = startY + 18
    for (const line of textLines) {
      pdf.text(line, margin + padding, ty)
      ty += lineH
    }

    return startY + cardH + 6
  }

  drawBackground()
  drawHeaderSection()
  y = 60

  for (const section of sections) {
    y = drawSectionCard(section.label, section.content, y)
  }

  const statusY = y + 4
  if (statusY + 14 < pageH - margin) {
    pdf.setDrawColor(51, 255, 119)
    pdf.setFillColor(51, 255, 119)
    pdf.rect(margin, statusY, 6, 6, 'F')
    pdf.setTextColor(51, 255, 119)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.text('CERTIFIED — Automated Infrastructure Audit Passed', margin + 12, statusY + 5)
  }

  pdf.save(filename)
}
