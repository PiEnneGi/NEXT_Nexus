import { useState } from 'react'
import type { ArchitectureResult, AgentId } from '@shared/types'
import { runMockPipeline } from '../lib/mock-pipeline'

export function useMockPipeline() {
  const [result, setResult] = useState<ArchitectureResult | null>(null)
  const [running, setRunning] = useState(false)

  const execute = async (input: string, onProgress: (id: AgentId, pct: number, status: string) => void) => {
    setRunning(true)
    setResult(null)
    try {
      const res = await runMockPipeline(input, (id, pct, status) => {
        onProgress(id, pct, status)
      })
      setResult(res)
    } finally {
      setRunning(false)
    }
  }

  return { result, running, execute }
}
