import { motion } from 'framer-motion'
import { FileDown } from 'lucide-react'
import { PipelineStatus } from './PipelineStatus'
import type { AgentId } from '@shared/types'

interface Props {
  pipelineStatus: 'idle' | 'running' | 'complete' | 'error'
  currentAgent?: AgentId
  agentIndex?: number
  onExportPDF?: () => void
}

export function Header({
  pipelineStatus,
  currentAgent,
  agentIndex,
  onExportPDF,
}: Props) {
  return (
    <header className="fixed top-0 left-16 right-0 h-12 bg-[#0D0D0D] border-b border-[#1A1A1A] flex items-center justify-between px-5 z-40">
      <div className="flex items-center gap-4">
        <span className="text-sm font-bold text-white tracking-wide">CEREBRAS NEXUS</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A1A1A] text-[#FF6B00] border border-[#FF6B00]/30 font-mono">
          Gemma-4-31B API
        </span>
      </div>

      <div className="flex items-center gap-5">
        <PipelineStatus
          status={pipelineStatus}
          currentAgent={currentAgent}
          agentIndex={agentIndex}
          totalAgents={8}
        />
        <motion.button
          onClick={onExportPDF}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/30 hover:bg-[#FF6B00]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          whileTap={{ scale: 0.95 }}
          disabled={pipelineStatus !== 'complete'}
        >
          <FileDown size={13} />
          Export Official PDF
        </motion.button>
      </div>
    </header>
  )
}
