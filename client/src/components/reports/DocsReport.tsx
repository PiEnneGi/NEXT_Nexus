import { motion } from 'framer-motion'
import { FileText, BookOpen, Files } from 'lucide-react'
import type { DocsData } from '@shared/types'

interface Props {
  data: DocsData
}

export function DocsReport({ data }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 p-3 bg-[#0D0D0D] rounded-lg border border-[#1A1A1A]">
        <FileText size={16} className="text-[#33FF77]" />
        <span className="text-xs font-mono text-gray-300">
          {data.sections.length} section{data.sections.length !== 1 ? 's' : ''}
        </span>
        {data.adr && (
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#1A1A1A] text-[#FF6B00] ml-auto">
            ADR ✓
          </span>
        )}
      </div>

      {data.readme && (
        <div className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={13} className="text-[#CCFF00]" />
            <span className="text-[10px] font-mono text-gray-300 uppercase tracking-wider">README</span>
          </div>
          <pre className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap leading-5 max-h-32 overflow-y-auto">
            {data.readme}
          </pre>
        </div>
      )}

      <div className="space-y-2">
        {data.sections.map((section, i) => (
          <div key={i} className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Files size={12} className="text-gray-500" />
              <span className="text-[11px] font-mono text-gray-300">{section.title}</span>
            </div>
            <p className="text-[10px] text-gray-500 font-mono leading-5">
              {section.content.length > 200
                ? section.content.slice(0, 200) + '...'
                : section.content}
            </p>
          </div>
        ))}
        {data.sections.length === 0 && !data.readme && (
          <p className="text-xs text-gray-500 px-3 py-3">No documentation generated</p>
        )}
      </div>
    </motion.div>
  )
}
