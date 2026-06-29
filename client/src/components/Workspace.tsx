import type { ArchitectureResult, AgentId } from '@shared/types'
import { ArchitecturePanel } from './ArchitecturePanel'
import { CodeDiffPanel } from './CodeDiffPanel'

interface Props {
  result: ArchitectureResult | null
  streamedCode: string
  activeDiffView: boolean
  selectedAgentId: AgentId | null
}

export function Workspace({ result, streamedCode, activeDiffView, selectedAgentId }: Props) {
  const archFlex = selectedAgentId === 'layout' ? 'flex-[3]' : 'flex-1'
  const codeFlex = selectedAgentId === 'codeXml' ? 'flex-[3]' : 'flex-1'

  return (
    <main className="flex-1 flex gap-3 p-3 h-full min-h-0 min-w-0">
      <div className={`${archFlex} flex flex-col min-w-0`}>
        <ArchitecturePanel
          diagramSvg={result?.diagramSvg ?? null}
          diagramMermaid={result?.diagramMermaid ?? null}
        />
      </div>
      <div className={`${codeFlex} flex flex-col min-w-0`}>
        <CodeDiffPanel
          code={result?.code ?? null}
          diffLines={result?.diffLines ?? null}
          streamedCode={streamedCode}
          defaultTab={activeDiffView ? 'diff' : undefined}
        />
      </div>
    </main>
  )
}
