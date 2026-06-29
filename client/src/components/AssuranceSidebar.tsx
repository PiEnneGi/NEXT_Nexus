import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, CheckCircle, AlertTriangle, XCircle, ArrowLeft } from 'lucide-react'
import type { ComplianceReport, SecurityReport, ValidationReport, AgentReport, AgentId } from '@shared/types'
import { AnalyzeReport } from './reports/AnalyzeReport'
import { ComplianceReport as ComplianceReportView } from './reports/ComplianceReport'
import { HealReport } from './reports/HealReport'
import { HardenerReport } from './reports/HardenerReport'
import { DocsReport } from './reports/DocsReport'
import { ValidatorReport } from './reports/ValidatorReport'

type Tab = 'compliance' | 'security' | 'validation'

const AGENT_LABELS: Record<AgentId, string> = {
  search: 'Analyze',
  layout: 'Design',
  codeXml: 'Code/XML',
  shieldCheck: 'Compliance',
  zap: 'Auto-Heal',
  lock: 'Hardener',
  fileText: 'Docs',
  clipboardCheck: 'Validator',
}

interface Props {
  open: boolean
  compliance: ComplianceReport | null
  security: SecurityReport | null
  validation: ValidationReport | null
  selectedAgentId: AgentId | null
  agentReports: Partial<Record<AgentId, AgentReport>>
  onClose: () => void
}

export function AssuranceSidebar({
  open,
  compliance,
  security,
  validation,
  selectedAgentId,
  agentReports,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>('compliance')

  const isShowingAgentReport = selectedAgentId !== null
  const selectedReport = selectedAgentId ? agentReports[selectedAgentId] : undefined

  const renderAgentReport = () => {
    if (!selectedReport) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <p className="text-xs font-mono">No report available for this agent</p>
        </div>
      )
    }

    switch (selectedReport.type) {
      case 'analyze':
        return <AnalyzeReport data={selectedReport.data as any} />
      case 'compliance':
        return <ComplianceReportView data={selectedReport.data as any} />
      case 'heal':
        return <HealReport data={selectedReport.data as any} />
      case 'hardener':
        return <HardenerReport data={selectedReport.data as any} />
      case 'docs':
        return <DocsReport data={selectedReport.data as any} />
      case 'validator':
        return <ValidatorReport data={selectedReport.data as any} />
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-xs font-mono">Unknown report type</p>
          </div>
        )
    }
  }

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
          {isShowingAgentReport ? (
            <>
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#1A1A1A]">
                <motion.button
                  onClick={onClose}
                  className="flex items-center gap-1 text-[10px] font-mono text-gray-400 hover:text-white transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft size={12} />
                  Back
                </motion.button>
                <span className="text-[11px] font-mono text-[#FF6B00] ml-auto">
                  {selectedAgentId ? AGENT_LABELS[selectedAgentId] : ''}
                </span>
              </div>
              <div className="flex-1 overflow-auto p-3">
                {renderAgentReport()}
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
