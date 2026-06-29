const CEREBRAS_API_BASE = 'https://api.cerebras.ai/v1/chat/completions'
const MODEL = 'gemma-4-31b'
const MAX_RETRIES = 3
const INITIAL_DELAY_MS = 1000

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface CerebrasStreamOptions {
  messages: ChatMessage[]
  onToken: (token: string) => void
  signal?: AbortSignal
}

function parseSSELine(line: string): string | null {
  if (!line.startsWith('data: ')) return null
  const payload = line.slice(6).trim()
  if (payload === '[DONE]') return null
  try {
    const parsed = JSON.parse(payload)
    const content = parsed?.choices?.[0]?.delta?.content
    return content ?? null
  } catch {
    return null
  }
}

class RateLimitError extends Error {
  constructor() {
    super('Rate limited (429)')
    this.name = 'RateLimitError'
  }
}

function jitter(base: number): number {
  return base + Math.random() * 1000
}

async function attemptStream({
  messages,
  onToken,
  signal,
}: CerebrasStreamOptions): Promise<string> {
  const apiKey = process.env.CEREBRAS_API_KEY
  if (!apiKey || apiKey === 'placeholder_key_here') {
    throw new Error('CEREBRAS_API_KEY not configured')
  }

  const response = await fetch(CEREBRAS_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      max_tokens: 4096,
      temperature: 0.7,
    }),
    signal,
  })

  if (response.status === 429) throw new RateLimitError()

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Cerebras API error ${response.status}: ${body}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Response body not readable')

  const decoder = new TextDecoder()
  let buffer = ''
  let accumulated = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const token = parseSSELine(line)
        if (token !== null) {
          onToken(token)
          accumulated += token
        }
      }
    }

    const remaining = buffer.trim()
    if (remaining) {
      const token = parseSSELine(remaining)
      if (token !== null) {
        onToken(token)
        accumulated += token
      }
    }
  } finally {
    reader.releaseLock()
  }

  return accumulated
}

export async function streamCerebras(
  options: CerebrasStreamOptions,
): Promise<string> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await attemptStream(options)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (err instanceof RateLimitError && attempt < MAX_RETRIES) {
        const wait = jitter(INITIAL_DELAY_MS * Math.pow(2, attempt))
        console.warn(
          `[Cerebras] 429, retry ${attempt + 1}/${MAX_RETRIES} in ${Math.round(wait)}ms`,
        )
        await new Promise((r) => setTimeout(r, wait))
        continue
      }

      throw lastError
    }
  }

  throw lastError ?? new Error('Stream failed after all retries')
}
