import { create } from 'zustand'
import type { AgentId, ArchitectureResult, AgentReport } from '@shared/types'

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
  selectedAgentId: AgentId | null
  agentReports: Partial<Record<AgentId, AgentReport>>
  activeDiffView: boolean

  updateAgent: (id: AgentId, progress: number, status: AgentState['status']) => void
  appendOutput: (text: string) => void
  setResult: (result: ArchitectureResult) => void
  setPipelineStatus: (status: PipelineStore['pipelineStatus']) => void
  setCurrentAgent: (id: AgentId | null, index: number) => void
  toggleAssurance: () => void
  selectAgent: (id: AgentId | null) => void
  setActiveDiffView: (active: boolean) => void
  reset: () => void
  startPipeline: (input: string) => void
}

const initialAgentState: AgentState = { progress: 0, status: 'idle' }

const ALL_AGENTS: AgentId[] = [
  'search', 'layout', 'codeXml', 'shieldCheck',
  'zap', 'lock', 'fileText', 'clipboardCheck',
]

const initialAgentsState = () =>
  Object.fromEntries(ALL_AGENTS.map((id) => [id, { ...initialAgentState }])) as Record<AgentId, AgentState>

let activeSource: EventSource | null = null
let flushTimer: ReturnType<typeof setInterval> | null = null
let tokenBuffer: string[] = []

function cleanupPipeline() {
  if (activeSource) {
    activeSource.close()
    activeSource = null
  }
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
  tokenBuffer = []
}

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  agentsState: initialAgentsState(),
  pipelineStatus: 'idle',
  currentAgentId: null,
  currentAgentIndex: 0,
  streamedCode: '',
  result: null,
  isAssuranceOpen: false,
  selectedAgentId: null,
  agentReports: {},
  activeDiffView: false,

  updateAgent: (id, progress, status) =>
    set((s) => ({
      agentsState: { ...s.agentsState, [id]: { progress, status } },
    })),

  appendOutput: (text) =>
    set((s) => ({
      streamedCode: s.streamedCode + text,
    })),

  setResult: (result) =>
    set((s) => ({
      result,
      agentReports: result.agentReports ?? {},
    })),

  setPipelineStatus: (pipelineStatus) => set({ pipelineStatus }),

  setCurrentAgent: (currentAgentId, currentAgentIndex) =>
    set({ currentAgentId, currentAgentIndex }),

  toggleAssurance: () => set((s) => ({ isAssuranceOpen: !s.isAssuranceOpen })),

  selectAgent: (id) =>
    set((s) => ({
      selectedAgentId: s.selectedAgentId === id ? null : id,
      isAssuranceOpen: s.selectedAgentId === id ? false : true,
      activeDiffView: s.selectedAgentId === id ? false : id === 'zap',
    })),

  setActiveDiffView: (active) => set({ activeDiffView: active }),

  reset: () => {
    cleanupPipeline()
    set({
      agentsState: initialAgentsState(),
      pipelineStatus: 'idle',
      currentAgentId: null,
      currentAgentIndex: 0,
      streamedCode: '',
      result: null,
      isAssuranceOpen: false,
      selectedAgentId: null,
      agentReports: {},
      activeDiffView: false,
    })
  },

  startPipeline: (input: string) => {
    cleanupPipeline()

    const store = get()
    store.reset()
    store.setPipelineStatus('running')

    const source = new EventSource(`/stream?input=${encodeURIComponent(input)}`)
    activeSource = source

    source.addEventListener('agent-start', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      store.setCurrentAgent(data.agentId as AgentId, data.index + 1)
      store.updateAgent(data.agentId as AgentId, 0, 'working')

      if (!flushTimer) {
        flushTimer = setInterval(() => {
          if (tokenBuffer.length > 0) {
            const batch = tokenBuffer.splice(0, tokenBuffer.length).join('')
            store.appendOutput(batch)
          }
        }, 32)
      }
    })

    source.addEventListener('token', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      tokenBuffer.push(data.token)
    })

    source.addEventListener('agent-complete', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      store.updateAgent(data.agentId as AgentId, 100, 'done')
    })

    source.addEventListener('pipeline-complete', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      if (flushTimer) {
        clearInterval(flushTimer)
        flushTimer = null
      }
      if (tokenBuffer.length > 0) {
        store.appendOutput(tokenBuffer.splice(0, tokenBuffer.length).join(''))
      }
      store.setResult(data.result)
      store.setPipelineStatus('complete')
      source.close()
      activeSource = null
    })

    source.addEventListener('error', () => {
      if (get().pipelineStatus === 'running') {
        cleanupPipeline()
        store.setPipelineStatus('error')
      }
    })
  },
}))
