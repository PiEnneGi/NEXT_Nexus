import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cerebras-nexus-server' })
})

app.listen(PORT, () => {
  console.log(`[Nexus Server] Running on http://localhost:${PORT}`)
})
