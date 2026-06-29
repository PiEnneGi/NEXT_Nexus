import { motion } from 'framer-motion'
import { ClipboardCheck, CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import type { ValidatorData } from '@shared/types'

interface Props {
  data: ValidatorData
}

export function ValidatorReport({ data }: Props) {
  const checks = data?.checks ?? []
  const passed = checks.filter((c) => c.passed).length
  const total = checks.length
  const displayScore =
    (data?.score ?? 0) > 0
      ? data.score
      : total > 0
        ? Math.round((passed / total) * 100)
        : 0

  const status =
    displayScore >= 80
      ? { label: 'Approved', color: '#33FF77' }
      : displayScore >= 60
        ? { label: 'Warning', color: '#FF6B00' }
        : { label: 'Rejected', color: '#FF3333' }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      <div className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={16} style={{ color: status.color }} />
            <span className="text-xs font-mono text-gray-300">
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp size={13} style={{ color: status.color }} />
            <span
              className="text-sm font-mono"
              style={{ color: status.color }}
            >
              {displayScore}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${displayScore}%`,
                backgroundColor: status.color,
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            {passed}/{total}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {checks.map((check, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 p-2.5 bg-[#0D0D0D] rounded-lg border border-[#1A1A1A]"
          >
            {check.passed ? (
              <CheckCircle size={13} className="text-[#33FF77] mt-0.5 shrink-0" />
            ) : (
              <XCircle size={13} className="text-[#FF3333] mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-mono text-gray-300 truncate">{check.name}</span>
                <span className="text-[9px] font-mono text-gray-500 shrink-0">
                  (x{check.weight})
                </span>
              </div>
              <p className="text-[9px] text-gray-500 font-mono">{check.message}</p>
            </div>
          </div>
        ))}
        {checks.length === 0 && (
          <p className="text-xs text-gray-500 px-3 py-3">No validation checks</p>
        )}
      </div>
    </motion.div>
  )
}
