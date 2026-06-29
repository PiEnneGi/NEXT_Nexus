import { useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { Workspace } from './components/Workspace'
import { CommandBar } from './components/CommandBar'
import { AssuranceSidebar } from './components/AssuranceSidebar'
import { usePipelineStore } from './hooks/usePipelineStore'
import { exportPipelinePDF } from './lib/export'

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
  const setActiveDiffView = usePipelineStore((s) => s.setActiveDiffView)

  const handleExportPDF = useCallback(() => {
    const state = usePipelineStore.getState()
    const input = state.streamedCode
      ? state.streamedCode.slice(0, 200)
      : 'Infrastructure request'
    exportPipelinePDF(state.result, state.agentReports, input)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-[#050505] overflow-hidden">
      <Sidebar
        agentProgress={agentsState}
        selectedAgentId={selectedAgentId}
        onAgentClick={selectAgent}
      />
      <Header
        pipelineStatus={pipelineStatus}
        currentAgent={currentAgentId ?? undefined}
        agentIndex={currentAgentIndex}
        onExportPDF={handleExportPDF}
      />

      <div className="flex flex-1 pt-12 ml-16 min-h-0 min-w-0">
        <Workspace
          result={result}
          streamedCode={streamedCode}
          activeDiffView={activeDiffView}
          selectedAgentId={selectedAgentId}
        />
        <AssuranceSidebar
          open={isAssuranceOpen}
          compliance={result?.compliance ?? null}
          security={result?.security ?? null}
          validation={result?.validation ?? null}
          selectedAgentId={selectedAgentId}
          agentReports={agentReports}
          resultCode={result?.code}
          onShowMermaid={() => {
            selectAgent(null)
            toggleAssurance()
          }}
          onShowDiff={() => setActiveDiffView(true)}
        />
      </div>

      <CommandBar onSend={startPipeline} disabled={pipelineStatus === 'running'} />
    </div>
  )
}
