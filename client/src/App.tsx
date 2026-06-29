import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { Workspace } from './components/Workspace'
import { CommandBar } from './components/CommandBar'
import { AssuranceSidebar } from './components/AssuranceSidebar'
import { usePipelineStore } from './hooks/usePipelineStore'

export default function App() {
  const agentsState = usePipelineStore((s) => s.agentsState)
  const pipelineStatus = usePipelineStore((s) => s.pipelineStatus)
  const currentAgentId = usePipelineStore((s) => s.currentAgentId)
  const currentAgentIndex = usePipelineStore((s) => s.currentAgentIndex)
  const streamedCode = usePipelineStore((s) => s.streamedCode)
  const result = usePipelineStore((s) => s.result)
  const isAssuranceOpen = usePipelineStore((s) => s.isAssuranceOpen)
  const selectedAgentId = usePipelineStore((s) => s.selectedAgentId)
  const agentReports = usePipelineStore((s) => s.agentReports)
  const activeDiffView = usePipelineStore((s) => s.activeDiffView)
  const toggleAssurance = usePipelineStore((s) => s.toggleAssurance)
  const selectAgent = usePipelineStore((s) => s.selectAgent)
  const startPipeline = usePipelineStore((s) => s.startPipeline)

  return (
    <div className="h-screen flex flex-col bg-[#050505] overflow-hidden">
      <Sidebar
        agentProgress={agentsState}
        selectedAgentId={selectedAgentId}
        onAgentClick={selectAgent}
      />
      <Header
        onToggleAssurance={toggleAssurance}
        assuranceOpen={isAssuranceOpen}
        pipelineStatus={pipelineStatus}
        currentAgent={currentAgentId ?? undefined}
        agentIndex={currentAgentIndex}
      />

      <div className="flex flex-1 pt-12 ml-16 min-h-0">
        <Workspace
          result={result}
          streamedCode={streamedCode}
          activeDiffView={activeDiffView}
        />
        <AssuranceSidebar
          open={isAssuranceOpen}
          compliance={result?.compliance ?? null}
          security={result?.security ?? null}
          validation={result?.validation ?? null}
          selectedAgentId={selectedAgentId}
          agentReports={agentReports}
          onClose={() => selectAgent(null)}
        />
      </div>

      <CommandBar onSend={startPipeline} disabled={pipelineStatus === 'running'} />
    </div>
  )
}
