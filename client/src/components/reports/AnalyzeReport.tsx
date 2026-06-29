import { motion } from 'framer-motion'
import { Clock, Server, ListChecks } from 'lucide-react'
import type { AnalyzeData } from '@shared/types'

interface Props {
  data: AnalyzeData
}

const priorityColor = (p: string) => {
  switch (p) {
    case 'P0': return 'text-[#FF3333] border-[#FF3333]/30 bg-[#FF3333]/10'
    case 'P1': return 'text-[#FF6B00] border-[#FF6B00]/30 bg-[#FF6B00]/10'
    case 'P2': return 'text-[#CCFF00] border-[#CCFF00]/30 bg-[#CCFF00]/10'
    default: return 'text-gray-400 border-gray-600 bg-gray-800'
  }
}

export function AnalyzeReport({ data }: Props) {
  const requirements = data?.requirements ?? []
  const services = data?.services ?? []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex gap-3">
        <div className="flex-1 bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3">
          <div className="flex items-center gap-2 text-[#33FF77] mb-2">
            <Clock size={14} />
            <span className="text-[10px] font-mono uppercase tracking-wider">RPO</span>
          </div>
          <span className="text-sm font-mono text-white">{data?.rpo ?? 'N/A'}</span>
        </div>
        <div className="flex-1 bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3">
          <div className="flex items-center gap-2 text-[#FF6B00] mb-2">
            <Clock size={14} />
            <span className="text-[10px] font-mono uppercase tracking-wider">RTO</span>
          </div>
          <span className="text-sm font-mono text-white">{data?.rto ?? 'N/A'}</span>
        </div>
      </div>

      <div className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A]">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1A1A1A]">
          <ListChecks size={13} className="text-[#FF6B00]" />
          <span className="text-[10px] font-mono text-gray-300 uppercase tracking-wider">
            Requirements ({requirements.length})
          </span>
        </div>
        <div className="divide-y divide-[#1A1A1A]">
          {requirements.map((req, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-300 font-mono truncate">{req?.name ?? ''}</p>
                <p className="text-[10px] text-gray-500 font-mono truncate">{req?.value ?? ''}</p>
              </div>
              <span
                className={`shrink-0 text-[9px] font-mono px-2 py-0.5 rounded border ${priorityColor(req?.priority)}`}
              >
                {req?.priority ?? 'N/A'}
              </span>
            </div>
          ))}
          {requirements.length === 0 && (
            <p className="text-xs text-gray-500 px-3 py-3">No requirements extracted</p>
          )}
        </div>
      </div>

      <div className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3">
        <div className="flex items-center gap-2 mb-2">
          <Server size={13} className="text-[#33FF77]" />
          <span className="text-[10px] font-mono text-gray-300 uppercase tracking-wider">
            Services ({services.length})
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {services.map((s, i) => (
            <span
              key={i}
              className="text-[10px] font-mono px-2 py-1 rounded bg-[#1A1A1A] text-gray-400"
            >
              {s}
            </span>
          ))}
          {services.length === 0 && (
            <span className="text-[10px] text-gray-500">No services listed</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
