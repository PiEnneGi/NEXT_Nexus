import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { ArchitectureResult, AgentReport, ComplianceFinding, AnalyzeData, ValidatorData, HealData, HardenerData, DocsData } from '@shared/types'

export function downloadSVG(svgContent: string, filename = 'architecture.svg') {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadPNG(
  elementOrSvg: HTMLElement | SVGElement | string,
  filename = 'architecture.png',
  scale = 2,
): Promise<void> {
  if (typeof elementOrSvg !== 'string') {
    const canvas = await html2canvas(elementOrSvg as HTMLElement, {
      scale,
      backgroundColor: '#050505',
      useCORS: true,
      logging: false,
    })
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
    if (!blob) throw new Error('Canvas toBlob failed')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
    return
  }

  const img = new Image()
  const blob = new Blob([elementOrSvg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(img.width, 1) * scale
        canvas.height = Math.max(img.height, 1) * scale
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
            URL.revokeObjectURL(a.href)
            resolve()
          } else {
            reject(new Error('Canvas toBlob failed'))
          }
        }, 'image/png')
      }
      img.onerror = () => reject(new Error('SVG image load failed'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
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
  const footerH = 14
  let pageNum = 1
  let y = margin

  function addFooter() {
    pdf.setDrawColor(229, 231, 235)
    pdf.line(margin, pageH - footerH + 2, pageW - margin, pageH - footerH + 2)
    pdf.setFontSize(7)
    pdf.setTextColor(156, 163, 175)
    pdf.setFont('helvetica', 'normal')
    const dateStr = new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })
    pdf.text(`Cerebras Nexus — Architecture Report`, margin, pageH - 5)
    pdf.text(`Generato il ${dateStr}`, pageW / 2, pageH - 5, { align: 'center' })
    pdf.text(`${pageNum}`, pageW - margin, pageH - 5, { align: 'right' })
  }

  function ensureSpace(needed: number) {
    if (y + needed > pageH - margin - footerH) {
      addFooter()
      pdf.addPage()
      pageNum++
      y = margin
    }
  }

  function sectionTitle(text: string) {
    ensureSpace(14)
    pdf.setFillColor(255, 107, 0)
    pdf.rect(margin, y, 3, 12, 'F')
    pdf.setTextColor(255, 107, 0)
    pdf.setFontSize(13)
    pdf.setFont('helvetica', 'bold')
    pdf.text(text, margin + 9, y + 9)
    y += 18
  }

  function subTitle(text: string) {
    ensureSpace(10)
    pdf.setTextColor(107, 114, 128)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.text(text, margin, y + 3)
    y += 8
  }

  function bodyText(text: string, indent = 0) {
    if (!text) return
    pdf.setFontSize(9)
    pdf.setTextColor(55, 65, 81)
    pdf.setFont('helvetica', 'normal')
    const lines = pdf.splitTextToSize(text, contentW - indent)
    for (const line of lines) {
      ensureSpace(4.5)
      pdf.text(line, margin + indent, y + 3)
      y += 4.5
    }
    y += 2
  }

  function keyValue(key: string, value: string) {
    ensureSpace(6)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(107, 114, 128)
    const keyW = pdf.getTextWidth(key + ':  ') + 2
    pdf.text(key + ':', margin, y + 3)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(55, 65, 81)
    const remainingW = contentW - keyW
    const valLines = pdf.splitTextToSize(value, remainingW)
    pdf.text(valLines[0], margin + keyW, y + 3)
    y += 5
    for (let i = 1; i < valLines.length; i++) {
      ensureSpace(4.5)
      pdf.text(valLines[i], margin + keyW, y + 3)
      y += 4.5
    }
  }

  function infoBadge(text: string, color: [number, number, number], bg: [number, number, number]) {
    const tw = pdf.getTextWidth(text) + 6
    pdf.setFillColor(bg[0], bg[1], bg[2])
    pdf.setDrawColor(color[0], color[1], color[2])
    pdf.roundedRect(margin, y, Math.min(tw, contentW), 6, 1.5, 1.5, 'FD')
    pdf.setTextColor(color[0], color[1], color[2])
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'bold')
    pdf.text(text, margin + 3, y + 4.5)
    y += 10
  }

  function drawTable(
    headers: string[],
    rows: string[][],
    colWidths: number[],
    startY?: number,
  ): number {
    if (startY !== undefined) y = startY
    const rowH = 6
    const headerH = 7
    const totalW = colWidths.reduce((a, b) => a + b, 0)

    if (y + (rows.length + 1) * rowH + headerH > pageH - margin - footerH) {
      addFooter()
      pdf.addPage()
      pageNum++
      y = margin
    }

    let x = margin

    pdf.setFillColor(255, 107, 0)
    pdf.setDrawColor(255, 107, 0)
    pdf.rect(x, y, totalW, headerH, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'bold')
    let cx = x
    for (let i = 0; i < headers.length; i++) {
      pdf.text(headers[i], cx + 1.5, y + 4.5)
      cx += colWidths[i]
    }
    y += headerH

    for (let r = 0; r < rows.length; r++) {
      if (y + rowH > pageH - margin - footerH) {
        addFooter()
        pdf.addPage()
        pageNum++
        y = margin
        cx = margin
        pdf.setFillColor(255, 107, 0)
        pdf.setDrawColor(255, 107, 0)
        pdf.rect(cx, y, totalW, headerH, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(7.5)
        pdf.setFont('helvetica', 'bold')
        cx = margin
        for (let i = 0; i < headers.length; i++) {
          pdf.text(headers[i], cx + 1.5, y + 4.5)
          cx += colWidths[i]
        }
        y += headerH
      }

      if (r % 2 === 0) {
        pdf.setFillColor(249, 250, 251)
      } else {
        pdf.setFillColor(255, 255, 255)
      }
      pdf.setDrawColor(229, 231, 235)
      pdf.rect(x, y, totalW, rowH, 'FD')

      pdf.setTextColor(55, 65, 81)
      pdf.setFontSize(7)
      pdf.setFont('helvetica', 'normal')
      cx = x
      for (let i = 0; i < rows[r].length; i++) {
        const text = rows[r][i] || '-'
        const maxW = colWidths[i] - 3
        const fitted = pdf.splitTextToSize(text, maxW)
        pdf.text(fitted[0], cx + 1.5, y + 4)
        cx += colWidths[i]
      }
      y += rowH
    }

    y += 2
    return y
  }

  function drawStatusBar(pct: number, label: string, color: [number, number, number]) {
    ensureSpace(12)
    const barW = contentW
    const barH = 4
    pdf.setFillColor(229, 231, 235)
    pdf.roundedRect(margin, y, barW, barH, 2, 2, 'F')
    pdf.setFillColor(color[0], color[1], color[2])
    pdf.roundedRect(margin, y, barW * Math.min(pct / 100, 1), barH, 2, 2, 'F')
    pdf.setTextColor(color[0], color[1], color[2])
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.text(label, margin + 3, y + barH + 4)
    pdf.text(`${pct}%`, margin + barW, y + barH + 4, { align: 'right' })
    y += 14
  }

  addFooter()

  // ─── COVER PAGE ───
  y = pageH / 2 - 50

  pdf.setTextColor(255, 107, 0)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('CEREBRAS NEXUS', pageW / 2, y, { align: 'center' })
  y += 10

  pdf.setTextColor(17, 24, 39)
  pdf.setFontSize(28)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Architecture Report', pageW / 2, y, { align: 'center' })
  y += 10

  pdf.setDrawColor(255, 107, 0)
  pdf.setLineWidth(0.6)
  pdf.line(pageW / 2 - 30, y, pageW / 2 + 30, y)
  y += 10

  pdf.setTextColor(107, 114, 128)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Automated Infrastructure Audit — Generated by Gemma-4-31B', pageW / 2, y, { align: 'center' })
  y += 8

  const dateStr = new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })
  pdf.setTextColor(156, 163, 175)
  pdf.setFontSize(9)
  pdf.text(dateStr, pageW / 2, y, { align: 'center' })
  y += 6

  const reportId = `NEX-${Date.now().toString(36).toUpperCase()}`
  pdf.setTextColor(209, 213, 219)
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Report ID: ${reportId}`, pageW / 2, y, { align: 'center' })
  y += 20

  if (result) {
    const compPct = result.compliance.gdpr ? 100 : Math.round((result.compliance.details.filter(d => !d.toLowerCase().includes('non-compliant')).length / Math.max(result.compliance.details.length, 1)) * 100)
    const secPct = result.security.passed + result.security.failed > 0
      ? Math.round((result.security.passed / (result.security.passed + result.security.failed)) * 100)
      : 0
    const valPct = result.validation.valid ? 100 : 0
    const overallPct = Math.round((compPct + secPct + valPct) / 3)

    const statusColor: [number, number, number] = overallPct >= 80 ? [34, 197, 94] : overallPct >= 50 ? [255, 107, 0] : [239, 68, 68]
    pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2])
    pdf.setDrawColor(statusColor[0], statusColor[1], statusColor[2])
    const badgeW = 80
    const badgeH = 7
    pdf.roundedRect(pageW / 2 - badgeW / 2, y, badgeW, badgeH, 3, 3, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`OVERALL SCORE: ${overallPct}%`, pageW / 2, y + 5, { align: 'center' })
    y += 20
  }

  // ─── CONTENT PAGES ───
  pdf.addPage()
  pageNum++
  y = margin

  // ── Original Request ──
  sectionTitle('Original Request')
  bodyText(userInput || 'N/A')
  y += 2

  // ── Compliance ──
  if (result) {
    sectionTitle('Compliance Status')
    infoBadge(
      result.compliance.gdpr ? 'GDPR: Compliant' : 'GDPR: Non-Compliant',
      result.compliance.gdpr ? [34, 197, 94] : [239, 68, 68],
      result.compliance.gdpr ? [240, 253, 244] : [254, 242, 242],
    )
    if (result.compliance.findings && result.compliance.findings.length > 0) {
      subTitle('Compliance Findings')
      const findings = result.compliance.findings
      const headers = ['Severity', 'Article', 'Title', 'Passed']
      const colWidths = [22, 22, 92, 34]
      const rows = findings.map((f: ComplianceFinding) => [
        f.severity || 'Low',
        f.article || '',
        f.title || '',
        f.passed ? '✓' : '✗',
      ])
      drawTable(headers, rows, colWidths)

      for (const f of findings) {
        if (f.description || f.remediation) {
          ensureSpace(4)
          pdf.setFontSize(7)
          pdf.setFont('helvetica', 'normal')
          if (f.description) {
            pdf.setTextColor(107, 114, 128)
            pdf.text(f.description, margin + 2, y + 3)
            y += 4
          }
          if (!f.passed && f.remediation) {
            pdf.setTextColor(239, 68, 68)
            pdf.setFont('helvetica', 'bold')
            pdf.text('→ ' + f.remediation, margin + 2, y + 3)
            y += 5
          }
        }
      }
      y += 2
    }
    if (result.compliance.details.length > 0) {
      subTitle('Details')
      for (const d of result.compliance.details) {
        bodyText('• ' + d)
      }
    }
  }

  // ── Security ──
  if (result) {
    sectionTitle('Security Overview')
    const secPct = result.security.passed + result.security.failed > 0
      ? Math.round((result.security.passed / (result.security.passed + result.security.failed)) * 100)
      : 0
    const secColor: [number, number, number] = secPct >= 80 ? [34, 197, 94] : secPct >= 50 ? [255, 107, 0] : [239, 68, 68]
    drawStatusBar(secPct, 'Security Score', secColor)
    keyValue('Passed', `${result.security.passed}`)
    keyValue('Failed', `${result.security.failed}`)
    if (result.security.warnings.length > 0) {
      subTitle('Warnings')
      for (const w of result.security.warnings) {
        bodyText('⚠ ' + w)
      }
    }
  }

  // ── Validation ──
  if (result) {
    sectionTitle('Validation')
    infoBadge(
      result.validation.valid ? 'Valid: Yes' : 'Valid: No',
      result.validation.valid ? [34, 197, 94] : [239, 68, 68],
      result.validation.valid ? [240, 253, 244] : [254, 242, 242],
    )
    if (result.validation.errors.length > 0) {
      subTitle('Errors')
      for (const e of result.validation.errors) {
        bodyText('• ' + e)
      }
    }
  }

  // ── Agent Reports ──
  const agentOrder: { id: string; label: string }[] = [
    { id: 'search', label: 'Analyze — Requirements' },
    { id: 'shieldCheck', label: 'Compliance — GDPR Findings' },
    { id: 'zap', label: 'Auto-Heal — Patches Applied' },
    { id: 'lock', label: 'Hardener — Security Controls' },
    { id: 'fileText', label: 'Docs — Documentation' },
    { id: 'clipboardCheck', label: 'Validator — Scorecard' },
  ]

  for (const { id, label } of agentOrder) {
    const report = agentReports[id]
    if (!report) continue

    ensureSpace(30)
    sectionTitle(label)

    if (report.type === 'analyze') {
      const d = report.data as AnalyzeData
      keyValue('RPO (Recovery Point Objective)', d.rpo || 'N/A')
      keyValue('RTO (Recovery Time Objective)', d.rto || 'N/A')
      y += 2

      if (d.requirements && d.requirements.length > 0) {
        subTitle(`Requirements (${d.requirements.length})`)
        const headers = ['Name', 'Value', 'Priority']
        const colWidths = [60, 75, 35]
        const rows = d.requirements.map((r) => [
          r.name || '',
          r.value || '',
          r.priority || 'N/A',
        ])
        drawTable(headers, rows, colWidths)
      }

      if (d.services && d.services.length > 0) {
        subTitle(`Services (${d.services.length})`)
        pdf.setFontSize(8)
        pdf.setTextColor(55, 65, 81)
        pdf.setFont('helvetica', 'normal')
        let sx = margin
        ensureSpace(5)
        for (const s of d.services) {
          const tag = typeof s === 'string' ? s : String(s)
          const tw = pdf.getTextWidth(tag) + 6
          if (sx + tw > margin + contentW) {
            y += 6
            ensureSpace(6)
            sx = margin
          }
          pdf.setFillColor(243, 244, 246)
          pdf.setDrawColor(209, 213, 219)
          pdf.roundedRect(sx, y, tw, 5, 1.5, 1.5, 'FD')
          pdf.setTextColor(55, 65, 81)
          pdf.text(tag, sx + 3, y + 3.5)
          sx += tw + 3
        }
        y += 8
      }

    } else if (report.type === 'validator') {
      const d = report.data as ValidatorData
      keyValue('Score', `${d.score}%`)
      keyValue('Approved', d.approved ? 'Yes' : 'No')
      const vColor: [number, number, number] = d.score >= 80 ? [34, 197, 94] : d.score >= 60 ? [255, 107, 0] : [239, 68, 68]
      drawStatusBar(d.score, d.approved ? 'Approved' : 'Not Approved', vColor)
      y += 2

      if (d.checks && d.checks.length > 0) {
        subTitle(`Checks (${d.checks.length})`)
        const headers = ['Check Name', 'Passed', 'Weight', 'Message']
        const colWidths = [65, 20, 20, 65]
        const rows = d.checks.map((c) => [
          c.name || '',
          c.passed ? '✓' : '✗',
          `x${c.weight}`,
          c.message || '',
        ])
        drawTable(headers, rows, colWidths)
      }

    } else if (report.type === 'heal') {
      const d = report.data as HealData
      const patches = d.patches || []
      keyValue('Total Patches Applied', `${patches.length}`)
      const compPatches = patches.filter((p) => p.fixesViolation).length
      const autoPatches = patches.filter((p) => !p.fixesViolation && !p.advisory).length
      if (compPatches > 0) keyValue('Compliance Patches', `${compPatches}`)
      if (autoPatches > 0) keyValue('Autonomous Patches', `${autoPatches}`)
      y += 2

      for (let i = 0; i < patches.length; i++) {
        const p = patches[i]
        ensureSpace(16)
        y += 2

        pdf.setDrawColor(229, 231, 235)
        pdf.setFillColor(249, 250, 251)
        pdf.roundedRect(margin, y, contentW, 1, 0.5, 0.5, 'F')

        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(17, 24, 39)
        pdf.text(`Patch #${i + 1}: ${p.file || 'unknown'}`, margin + 2, y + 3.5)
        y += 6

        if (p.fixesViolation) {
          pdf.setFontSize(7)
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(34, 197, 94)
          pdf.text('✓ Fixes: ' + p.fixesViolation, margin + 2, y + 3)
          y += 5
        }
        if (p.advisory) {
          pdf.setFontSize(7)
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(255, 107, 0)
          pdf.text('⚠ Manual Fix Required', margin + 2, y + 3)
          y += 5
        }
        if (p.reasoning) {
          pdf.setFontSize(7)
          pdf.setFont('helvetica', 'italic')
          pdf.setTextColor(107, 114, 128)
          const reasonLines = pdf.splitTextToSize(p.reasoning, contentW - 4)
          for (const line of reasonLines) {
            ensureSpace(4)
            pdf.text(line, margin + 2, y + 3)
            y += 4
          }
        }
        y += 1

        if (p.original || p.patched) {
          ensureSpace(16)
          pdf.setFontSize(6.5)
          pdf.setFont('helvetica', 'bold')
          const halfW = (contentW - 4) / 2

          pdf.setTextColor(239, 68, 68)
          pdf.text('Before', margin + 2, y + 3)
          pdf.setTextColor(34, 197, 94)
          pdf.text('After', margin + halfW + 4, y + 3)
          y += 4

          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(107, 114, 128)
          pdf.setFontSize(5.5)

          const origLines = pdf.splitTextToSize(p.original || '(empty)', halfW - 2).slice(0, 15)
          const patchedLines = pdf.splitTextToSize(p.patched || '(empty)', halfW - 2).slice(0, 15)
          const maxLines = Math.max(origLines.length, patchedLines.length)
          for (let li = 0; li < maxLines; li++) {
            ensureSpace(3.5)
            if (li < origLines.length) {
              pdf.setTextColor(185, 28, 28)
              pdf.text(origLines[li], margin + 2, y + 2.5)
            }
            if (li < patchedLines.length) {
              pdf.setTextColor(21, 128, 61)
              pdf.text(patchedLines[li], margin + halfW + 4, y + 2.5)
            }
            y += 3.5
          }
          y += 3
        }
      }

    } else if (report.type === 'hardener') {
      const d = report.data as HardenerData

      keyValue('Security Score', d.hardeningSummary?.securityScore || 'N/A')
      keyValue('Controls Passed', `${d.passed || 0} / ${d.total || 0}`)
      y += 2

      if (d.hardeningSummary) {
        subTitle('Findings Breakdown')
        const headers = ['Critical', 'High', 'Medium', 'Low', 'Total']
        const colWidths = [34, 34, 34, 34, 34]
        const rows = [[
          `${d.hardeningSummary.criticalFindings || 0}`,
          `${d.hardeningSummary.highFindings || 0}`,
          `${d.hardeningSummary.mediumFindings || 0}`,
          `${d.hardeningSummary.lowFindings || 0}`,
          `${d.hardeningSummary.totalFindings || 0}`,
        ]]
        drawTable(headers, rows, colWidths)
      }

      if (d.iamHardening) {
        subTitle('IAM Least Privilege')
        keyValue('Policies Reviewed', `${d.iamHardening.policiesReviewed || 0}`)
        keyValue('Over-Privileged Found', `${d.iamHardening.overPrivilegedPoliciesFound || 0}`)
        if (d.iamHardening.policiesHardened && d.iamHardening.policiesHardened.length > 0) {
          for (const ph of d.iamHardening.policiesHardened) {
            bodyText(`• ${ph.policyName}: ${ph.originalActions} → ${ph.reducedActions} actions (${ph.riskReduction})`)
          }
        }
      }

      if (d.cisBenchmark) {
        subTitle('CIS Benchmark')
        keyValue('Version', d.cisBenchmark.version || 'N/A')
        keyValue('Level', d.cisBenchmark.level || 'N/A')
        keyValue('Coverage', d.cisBenchmark.coverage || 'N/A')
        keyValue('Controls Passed/Failed', `${d.cisBenchmark.controlsPassed || 0} / ${d.cisBenchmark.controlsFailed || 0}`)
      }

      if (d.encryptionScore) {
        subTitle('Encryption')
        keyValue('Services Encrypted at Rest', `${d.encryptionScore.servicesEncryptedAtRest || 0}`)
        keyValue('Services with TLS 1.2+', `${d.encryptionScore.servicesWithTLS || 0}`)
        keyValue('KMS Keys Active', `${d.encryptionScore.kmsKeysUsed || 0}`)
        keyValue('Overall Encryption Score', d.encryptionScore.overallEncryptionScore || 'N/A')
      }

      if (d.controls && d.controls.length > 0) {
        subTitle(`Security Controls (${d.controls.length})`)
        const headers = ['Control', 'Category', 'Applied', 'Description']
        const colWidths = [45, 30, 22, 73]
        const rows = d.controls.map((c) => [
          c.name || '',
          c.category || '',
          c.applied ? '✓' : '✗',
          c.description || '',
        ])
        drawTable(headers, rows, colWidths)
      }

      if (d.scpRecommendations && d.scpRecommendations.length > 0) {
        subTitle(`SCP Recommendations (${d.scpRecommendations.length})`)
        for (const scp of d.scpRecommendations) {
          const detail = scp.rationale || `Effect: ${scp.effect} on ${(scp.actions || []).join(', ')}`
          bodyText(`• ${scp.name}: ${detail}`)
        }
      }

    } else if (report.type === 'docs') {
      const d = report.data as DocsData

      keyValue('Sections', `${(d.sections || []).length}`)
      keyValue('ADR', d.adr || 'N/A')
      y += 2

      if (d.readme) {
        subTitle('README')
        ensureSpace(6)
        pdf.setFontSize(7)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(55, 65, 81)
        const readmeLines = pdf.splitTextToSize(d.readme, contentW - 4)
        const maxReadme = Math.min(readmeLines.length, 40)
        for (let i = 0; i < maxReadme; i++) {
          ensureSpace(4)
          pdf.text(readmeLines[i], margin + 2, y + 3)
          y += 4
        }
        if (readmeLines.length > 40) {
          pdf.setTextColor(156, 163, 175)
          pdf.text(`... (${readmeLines.length - 40} more lines)`, margin + 2, y + 3)
          y += 5
        }
        y += 2
      }

      if (d.sections && d.sections.length > 0) {
        for (const section of d.sections) {
          ensureSpace(10)
          pdf.setFontSize(8)
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(255, 107, 0)
          pdf.text(section.title || 'Section', margin + 2, y + 3)
          y += 5

          if (section.content) {
            const truncated = section.content.length > 800 ? section.content.slice(0, 800) + '...' : section.content
            pdf.setFontSize(7)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(55, 65, 81)
            const sectionLines = pdf.splitTextToSize(truncated, contentW - 4)
            for (const line of sectionLines) {
              ensureSpace(4)
              pdf.text(line, margin + 2, y + 3)
              y += 4
            }
            y += 2
          }
        }
      }

    } else if (report.type === 'compliance') {
      const findings = report.data as ComplianceFinding[]
      if (findings && findings.length > 0) {
        const passed = findings.filter((f) => f.passed).length
        keyValue('Findings', `${findings.length} (${passed} passed, ${findings.length - passed} failed)`)
        y += 2

        const headers = ['Severity', 'Article', 'Title', 'Passed']
        const colWidths = [22, 22, 92, 34]
        const rows = findings.map((f: ComplianceFinding) => [
          f.severity || 'Low',
          f.article || '',
          f.title || '',
          f.passed ? '✓' : '✗',
        ])
        drawTable(headers, rows, colWidths)

        for (const f of findings) {
          if (f.description) {
            ensureSpace(4)
            pdf.setFontSize(7)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(107, 114, 128)
            pdf.text(f.description, margin + 2, y + 3)
            y += 4
          }
          if (!f.passed && f.remediation) {
            ensureSpace(4)
            pdf.setFontSize(7)
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(239, 68, 68)
            pdf.text('→ ' + f.remediation, margin + 2, y + 3)
            y += 5
          }
        }
      }
    }
  }

  // ─── CERTIFICATION ───
  ensureSpace(40)

  y = Math.max(y + 10, pageH / 2 - 20)

  pdf.setDrawColor(34, 197, 94)
  pdf.setLineWidth(1.5)
  const certW = 120
  const certH = 40
  pdf.roundedRect(pageW / 2 - certW / 2, y, certW, certH, 4, 4, 'S')

  pdf.setFillColor(34, 197, 94)
  pdf.rect(pageW / 2 - 6, y + 6, 12, 12, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('✓', pageW / 2, y + 15, { align: 'center' })

  pdf.setTextColor(34, 197, 94)
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('CERTIFIED', pageW / 2, y + 16, { align: 'center' })
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Automated Infrastructure Audit Passed', pageW / 2, y + 24, { align: 'center' })
  pdf.setTextColor(156, 163, 175)
  pdf.setFontSize(7)
  pdf.text(`Report ID: ${reportId} — ${dateStr}`, pageW / 2, y + 32, { align: 'center' })

  addFooter()
  pdf.save(filename)
}
