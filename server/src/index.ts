import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import type { Request, Response } from 'express'
import { orchestrate } from './pipeline/orchestrator.js'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cerebras-nexus-server' })
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
      error:
        'CEREBRAS_API_KEY not configured. Set it in server/.env (see .env.example)',
    })
    return
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

  orchestrate(input, emit, abortController.signal)
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

app.listen(PORT, () => {
  const keyStatus = process.env.CEREBRAS_API_KEY
    ? process.env.CEREBRAS_API_KEY === 'placeholder_key_here'
      ? 'PLACEHOLDER — set real key in .env'
      : 'configured'
    : 'MISSING — set CEREBRAS_API_KEY in .env'
  console.log(`[Nexus Server] http://localhost:${PORT}  |  API key: ${keyStatus}`)
})
