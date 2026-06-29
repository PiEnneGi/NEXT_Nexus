import { create } from 'zustand'
import type { AgentId, ArchitectureResult } from '@shared/types'

export interface AgentState {
  progress: number
  status: 'idle' | 'working' | 'done' | 'error'
}

interface PipelineStore {
  agentsState: Record<AgentId, AgentState>
  pipelineStatus: 'idle' | 'running' | 'complete' | 'error'
  currentAgentId: AgentId | null
  currentAgentIndex: number
  streamedCode: string
  result: ArchitectureResult | null
  isAssuranceOpen: boolean

  updateAgent: (id: AgentId, progress: number, status: AgentState['status']) => void
  addCodeLine: (line: string) => void
  setResult: (result: ArchitectureResult) => void
  setPipelineStatus: (status: PipelineStore['pipelineStatus']) => void
  setCurrentAgent: (id: AgentId | null, index: number) => void
  toggleAssurance: () => void
  reset: () => void
}

const initialAgentState: AgentState = { progress: 0, status: 'idle' }

const ALL_AGENTS: AgentId[] = [
  'search', 'layout', 'codeXml', 'shieldCheck',
  'zap', 'lock', 'fileText', 'clipboardCheck',
]

const initialAgentsState = () =>
  Object.fromEntries(ALL_AGENTS.map((id) => [id, { ...initialAgentState }])) as Record<AgentId, AgentState>

export const usePipelineStore = create<PipelineStore>((set) => ({
  agentsState: initialAgentsState(),
  pipelineStatus: 'idle',
  currentAgentId: null,
  currentAgentIndex: 0,
  streamedCode: '',
  result: null,
  isAssuranceOpen: false,

  updateAgent: (id, progress, status) =>
    set((s) => ({
      agentsState: { ...s.agentsState, [id]: { progress, status } },
    })),

  addCodeLine: (line) =>
    set((s) => ({
      streamedCode: s.streamedCode + line + '\n',
    })),

  setResult: (result) => set({ result }),

  setPipelineStatus: (pipelineStatus) => set({ pipelineStatus }),

  setCurrentAgent: (currentAgentId, currentAgentIndex) =>
    set({ currentAgentId, currentAgentIndex }),

  toggleAssurance: () => set((s) => ({ isAssuranceOpen: !s.isAssuranceOpen })),

  reset: () =>
    set({
      agentsState: initialAgentsState(),
      pipelineStatus: 'idle',
      currentAgentId: null,
      currentAgentIndex: 0,
      streamedCode: '',
      result: null,
    }),
}))
