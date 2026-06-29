import { useState } from 'react'
import type { AgentId } from '@shared/types'

interface AgentState {
  progress: number
  status: 'idle' | 'working' | 'done' | 'error'
}

export function useAgentProgress() {
  const [agents, setAgents] = useState<Record<AgentId, AgentState>>({} as Record<AgentId, AgentState>)

  const update = (id: AgentId, progress: number, status: AgentState['status']) => {
    setAgents((prev) => ({ ...prev, [id]: { progress, status } }))
  }

  const reset = () => setAgents({} as Record<AgentId, AgentState>)

  return { agents, update, reset }
}
