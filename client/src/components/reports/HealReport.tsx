import { motion } from 'framer-motion'
import { Zap, FileCode, ArrowRight, BrainCircuit } from 'lucide-react'
import type { HealData } from '@shared/types'
import { usePipelineStore } from '../../hooks/usePipelineStore'

interface Props {
  data: HealData
}

export function HealReport({ data }: Props) {
  const setActiveDiffView = usePipelineStore((s) => s.setActiveDiffView)
  const patches = data?.patches ?? []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 p-3 bg-[#0D0D0D] rounded-lg border border-[#1A1A1A1]">
        <Zap size={16} className="text-[#FF6B00]" />
        <span className="text-xs font-mono text-gray-300">
          {patches.length} patch{patches.length !== 1 ? 'es' : ''} applied
        </span>
      </div>

      <div className="space-y-2">
        {patches.map((patch, i) => (
          <div
            key={i}
            className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#1A1A1A]">
              <div className="flex items-center gap-2">
                <FileCode size={12} className="text-gray-400" />
                <span className="text-[11px] font-mono text-gray-300">{patch.file}</span>
              </div>
              <motion.button
                onClick={() => setActiveDiffView(true)}
                className="flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded bg-[#1A1A1A] text-[#FF6B00] hover:bg-[#FF6B00]/10 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                Show Diff <ArrowRight size={10} />
              </motion.button>
            </div>

            {patch.reasoning && (
              <div className="flex items-start gap-2 px-3 py-2 border-b border-[#1A1A1A] bg-[#FF6B00]/[0.03]">
                <BrainCircuit size={12} className="text-[#FF6B00] mt-0.5 shrink-0" />
                <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
                  {patch.reasoning}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 divide-x divide-[#1A1A1A]">
              <div className="p-2">
                <p className="text-[9px] text-[#FF3333] font-mono mb-1 uppercase tracking-wider">Before</p>
                <pre className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap leading-5 max-h-20 overflow-hidden">
                  {patch.original?.slice(0, 200) ?? ''}
                  {(patch.original?.length ?? 0) > 200 ? '...' : ''}
                </pre>
              </div>
              <div className="p-2">
                <p className="text-[9px] text-[#33FF77] font-mono mb-1 uppercase tracking-wider">After</p>
                <pre className="text-[10px] text-gray-300 font-mono whitespace-pre-wrap leading-5 max-h-20 overflow-hidden">
                  {patch.patched?.slice(0, 200) ?? ''}
                  {(patch.patched?.length ?? 0) > 200 ? '...' : ''}
                </pre>
              </div>
            </div>
          </div>
        ))}
        {patches.length === 0 && (
          <p className="text-xs text-gray-500 px-3 py-3">No patches applied</p>
        )}
      </div>
    </motion.div>
  )
}
