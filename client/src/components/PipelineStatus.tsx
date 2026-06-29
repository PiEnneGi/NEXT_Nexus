import { motion } from 'framer-motion'

interface Props {
  status: 'idle' | 'running' | 'complete' | 'error'
  currentAgent?: string
  agentIndex?: number
  totalAgents: number
}

const agentNames: Record<string, string> = {
  search: 'Search',
  layout: 'Layout',
  codeXml: 'Code/XML',
  shieldCheck: 'Shield',
  zap: 'Optimize',
  lock: 'Security',
  fileText: 'Docs',
  clipboardCheck: 'Verify',
}

export function PipelineStatus({ status, currentAgent, agentIndex, totalAgents }: Props) {
  if (status === 'idle') {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
        <span className="w-2 h-2 rounded-full bg-gray-600" />
        Idle
      </div>
    )
  }

  if (status === 'running') {
    return (
      <div className="flex items-center gap-2 text-xs font-mono text-[#FF6B00]">
        <motion.span
          className="w-2 h-2 rounded-full bg-[#FF6B00]"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
        Agent {agentIndex}/{totalAgents} — {agentNames[currentAgent ?? ''] ?? currentAgent}
      </div>
    )
  }

  if (status === 'complete') {
    return (
      <div className="flex items-center gap-2 text-xs font-mono text-[#33FF77]">
        <span className="w-2 h-2 rounded-full bg-[#33FF77]" />
        Complete — {totalAgents}/{totalAgents} agents
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs font-mono text-[#FF3333]">
      <span className="w-2 h-2 rounded-full bg-[#FF3333]" />
      Failed at Agent {agentIndex ?? '?'}
    </div>
  )
}
