import type { ArchitectureResult } from '@shared/types'
import { ArchitecturePanel } from './ArchitecturePanel'
import { CodeDiffPanel } from './CodeDiffPanel'

interface Props {
  result: ArchitectureResult | null
}

export function Workspace({ result }: Props) {
  return (
    <main className="flex-1 flex gap-3 p-3 h-full min-h-0">
      <ArchitecturePanel diagramSvg={result?.diagramSvg ?? null} />
      <CodeDiffPanel code={result?.code ?? null} diffLines={result?.diffLines ?? null} />
    </main>
  )
}
