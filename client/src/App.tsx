import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { Workspace } from './components/Workspace'
import { CommandBar } from './components/CommandBar'
import { AssuranceSidebar } from './components/AssuranceSidebar'
import { useToggle } from './hooks/useToggle'
import { useAgentProgress } from './hooks/useAgentProgress'
import { useMockPipeline } from './hooks/useMockPipeline'

export default function App() {
  const assurance = useToggle(false)
  const { agents: agentProgress, update: updateAgent } = useAgentProgress()
  const { result, running, execute } = useMockPipeline()

  const handleSend = (text: string) => {
    execute(text, (id, pct, status) => {
      updateAgent(id, pct, status as 'idle' | 'working' | 'done' | 'error')
    })
  }

  return (
    <div className="h-screen flex flex-col bg-[#050505] overflow-hidden">
      <Sidebar agentProgress={agentProgress} />
      <Header onToggleAssurance={assurance.toggle} assuranceOpen={assurance.on} />

      <div className="flex flex-1 pt-12 ml-16 min-h-0">
        <Workspace result={result} />
        <AssuranceSidebar
          open={assurance.on}
          compliance={result?.compliance ?? null}
          security={result?.security ?? null}
          validation={result?.validation ?? null}
        />
      </div>

      <CommandBar onSend={handleSend} disabled={running} />
    </div>
  )
}
