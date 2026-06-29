import { motion } from 'framer-motion'
import { Lock, CheckCircle, XCircle, Shield } from 'lucide-react'
import type { HardenerData } from '@shared/types'

interface Props {
  data: HardenerData
}

export function HardenerReport({ data }: Props) {
  const passed = data.passed
  const total = data.total
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      <div className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-[#33FF77]" />
          <span className="text-xs font-mono text-gray-300">
            Security Controls
          </span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: pct >= 80 ? '#33FF77' : pct >= 50 ? '#FF6B00' : '#FF3333',
              }}
            />
          </div>
          <span className="text-xs font-mono text-gray-300">{pct}%</span>
        </div>
        <div className="flex gap-3 text-[10px] font-mono">
          <span className="text-[#33FF77]">{passed} passed</span>
          <span className="text-[#FF3333]">{total - passed} failed</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {data.controls.map((c, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 p-2.5 bg-[#0D0D0D] rounded-lg border border-[#1A1A1A]"
          >
            {c.applied ? (
              <CheckCircle size={13} className="text-[#33FF77] mt-0.5 shrink-0" />
            ) : (
              <XCircle size={13} className="text-[#FF3333] mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono text-gray-300 truncate">{c.name}</span>
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#1A1A1A] text-gray-500 shrink-0">
                  {c.category}
                </span>
              </div>
              <p className="text-[9px] text-gray-500 font-mono truncate">{c.description}</p>
            </div>
          </div>
        ))}
        {data.controls.length === 0 && (
          <p className="text-xs text-gray-500 px-3 py-3">No security controls data</p>
        )}
      </div>
    </motion.div>
  )
}
