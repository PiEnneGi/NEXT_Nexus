import { useState, useCallback } from 'react'
import type { ArchitectureResult, AgentId } from '@shared/types'
import { runMockPipeline } from '../lib/mock-pipeline'

type PipelineStatus = 'idle' | 'running' | 'complete' | 'error'
const AGENT_ORDER: AgentId[] = ['search', 'layout', 'codeXml', 'shieldCheck', 'zap', 'lock', 'fileText', 'clipboardCheck']

export function useMockPipeline() {
  const [result, setResult] = useState<ArchitectureResult | null>(null)
  const [running, setRunning] = useState(false)
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('idle')
  const [currentAgent, setCurrentAgent] = useState<AgentId | undefined>()
  const [agentIndex, setAgentIndex] = useState<number | undefined>()

  const execute = useCallback(async (input: string, onProgress: (id: AgentId, pct: number, status: string) => void) => {
    setRunning(true)
    setPipelineStatus('running')
    setResult(null)
    let lastAgent: AgentId | undefined

    try {
      const res = await runMockPipeline(input, (id, pct, status) => {
        if (id !== lastAgent) {
          lastAgent = id
          setCurrentAgent(id)
          setAgentIndex(AGENT_ORDER.indexOf(id) + 1)
        }
        onProgress(id, pct, status)
      })
      setResult(res)
      setPipelineStatus('complete')
    } catch {
      setPipelineStatus('error')
    } finally {
      setRunning(false)
    }
  }, [])

  return { result, running, pipelineStatus, currentAgent, agentIndex, execute }
}
