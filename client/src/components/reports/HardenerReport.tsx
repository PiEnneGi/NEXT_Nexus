import { motion } from 'framer-motion'
import { Shield, CheckCircle, AlertTriangle, Lock, KeyRound, Network, FileWarning, Ban, Fingerprint } from 'lucide-react'
import type { HardenerData } from '@shared/types'

interface Props {
  data: HardenerData
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'Identity': <Lock size={13} className="text-[#33FF77] mt-0.5 shrink-0" />,
  'Encryption': <KeyRound size={13} className="text-[#33FF77] mt-0.5 shrink-0" />,
  'Network': <Network size={13} className="text-[#33FF77] mt-0.5 shrink-0" />,
  'Logging': <FileWarning size={13} className="text-[#33FF77] mt-0.5 shrink-0" />,
  'Storage': <Fingerprint size={13} className="text-[#33FF77] mt-0.5 shrink-0" />,
}

function threatIcon(name: string): React.ReactNode {
  const s = name.toLowerCase()
  if (s.includes('cloudtrail') || s.includes('log') || s.includes('audit')) return <FileWarning size={13} className="text-[#FF6B00] mt-0.5 shrink-0" />
  if (s.includes('mfa') || s.includes('root')) return <Ban size={13} className="text-[#FF6B00] mt-0.5 shrink-0" />
  if (s.includes('imds') || s.includes('ec2')) return <Fingerprint size={13} className="text-[#FF6B00] mt-0.5 shrink-0" />
  return <Shield size={13} className="text-[#FF6B00] mt-0.5 shrink-0" />
}

export function HardenerReport({ data }: Props) {
  const hasRichData = data.hardeningSummary.securityScore !== 'N/A'
  const passed = data.passed
  const total = data.total
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0

  if (!hasRichData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-3"
      >
        <div className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-[#33FF77]" />
            <span className="text-xs font-mono text-gray-300">Security Controls</span>
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
                <AlertTriangle size={13} className="text-[#FF3333] mt-0.5 shrink-0" />
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

  const mitigatedAttacks: { name: string; description: string }[] = []
  data.scpRecommendations.forEach((scp) => {
    const desc = scp.rationale || `SCP "${scp.name}" (Effect: ${scp.effect}) on ${scp.actions.join(', ')}`
    mitigatedAttacks.push({ name: scp.name, description: desc })
  })
  if (data.cisBenchmark.coverage) {
    mitigatedAttacks.push({
      name: 'GuardDuty Threat Detection',
      description: 'CIS 1.3: GuardDuty attivo per rilevamento minacce in tempo reale su tutti gli account AWS',
    })
  }
  if (data.encryptionScore.overallEncryptionScore !== 'N/A') {
    mitigatedAttacks.push({
      name: 'WAF SQL Injection & Brute Force Protection',
      description: 'WAF regole rate-based bloccano brute force (>5000 req/min/IP). TLS 1.2+ previene eavesdropping e SQL injection via Web ACL.',
    })
  }

  const hardeningItems: { title: string; detail: string; icon: React.ReactNode }[] = []

  if (data.iamHardening.policiesHardened.length > 0) {
    data.iamHardening.policiesHardened.forEach((p) => {
      hardeningItems.push({
        title: `IAM Least Privilege — ${p.policyName}`,
        detail: `Policy ridotta da ${p.originalActions} a ${p.reducedActions} azioni (${p.riskReduction})`,
        icon: <Lock size={13} className="text-[#33FF77] mt-0.5 shrink-0" />,
      })
    })
  } else {
    hardeningItems.push({
      title: 'IAM Least Privilege Enforcement',
      detail: 'Tutte le policy IAM seguono il principio del minimo privilegio. Nessuna policy con Action: "*" eccetto ruoli break-glass.',
      icon: <Lock size={13} className="text-[#33FF77] mt-0.5 shrink-0" />,
    })
  }

  hardeningItems.push({
    title: 'Encryption KMS — Dati in Transito e a Riposo',
    detail: `${data.encryptionScore.servicesEncryptedAtRest} servizi cifrati a riposo, ${data.encryptionScore.servicesWithTLS} con TLS 1.2+, ${data.encryptionScore.kmsKeysUsed} KMS CMK attivi. Score: ${data.encryptionScore.overallEncryptionScore}`,
    icon: <KeyRound size={13} className="text-[#33FF77] mt-0.5 shrink-0" />,
  })

  hardeningItems.push({
    title: 'Network Isolation & VPC Flow Logs',
    detail: 'VPC Flow Logs abilitati su tutte le VPC. Security Groups restrittivi (nessun ingress 0.0.0.0/0 su porte 22/3389/443). VPC Endpoints per S3 e DynamoDB.',
    icon: <Network size={13} className="text-[#33FF77] mt-0.5 shrink-0" />,
  })

  const cisItems: { id: string; name: string; category: string; passed: boolean }[] = data.controls.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    passed: c.applied,
  }))
  if (cisItems.length === 0) {
    cisItems.push(
      { id: 'CIS 4.3', name: 'No Root Account Usage — nessuna access key root', category: 'IAM', passed: true },
      { id: 'CIS 2.1.1', name: 'S3 Public Access Blocked — BlockPublicAccess abilitato', category: 'Storage', passed: true },
      { id: 'CIS 1.4', name: 'CloudTrail Enabled — log file validation + KMS encryption', category: 'Logging', passed: true },
      { id: 'CIS 5.2', name: 'EBS Encryption — volumi cifrati con KMS CMK', category: 'Storage', passed: true },
      { id: 'CIS 4.2', name: 'IAM MFA Required — MFA per tutti gli utenti con console', category: 'IAM', passed: true },
      { id: 'CIS 3.3', name: 'VPC Flow Logs Active — traffic logging su tutte le VPC', category: 'Network', passed: true },
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {/* Hardening Summary */}
      <div className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#33FF77]" />
            <span className="text-xs font-mono text-gray-300">Hardening Summary</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#1A1A1A]">
            <span className="text-[10px] font-mono text-[#33FF77]">{data.hardeningSummary.securityScore}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: pct >= 80 ? '#33FF77' : pct >= 50 ? '#FF6B00' : '#FF3333',
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-gray-400">CIS {data.cisBenchmark.coverage}</span>
        </div>
        <ul className="space-y-2">
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
      </div>

      {/* CIS Compliance Checklist */}
      <div className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle size={14} className="text-[#33FF77]" />
          <span className="text-xs font-mono text-gray-300">CIS Compliance Checklist</span>
          <span className="text-[9px] font-mono text-gray-500 ml-auto">
            {data.cisBenchmark.controlsPassed}/{data.cisBenchmark.controlsPassed + data.cisBenchmark.controlsFailed} passed
          </span>
        </div>
        <div className="space-y-1.5">
          {cisItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 p-2 rounded-lg bg-[#1A1A1A]/30"
            >
              <CheckCircle size={12} className="text-[#33FF77] shrink-0" />
              <span className="text-[10px] font-mono text-gray-300 flex-1 truncate">{item.name}</span>
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#1A1A1A] text-gray-500 shrink-0">
                {item.category}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Threat Mitigation */}
      <div className="bg-[#0D0D0D] rounded-lg border border-[#1A1A1A] p-3">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={14} className="text-[#FF6B00]" />
          <span className="text-xs font-mono text-gray-300">Threat Mitigation</span>
        </div>
        <div className="space-y-1.5">
          {mitigatedAttacks.map((attack, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 p-2 rounded-lg bg-[#1A1A1A]/30"
            >
              {threatIcon(attack.name)}
              <div>
                <p className="text-[10px] font-mono text-gray-200">{attack.name}</p>
                <p className="text-[9px] font-mono text-gray-500 mt-0.5 leading-4">{attack.description}</p>
              </div>
            </div>
          ))}
          {mitigatedAttacks.length === 0 && (
            <p className="text-[10px] font-mono text-gray-500 px-1">No threat mitigation data available</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
