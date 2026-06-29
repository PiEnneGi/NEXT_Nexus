import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import type { ComplianceReport, SecurityReport, ValidationReport } from '@shared/types'

type Tab = 'compliance' | 'security' | 'validation'

interface Props {
  open: boolean
  compliance: ComplianceReport | null
  security: SecurityReport | null
  validation: ValidationReport | null
}

export function AssuranceSidebar({ open, compliance, security, validation }: Props) {
  const [tab, setTab] = useState<Tab>('compliance')

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="h-full bg-[#0D0D0D] border-l border-[#1A1A1A] overflow-hidden flex flex-col shrink-0"
        >
          <div className="flex border-b border-[#1A1A1A]">
            {(['compliance', 'security', 'validation'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 text-[10px] py-3 font-mono uppercase tracking-wider transition-colors ${
                  tab === t
                    ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t === 'compliance' ? 'GDPR' : t === 'security' ? 'Security' : 'Validation'}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto p-4">
            <AnimatePresence mode="wait">
              {tab === 'compliance' && (
                <motion.div
                  key="compliance"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Shield size={16} className={compliance?.gdpr ? 'text-[#33FF77]' : 'text-[#FF3333]'} />
                    <span className="text-xs font-mono text-gray-300">
                      GDPR {compliance?.gdpr ? 'Compliant' : 'Non-Compliant'}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {(compliance?.details ?? ['No compliance data']).map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                        <CheckCircle size={12} className="text-[#33FF77] mt-0.5 shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
              {tab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-mono text-[#33FF77]">{security?.passed ?? 0} passed</span>
                    <span className="text-xs font-mono text-[#FF3333]">{security?.failed ?? 0} failed</span>
                  </div>
                  <ul className="space-y-2">
                    {(security?.warnings ?? ['No warnings']).map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                        <AlertTriangle size={12} className="text-[#FF6B00] mt-0.5 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
              {tab === 'validation' && (
                <motion.div
                  key="validation"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    {validation?.valid ? (
                      <CheckCircle size={16} className="text-[#33FF77]" />
                    ) : (
                      <XCircle size={16} className="text-[#FF3333]" />
                    )}
                    <span className="text-xs font-mono text-gray-300">
                      {validation?.valid ? 'Valid Architecture' : 'Validation Failed'}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {(validation?.errors.length ? validation.errors : ['No errors']).map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                        <XCircle size={12} className="text-[#FF3333] mt-0.5 shrink-0" />
                        {e}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
