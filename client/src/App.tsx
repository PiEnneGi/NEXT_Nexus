import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { Workspace } from './components/Workspace'
import { CommandBar } from './components/CommandBar'
import { AssuranceSidebar } from './components/AssuranceSidebar'
import { usePipelineStore } from './hooks/usePipelineStore'
import { startMockPipeline } from './lib/mock-pipeline'

export default function App() {
  const agentsState = usePipelineStore((s) => s.agentsState)
  const pipelineStatus = usePipelineStore((s) => s.pipelineStatus)
  const currentAgentId = usePipelineStore((s) => s.currentAgentId)
  const currentAgentIndex = usePipelineStore((s) => s.currentAgentIndex)
  const streamedCode = usePipelineStore((s) => s.streamedCode)
  const result = usePipelineStore((s) => s.result)
  const isAssuranceOpen = usePipelineStore((s) => s.isAssuranceOpen)
  const toggleAssurance = usePipelineStore((s) => s.toggleAssurance)
  const updateAgent = usePipelineStore((s) => s.updateAgent)
  const addCodeLine = usePipelineStore((s) => s.addCodeLine)
  const setResult = usePipelineStore((s) => s.setResult)
  const setPipelineStatus = usePipelineStore((s) => s.setPipelineStatus)
  const setCurrentAgent = usePipelineStore((s) => s.setCurrentAgent)
  const reset = usePipelineStore((s) => s.reset)

  const startPipeline = (input: string) => {
    reset()
    setPipelineStatus('running')

    startMockPipeline(
      (line) => addCodeLine(line),
      (id, pct, status) => {
        if (status === 'working' && usePipelineStore.getState().currentAgentId !== id) {
          setCurrentAgent(id, AGENT_ORDER.indexOf(id) + 1)
        }
        updateAgent(id, pct, status as 'idle' | 'working' | 'done' | 'error')
      },
      (archResult) => {
        setResult(archResult)
        setPipelineStatus('complete')
      },
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#050505] overflow-hidden">
      <Sidebar agentProgress={agentsState} />
      <Header
        onToggleAssurance={toggleAssurance}
        assuranceOpen={isAssuranceOpen}
        pipelineStatus={pipelineStatus}
        currentAgent={currentAgentId ?? undefined}
        agentIndex={currentAgentIndex}
      />

      <div className="flex flex-1 pt-12 ml-16 min-h-0">
        <Workspace result={result} streamedCode={streamedCode} />
        <AssuranceSidebar
          open={isAssuranceOpen}
          compliance={result?.compliance ?? null}
          security={result?.security ?? null}
          validation={result?.validation ?? null}
        />
      </div>

      <CommandBar onSend={startPipeline} disabled={pipelineStatus === 'running'} />
    </div>
  )
}

const AGENT_ORDER = ['search', 'layout', 'codeXml', 'shieldCheck', 'zap', 'lock', 'fileText', 'clipboardCheck'] as const
