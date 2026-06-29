import { motion } from 'framer-motion'
import { Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import type { ComplianceFinding } from '@shared/types'

interface Props {
  data: ComplianceFinding[]
}

const severityBadge = (s: string) => {
  switch (s) {
    case 'Critical':
      return 'bg-[#FF3333]/20 text-[#FF3333] border-[#FF3333]/30'
    case 'High':
      return 'bg-[#FF6B00]/20 text-[#FF6B00] border-[#FF6B00]/30'
    case 'Medium':
      return 'bg-[#FFCC00]/20 text-[#FFCC00] border-[#FFCC00]/30'
    case 'Low':
      return 'bg-gray-700 text-gray-300 border-gray-600'
    default:
      return 'bg-gray-700 text-gray-300 border-gray-600'
  }
}

export function ComplianceReport({ data }: Props) {
  const passed = data.filter((f) => f.passed).length
  const total = data.length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 p-3 bg-[#0D0D0D] rounded-lg border border-[#1A1A1A]">
        <Shield size={16} className={passed === total ? 'text-[#33FF77]' : 'text-[#FF3333]'} />
        <span className="text-xs font-mono text-gray-300">
          {passed}/{total} passed
        </span>
        {passed === total ? (
          <span className="text-[10px] font-mono text-[#33FF77] ml-auto">GDPR Compliant</span>
        ) : (
          <span className="text-[10px] font-mono text-[#FF3333] ml-auto">Remediation Required</span>
        )}
      </div>

      <div className="space-y-2">
        {data.map((f, i) => (
          <div
            key={i}
            className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${severityBadge(f.severity)}`}
                  >
                    {f.severity}
                  </span>
                  {f.passed ? (
                    <CheckCircle size={12} className="text-[#33FF77] shrink-0" />
                  ) : (
                    <XCircle size={12} className="text-[#FF3333] shrink-0" />
                  )}
                </div>
                <p className="text-xs font-mono text-gray-200 truncate">{f.title}</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 font-mono mb-1">
              <span className="text-[#FF6B00]">{f.article}</span> — {f.description}
            </p>
            {!f.passed && f.remediation && (
              <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-[#1A1A1A]">
                <AlertTriangle size={10} className="text-[#FF6B00] mt-0.5 shrink-0" />
                <span className="text-[10px] text-gray-400 font-mono">{f.remediation}</span>
              </div>
            )}
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-xs text-gray-500 px-3 py-3">No compliance findings</p>
        )}
      </div>
    </motion.div>
  )
}
