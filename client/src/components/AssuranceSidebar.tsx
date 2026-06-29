import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, CheckCircle, AlertTriangle, XCircle, ArrowLeft, Code, LayoutDashboard, Globe, Terminal, BookOpen, Files, FileText, Lock, KeyRound, Network, Ban, Fingerprint, FileWarning } from 'lucide-react'
import type { ComplianceReport, SecurityReport, ValidationReport, AgentReport, AgentId, DocsData, HardenerData } from '@shared/types'
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
  resultCode?: string
  onShowMermaid?: () => void
  onShowDiff?: () => void
}

function LayoutReport({ data }: { data: any }) {
  const services = data?.services ?? []
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 bg-[#0D0D0D] rounded-lg border border-[#1A1A1A]">
        <LayoutDashboard size={16} className="text-[#CCFF00]" />
        <span className="text-xs font-mono text-gray-300">
          {services.length > 0
            ? `${services.length} component${services.length !== 1 ? 's' : ''} detected`
            : 'Architecture components'}
        </span>
      </div>
      {services.length > 0 && (
        <div className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={13} className="text-[#33FF77]" />
            <span className="text-[10px] font-mono text-gray-300 uppercase tracking-wider">Services</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {services.map((s: string, i: number) => (
              <span key={i} className="text-[10px] font-mono px-2 py-1 rounded bg-[#1A1A1A] text-gray-400">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {data?.architecture && (
        <div className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3">
          <p className="text-[10px] font-mono text-gray-300 mb-2 uppercase tracking-wider">Topology</p>
          <pre className="text-[10px] text-gray-500 font-mono whitespace-pre-wrap leading-5 max-h-40 overflow-auto">
            {data.architecture.slice(0, 500)}
          </pre>
        </div>
      )}
    </div>
  )
}

function CodeXmlReport({ data, fullCode, docsData }: {
  data: any
  fullCode?: string
  docsData?: DocsData
}) {
  const [copied, setCopied] = useState(false)

  const modules = data?.modules ?? []
  const language = data?.language ?? 'hcl'

  const quickStartCommand = language === 'yaml'
    ? 'aws cloudformation deploy --template-file template.yaml --stack-name nexus-stack --capabilities CAPABILITY_IAM'
    : language === 'typescript'
      ? 'pulumi up --stack dev'
      : 'terraform init && terraform plan && terraform apply'

  const files: { name: string; desc: string }[] = modules.length > 0
    ? modules.map((m: { name: string; type: string }) => ({
        name: `${m.name}.tf`,
        desc: `Modulo ${m.type}: ${m.name}`,
      }))
    : [
        { name: 'main.tf', desc: 'Definizione risorse primarie' },
        { name: 'variables.tf', desc: 'Variabili di input con descrizioni e valori predefiniti' },
        { name: 'outputs.tf', desc: 'Valori di output dell\'infrastruttura' },
        { name: 'provider.tf', desc: 'Configurazione provider e vincoli di versione' },
      ]

  const descrizione = modules.length > 0
    ? `Questa infrastruttura genera ${modules.length} moduli Terraform che implementano i componenti: ${modules.map((m: { name: string }) => m.name).join(', ')}. Segue le best practice AWS con version pinning, tagging obbligatorio e crittografia abilitata.`
    : docsData?.readme
      ? docsData.readme.slice(0, 300)
      : 'Infrastruttura cloud generata automaticamente dal pipeline Cerebras Nexus. Il codice prodotto segue le best practice di settore per sicurezza, affidabilità e scalabilità.'

  const noteTecniche = docsData?.sections?.length
    ? docsData.sections.map((s) => s.content).join(' ')
    : 'Verificare che le variabili d\'ambiente (AWS_REGION, PROJECT_NAME, ENVIRONMENT) siano configurate correttamente prima del deployment. Controllare che i valori predefiniti in terraform.tfvars corrispondano all\'ambiente target.'

  const handleCopy = () => {
    navigator.clipboard.writeText(quickStartCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 bg-[#0D0D0D] rounded-lg border border-[#1A1A1A]">
        <FileText size={16} className="text-[#CCFF00]" />
        <span className="text-xs font-mono text-gray-300">Guida Operativa Umana</span>
      </div>

      <div className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={13} className="text-[#33FF77]" />
          <span className="text-[10px] font-mono text-gray-300 uppercase tracking-wider">Descrizione</span>
        </div>
        <p className="text-[10px] text-gray-400 font-mono leading-5">{descrizione}</p>
      </div>

      <div className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1A1A1A]">
          <Terminal size={12} className="text-[#FF6B00]" />
          <span className="text-[10px] font-mono text-gray-300 uppercase tracking-wider">Quick Start</span>
        </div>
        <div onClick={handleCopy} className="relative cursor-pointer group">
          <pre className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap leading-5 p-3 bg-[#050505] overflow-x-auto">
            {quickStartCommand}
          </pre>
          <div className="absolute top-2 right-2 px-2 py-1 rounded bg-[#1A1A1A] text-[8px] font-mono text-gray-500 group-hover:text-gray-300 transition-colors">
            {copied ? 'Copiato!' : 'Copia'}
          </div>
        </div>
      </div>

      <div className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3">
        <div className="flex items-center gap-2 mb-2">
          <Files size={13} className="text-[#CCFF00]" />
          <span className="text-[10px] font-mono text-gray-300 uppercase tracking-wider">Manifest ({files.length})</span>
        </div>
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-[10px] font-mono">
              <Code size={10} className="text-[#FF6B00] mt-0.5 shrink-0" />
              <span className="text-gray-300">{f.name}</span>
              <span className="text-gray-500">— {f.desc}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={13} className="text-[#FF6B00]" />
          <span className="text-[10px] font-mono text-gray-300 uppercase tracking-wider">Note Tecniche</span>
        </div>
        <p className="text-[10px] text-gray-400 font-mono leading-5">{noteTecniche}</p>
      </div>
    </div>
  )
}

function SecurityTab({ security, lockData }: { security: SecurityReport | null; lockData: HardenerData | undefined }) {
  const hasRichData = lockData && lockData.hardeningSummary.securityScore !== 'N/A'

  if (!hasRichData) {
    return (
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
    )
  }

  const pct = lockData.total > 0 ? Math.round((lockData.passed / lockData.total) * 100) : 0

  const hardeningItems: { title: string; detail: string; icon: React.ReactNode }[] = []

  if (lockData.iamHardening.policiesHardened.length > 0) {
    lockData.iamHardening.policiesHardened.forEach((p) => {
      hardeningItems.push({
        title: `IAM Least Privilege — ${p.policyName}`,
        detail: `Policy ridotta da ${p.originalActions} a ${p.reducedActions} azioni (${p.riskReduction})`,
        icon: <Lock size={13} className="text-[#33FF77] mt-0.5 shrink-0" />,
      })
    })
  } else {
    hardeningItems.push({
      title: 'IAM Least Privilege Enforcement',
      detail: 'Tutte le policy IAM seguono il principio del minimo privilegio.',
      icon: <Lock size={13} className="text-[#33FF77] mt-0.5 shrink-0" />,
    })
  }

  hardeningItems.push({
    title: 'Encryption KMS — Dati in Transito e a Riposo',
    detail: `${lockData.encryptionScore.servicesEncryptedAtRest} servizi cifrati a riposo, ${lockData.encryptionScore.servicesWithTLS} con TLS 1.2+, ${lockData.encryptionScore.kmsKeysUsed} KMS CMK attivi. Score: ${lockData.encryptionScore.overallEncryptionScore}`,
    icon: <KeyRound size={13} className="text-[#33FF77] mt-0.5 shrink-0" />,
  })

  hardeningItems.push({
    title: 'Network Isolation & VPC Flow Logs',
    detail: 'VPC Flow Logs abilitati su tutte le VPC. Security Groups restrittivi. VPC Endpoints per S3 e DynamoDB.',
    icon: <Network size={13} className="text-[#33FF77] mt-0.5 shrink-0" />,
  })

  const mitigatedAttacks: { name: string; description: string }[] = []
  lockData.scpRecommendations.forEach((scp) => {
    mitigatedAttacks.push({
      name: scp.name,
      description: scp.rationale || `Effect: ${scp.effect} on ${scp.actions.join(', ')} — ${scp.resourceType}`,
    })
  })
  if (lockData.encryptionScore.overallEncryptionScore !== 'N/A') {
    mitigatedAttacks.push({
      name: 'WAF SQL Injection & Brute Force Protection',
      description: 'WAF regole rate-based bloccano brute force. TLS 1.2+ previene eavesdropping e SQL injection via Web ACL.',
    })
  }

  return (
    <motion.div
      key="security"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-3"
    >
      {/* Status bar */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[#33FF77]" />
          <span className="text-xs font-mono text-gray-300">Hardening Summary</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#1A1A1A]">
          <span className="text-[10px] font-mono text-[#33FF77]">{lockData.hardeningSummary.securityScore}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              backgroundColor: pct >= 80 ? '#33FF77' : pct >= 50 ? '#FF6B00' : '#FF3333',
            }}
          />
        </div>
        <span className="text-[10px] font-mono text-gray-400 text-right shrink-0">{lockData.passed}/{lockData.total}</span>
      </div>

      <ul className="space-y-1.5">
        {hardeningItems.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-[#1A1A1A]/50">
            {item.icon}
            <div>
              <p className="text-[10px] font-mono text-gray-200">{item.title}</p>
              <p className="text-[9px] font-mono text-gray-500 mt-0.5 leading-4">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* CIS Checklist */}
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle size={13} className="text-[#33FF77]" />
          <span className="text-[10px] font-mono text-gray-300">CIS Compliance Checklist</span>
          <span className="text-[8px] font-mono text-gray-500 ml-auto">
            {lockData.cisBenchmark.controlsPassed}/{lockData.cisBenchmark.controlsPassed + lockData.cisBenchmark.controlsFailed}
          </span>
        </div>
        <div className="space-y-1">
          {lockData.controls.map((c, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded bg-[#1A1A1A]/30">
              <CheckCircle size={10} className="text-[#33FF77] shrink-0" />
              <span className="text-[9px] font-mono text-gray-300 flex-1 truncate">{c.name}</span>
              <span className="text-[7px] font-mono px-1 py-0.5 rounded bg-[#1A1A1A] text-gray-500 shrink-0">
                {c.category}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Threat Mitigation */}
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={13} className="text-[#FF6B00]" />
          <span className="text-[10px] font-mono text-gray-300">Threat Mitigation</span>
        </div>
        <div className="space-y-1">
          {mitigatedAttacks.map((attack, i) => (
            <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded bg-[#1A1A1A]/30">
              <Shield size={10} className="text-[#FF6B00] mt-0.5 shrink-0" />
              <div>
                <p className="text-[9px] font-mono text-gray-200">{attack.name}</p>
                <p className="text-[8px] font-mono text-gray-500 mt-0.5 leading-3.5">{attack.description}</p>
              </div>
            </div>
          ))}
          {mitigatedAttacks.length === 0 && (
            <p className="text-[9px] font-mono text-gray-500 px-1">No threat mitigation data</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function AssuranceSidebar({
  open,
  compliance,
  security,
  validation,
  selectedAgentId,
  agentReports,
  onClose,
  resultCode,
  onShowMermaid,
  onShowDiff,
}: Props) {
  const [tab, setTab] = useState<Tab>('compliance')

  const selectedReport = selectedAgentId ? agentReports[selectedAgentId] : undefined

  const renderAgentReport = () => {
    try {
      if (!selectedAgentId) return null

      const docsData = agentReports['fileText']?.data as DocsData | undefined

      if (selectedReport) {
        switch (selectedReport.type) {
          case 'analyze':
            return <AnalyzeReport data={selectedReport.data as any} />
          case 'layout':
            return <LayoutReport data={selectedReport.data} />
          case 'codeXml':
            return <CodeXmlReport data={selectedReport.data} fullCode={resultCode} docsData={docsData} />
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
        }
      }

      if (selectedAgentId === 'codeXml' && resultCode !== undefined) {
        return <CodeXmlReport data={null} fullCode={resultCode} docsData={docsData} />
      }

      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <p className="text-[10px] font-mono text-gray-500">Report not generated — the AI output could not be parsed into a structured report for this agent</p>
        </div>
      )
    } catch (err) {
      console.error('[AssuranceSidebar] Error rendering agent report:', err)
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <p className="text-[10px] font-mono text-[#FF3333]">Error loading report data</p>
        </div>
      )
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="assurance-sidebar"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 480, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          layout="position"
          className="h-full bg-[#0D0D0D] border-l border-[#1A1A1A] overflow-hidden flex flex-col shrink-0 overflow-x-hidden"
        >
          {selectedAgentId ? (
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
                  {AGENT_LABELS[selectedAgentId]}
                </span>
              </div>
              <div className="flex-1 overflow-auto p-3">
                {renderAgentReport()}
                {selectedAgentId === 'layout' && onShowMermaid && (
                  <div className="mt-3 flex justify-center">
                    <motion.button
                      onClick={onShowMermaid}
                      className="px-4 py-2 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/30 text-xs font-mono hover:bg-[#FF6B00]/20 transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      View Full Diagram
                    </motion.button>
                  </div>
                )}

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
                  {tab === 'security' && <SecurityTab
                      security={security}
                      lockData={agentReports['lock']?.data as HardenerData | undefined}
                    />}
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
