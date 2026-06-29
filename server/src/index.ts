import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') })

import express from 'express'
import cors from 'cors'
import multer from 'multer'
import type { Request, Response } from 'express'
import { orchestrate } from './pipeline/orchestrator.js'
import { processUploadedFile, cleanupFile } from './utils/fileProcessor.js'
import type { FileContext } from './utils/fileProcessor.js'

const app = express()
const PORT = process.env.PORT ?? 3001

const upload = multer({
  dest: '/tmp/nexus-uploads',
  limits: { fileSize: 20 * 1024 * 1024 },
})

const fileStore = new Map<string, FileContext[]>()

app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cerebras-nexus-server' })
})

app.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file provided' })
    return
  }

  try {
    const fileContexts = await processUploadedFile(req.file.path, req.file.originalname)
    const sessionId = crypto.randomUUID()
    fileStore.set(sessionId, fileContexts)

    setTimeout(() => fileStore.delete(sessionId), 10 * 60 * 1000)

    cleanupFile(req.file.path)

    res.json({
      sessionId,
      files: fileContexts.map((fc) => ({
        id: fc.id,
        name: fc.name,
        type: fc.type,
        mimeType: fc.mimeType,
        size: fc.size,
        textContent: fc.type === 'text' ? fc.textContent : undefined,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(400).json({ error: message })
  }
})

app.get('/stream', (req: Request, res: Response) => {
  const input = (req.query.input as string) ?? ''
  if (!input.trim()) {
    res.status(400).json({ error: 'Missing input query parameter' })
    return
  }

  const apiKey = process.env.CEREBRAS_API_KEY
  if (!apiKey || apiKey === 'placeholder_key_here') {
    res.status(503).json({
      error: 'CEREBRAS_API_KEY not configured. Set it in .env (see .env.example)',
    })
    return
  }

  let fileContexts: FileContext[] = []
  const fileSessionId = req.query.fileSessionId as string | undefined
  if (fileSessionId && fileStore.has(fileSessionId)) {
    fileContexts = fileStore.get(fileSessionId)!
    fileStore.delete(fileSessionId)
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  res.flushHeaders()

  const abortController = new AbortController()

  req.on('close', () => {
    abortController.abort()
  })

  const emit = (event: string, data: string) => {
    if (!res.destroyed) {
      res.write(`event: ${event}\ndata: ${data}\n\n`)
    }
  }

  orchestrate(input, emit, abortController.signal, fileContexts)
    .then(() => {
      if (!res.destroyed) res.end()
    })
    .catch((err: unknown) => {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('[Nexus] Pipeline aborted by client disconnect')
        if (!res.destroyed) res.end()
        return
      }
      const message = err instanceof Error ? err.message : String(err)
      console.error('[Nexus] Pipeline error:', message)
      if (!res.destroyed) {
        emit('error', JSON.stringify({ message }))
        res.end()
      }
    })
})

function checkEnv(name: string): string {
  const val = process.env[name]
  if (!val || val === 'placeholder_key_here') {
    console.error(`[Nexus] MISSING: ${name} — set it in .env (see .env.example)`)
    process.exit(1)
  }
  return 'configured'
}

const keyStatus = checkEnv('CEREBRAS_API_KEY')
const urlStatus = checkEnv('CEREBRAS_API_URL')
const modelStatus = checkEnv('CEREBRAS_MODEL')

app.listen(PORT, () => {
  console.log(
    `[Nexus Server] http://localhost:${PORT}  |  ` +
      `API key: ${keyStatus}  |  URL: ${urlStatus}  |  Model: ${modelStatus}`,
  )
})
