export interface ParsedAgentOutput {
  jsonBlocks: Record<string, unknown>[]
  codeBlocks: { language: string; code: string }[]
  mermaidBlocks: string[]
  fullText: string
}

const JSON_BLOCK_RE = /<json>([\s\S]*?)<\/json>/gi
const CODE_BLOCK_RE = /```(\w+)?\n([\s\S]*?)```/gi
const MERMAID_BLOCK_RE = /```mermaid\n([\s\S]*?)```/gi

export function parseAgentOutput(output: string): ParsedAgentOutput {
  const jsonBlocks: Record<string, unknown>[] = []
  const codeBlocks: { language: string; code: string }[] = []
  const mermaidBlocks: string[] = []

  let match: RegExpExecArray | null

  const jsonRE = new RegExp(JSON_BLOCK_RE.source, 'gi')
  while ((match = jsonRE.exec(output)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim()) as Record<string, unknown>
      jsonBlocks.push(parsed)
    } catch {
      console.warn('[Parser] Invalid JSON in <json> tag, skipping')
    }
  }

  const codeRE = new RegExp(CODE_BLOCK_RE.source, 'gi')
  while ((match = codeRE.exec(output)) !== null) {
    const language = (match[1] ?? '').trim().toLowerCase()
    if (language === 'mermaid') {
      mermaidBlocks.push(match[2].trim())
    } else if (language) {
      codeBlocks.push({ language, code: match[2].trim() })
    }
  }

  return { jsonBlocks, codeBlocks, mermaidBlocks, fullText: output }
}

export function extractFirstJson<T = Record<string, unknown>>(output: string): T | null {
  const parsed = parseAgentOutput(output)
  if (parsed.jsonBlocks.length > 0) {
    return parsed.jsonBlocks[0] as T
  }
  return null
}

export function computeDiffLines(
  previousCode: string,
  currentCode: string,
): { type: 'added' | 'removed' | 'unchanged'; content: string; lineNumber: number }[] {
  const prevLines = previousCode.split('\n')
  const currLines = currentCode.split('\n')
  const result: { type: 'added' | 'removed' | 'unchanged'; content: string; lineNumber: number }[] = []

  const maxLen = Math.max(prevLines.length, currLines.length)
  for (let i = 0; i < maxLen; i++) {
    const lineNum = i + 1
    const prevLine = i < prevLines.length ? prevLines[i] : undefined
    const currLine = i < currLines.length ? currLines[i] : undefined

    if (prevLine === undefined) {
      result.push({ type: 'added', content: currLine!, lineNumber: lineNum })
    } else if (currLine === undefined) {
      result.push({ type: 'removed', content: prevLine, lineNumber: lineNum })
    } else if (prevLine !== currLine) {
      result.push({ type: 'removed', content: prevLine, lineNumber: lineNum })
      result.push({ type: 'added', content: currLine, lineNumber: lineNum })
    } else {
      result.push({ type: 'unchanged', content: prevLine, lineNumber: lineNum })
    }
  }

  return result
}
