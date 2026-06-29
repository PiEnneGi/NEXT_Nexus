export interface ParsedAgentOutput {
  jsonBlocks: Record<string, unknown>[]
  codeBlocks: { language: string; code: string }[]
  mermaidBlocks: string[]
  fullText: string
}

const JSON_BLOCK_RE = /<json\s*>([\s\S]*?)<\/json\s*>/gi
const CODE_BLOCK_RE = /```(\w+)?[^\n]*\n([\s\S]*?)```/gi
const MERMAID_BLOCK_RE = /```mermaid\s*\n([\s\S]*?)```/gi

export function tryParseJson(text: string): unknown {
  const attempt = (s: string) => {
    try { return JSON.parse(s) }
    catch { return null }
  }

  const result = attempt(text)
  if (result) return result

  let cleaned = text

  cleaned = cleaned.replace(/\/\/.*$/gm, '')
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '')

  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')

  const result2 = attempt(cleaned)
  if (result2) return result2

  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)\s*:/g, '$1"$2":')

  const result3 = attempt(cleaned)
  if (result3) return result3

  return null
}

function splitTopLevelBraces(text: string): string[] {
  const items: string[] = []
  let depth = 0
  let inString = false
  let start = -1
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        items.push(text.slice(start, i + 1))
        start = -1
      }
    }
  }
  return items
}

export function extractArrayItems<T>(rawText: string, itemKey: string, validate: (obj: unknown) => obj is T): T[] {
  const arrMatch = new RegExp(`"${itemKey}"\\s*:\\s*\\[([\\s\\S]*?)\\]\\s*[,\\}]`, 'i').exec(rawText)
  if (!arrMatch) return []

  const items: T[] = []
  const objects = splitTopLevelBraces(arrMatch[1])
  for (const objStr of objects) {
    const trimmed = objStr.trim()
    if (!trimmed.startsWith('{')) continue
    const parsed = tryParseJson(trimmed)
    if (parsed && typeof parsed === 'object' && validate(parsed)) {
      items.push(parsed as T)
    }
  }
  return items
}

export function parseAgentOutput(output: string): ParsedAgentOutput {
  const jsonBlocks: Record<string, unknown>[] = []
  const codeBlocks: { language: string; code: string }[] = []
  const mermaidBlocks: string[] = []

  let match: RegExpExecArray | null

  const jsonRE = new RegExp(JSON_BLOCK_RE.source, 'gi')
  while ((match = jsonRE.exec(output)) !== null) {
    try {
      const trimmed = match[1].trim()
      const firstBrace = trimmed.indexOf('{')
      const lastBrace = trimmed.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const parsed = tryParseJson(trimmed.slice(firstBrace, lastBrace + 1)) as Record<string, unknown> | null
        if (parsed) {
          jsonBlocks.push(parsed)
        } else {
          console.warn('[Parser] Invalid JSON in <json> tag (could not repair)')
        }
      }
    } catch (e) {
      console.warn('[Parser] Invalid JSON in <json> tag:', (e as Error).message)
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

  const jsonCodeBlockRE = /```(?:json)?\s*\n([\s\S]*?)```/gi
  let match: RegExpExecArray | null
  while ((match = jsonCodeBlockRE.exec(output)) !== null) {
    const parsed = tryParseJson(match[1].trim()) as T | null
    if (parsed && typeof parsed === 'object') return parsed
  }

  const standaloneRE = /\{[\s\S]*?"\w+"[\s\S]*?\}/g
  while ((match = standaloneRE.exec(output)) !== null) {
    const parsed = tryParseJson(match[0]) as T | null
    if (parsed && typeof parsed === 'object' && Object.keys(parsed as object).length > 1) return parsed
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
  let lineNum = 0
  for (let i = 0; i < maxLen; i++) {
    const prevLine = i < prevLines.length ? prevLines[i] : undefined
    const currLine = i < currLines.length ? currLines[i] : undefined

    if (prevLine === undefined) {
      lineNum++
      result.push({ type: 'added', content: currLine!, lineNumber: lineNum })
    } else if (currLine === undefined) {
      lineNum++
      result.push({ type: 'removed', content: prevLine, lineNumber: lineNum })
    } else if (prevLine !== currLine) {
      lineNum++
      result.push({ type: 'removed', content: prevLine, lineNumber: lineNum })
      lineNum++
      result.push({ type: 'added', content: currLine, lineNumber: lineNum })
    } else {
      lineNum++
      result.push({ type: 'unchanged', content: prevLine, lineNumber: lineNum })
    }
  }

  return result
}
