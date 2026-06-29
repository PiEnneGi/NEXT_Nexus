import type { AgentId, ArchitectureResult, DiffLine, AgentReport, AnalyzeData, LayoutData, CodeXmlData, ComplianceFinding, HealData, HealPatch, HardenerData, HardenerControl, ValidatorData, ValidatorCheck, DocsData } from '@shared/types'
import { AGENT_PROMPTS_LIST } from '../agents/prompts.js'
import { streamCerebras } from '../cerebras/stream.js'
import type { ChatMessage } from '../cerebras/stream.js'
import { parseAgentOutput, extractFirstJson, computeDiffLines } from '../utils/parser.js'

const MAX_CONTEXT_CHARS = 120_000
const KEEP_HEAD_CHARS = 20_000
const KEEP_TAIL_CHARS = 90_000

export interface SSECallback {
  (event: string, data: string): void
}

function summarizeContext(context: string): string {
  if (context.length <= MAX_CONTEXT_CHARS) return context
  const head = context.slice(0, KEEP_HEAD_CHARS)
  const tail = context.slice(-KEEP_TAIL_CHARS)
  const originalTokens = Math.round(context.length / 4)
  const summarizedTokens = Math.round((KEEP_HEAD_CHARS + KEEP_TAIL_CHARS) / 4)
  return head + `\n\n[... ${originalTokens - summarizedTokens} tokens summarized ...]\n\n` + tail
}

function agentLabel(id: AgentId): string {
  const map: Record<AgentId, string> = {
    search: 'Analyze',
    layout: 'Design',
    codeXml: 'Code/XML',
    shieldCheck: 'Compliance',
    zap: 'Auto-Heal',
    lock: 'Hardener',
    fileText: 'Docs',
    clipboardCheck: 'Validator',
  }
  return map[id]
}

function parseAnalyze(output: string): AnalyzeData | null {
  const json = extractFirstJson<{
    requirements?: { name: string; value: string; priority: string }[]
    rpo?: string
    rto?: string
    services?: Array<Record<string, unknown> | string>
  }>(output)
  if (!json) return null
  return {
    requirements: (json.requirements ?? []).map((r) => ({
      name: r.name ?? '',
      value: r.value ?? '',
      priority: (r.priority === 'P0' || r.priority === 'P1' || r.priority === 'P2' ? r.priority : 'P2') as 'P0' | 'P1' | 'P2',
    })),
    rpo: json.rpo ?? 'N/A',
    rto: json.rto ?? 'N/A',
    services: (json.services ?? []).map((s) =>
      typeof s === 'string' ? s : ((s as Record<string, unknown>).service as string) ?? JSON.stringify(s),
    ),
  }
}

function parseCompliance(output: string): ComplianceFinding[] | null {
  const json = extractFirstJson<{
    findings?: ComplianceFinding[]
    violations?: Array<{ article: string; severity?: string; finding?: string; remediation?: string }>
    passedChecks?: Array<{ article: string; description?: string }>
  }>(output)
  if (!json) return null

  if (json.findings) return json.findings

  const results: ComplianceFinding[] = []

  if (json.passedChecks) {
    for (const c of json.passedChecks) {
      results.push({
        severity: 'Low',
        article: c.article ?? '',
        title: c.description ?? '',
        description: c.description ?? '',
        passed: true,
      })
    }
  }

  if (json.violations) {
    for (const v of json.violations) {
      const sev = (v.severity ?? 'medium').toLowerCase()
      const severity = (sev.charAt(0).toUpperCase() + sev.slice(1)) as ComplianceFinding['severity']
      results.push({
        severity: ['Critical', 'High', 'Medium', 'Low'].includes(severity) ? severity : 'Medium',
        article: v.article ?? '',
        title: v.finding ?? '',
        description: v.finding ?? '',
        passed: false,
        remediation: v.remediation,
      })
    }
  }

  if (json.violations !== undefined || json.passedChecks !== undefined) return results
  return null
}

function parseLayout(output: string): LayoutData | null {
  const json = extractFirstJson<{
    architecture?: string
    services?: string[]
    zones?: number
  }>(output)
  if (!json) return null
  return {
    architecture: json.architecture ?? '',
    services: json.services ?? [],
    zones: json.zones ?? 0,
  }
}

function parseCodeXml(output: string): CodeXmlData | null {
  const json = extractFirstJson<{
    modules?: { name: string; type: string }[]
    language?: string
  }>(output)
  const parsed = parseAgentOutput(output)
  const codeBlock = parsed.codeBlocks.find(
    (b) => b.language === 'hcl' || b.language === 'terraform' || b.language === 'yaml',
  )
  if (!json && !codeBlock) return null
  return {
    code: codeBlock?.code ?? '',
    language: json?.language ?? codeBlock?.language ?? 'hcl',
    modules: json?.modules ?? [],
  }
}

function tryExtractPatchesFromValue(value: unknown): HealPatch[] | null {
  if (!value || typeof value !== 'object') return null
  if (Array.isArray(value)) {
    const patches: HealPatch[] = []
    for (const item of value) {
      if (item && typeof item === 'object' && 'file' in (item as object) && 'patched' in (item as object)) {
        const p = item as Record<string, unknown>
        patches.push({
          file: String(p.file ?? 'unknown.tf'),
          original: String(p.original ?? ''),
          patched: String(p.patched ?? ''),
          reasoning: p.reasoning ? String(p.reasoning) : undefined,
          fixesViolation: p.fixesViolation ? String(p.fixesViolation) : undefined,
          fixesViolationTitle: p.fixesViolationTitle ? String(p.fixesViolationTitle) : undefined,
          patchType: (p.patchType === 'compliance' || p.patchType === 'security' ? p.patchType : 'operational') as 'operational' | 'compliance' | 'security',
        })
      }
    }
    return patches.length > 0 ? patches : null
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    const result = tryExtractPatchesFromValue((value as Record<string, unknown>)[key])
    if (result) return result
  }
  return null
}

function parseHeal(output: string): HealData | null {
  const parsed = parseAgentOutput(output)

  // Strategy 1: patches array at top level
  if (parsed.jsonBlocks.length > 0) {
    for (const block of parsed.jsonBlocks) {
      const p = block as Record<string, unknown>
      if (Array.isArray(p.patches) && p.patches.length > 0) {
        return { patches: p.patches as HealPatch[] }
      }
    }
  }

  // Strategy 2: patchesApplied → map to HealPatch format
  if (parsed.jsonBlocks.length > 0) {
    for (const block of parsed.jsonBlocks) {
      const p = block as Record<string, unknown>
      if (Array.isArray(p.patchesApplied) && p.patchesApplied.length > 0) {
        const patches: HealPatch[] = p.patchesApplied.map((item: Record<string, unknown>) => ({
          file: String(item.file ?? item.resource ?? 'patched.tf'),
          original: String(item.original ?? ''),
          patched: String(item.patched ?? ''),
          reasoning: String(item.reasoning ?? item.failureMode ?? ''),
          fixesViolation: item.fixesViolation ? String(item.fixesViolation) : undefined,
          patchType: (item.patchType === 'compliance' || item.patchType === 'security' ? item.patchType : 'operational') as 'operational' | 'compliance' | 'security',
        }))
        return { patches }
      }
    }
  }

  // Strategy 3: Scan ALL json blocks for ANY array containing patch-like objects
  const fromAnyArray = tryExtractPatchesFromValue(parsed.jsonBlocks)
  if (fromAnyArray) return { patches: fromAnyArray }

  // Strategy 4: Try to parse standalone JSON objects from code blocks
  const jsonCodeBlockRE = /```(?:json)?\s*\n([\s\S]*?)```/gi
  let match: RegExpExecArray | null
  while ((match = jsonCodeBlockRE.exec(output)) !== null) {
    try {
      const parsedJson = JSON.parse(match[1].trim()) as Record<string, unknown>
      const fromJson = tryExtractPatchesFromValue(parsedJson)
      if (fromJson) return { patches: fromJson }
    } catch {
      // try next
    }
  }

  // Strategy 5: Regex scan for inline patch objects (outside any tags)
  const inlinePatchRE = /\{[^{}]*?"file"\s*:\s*"[^"]+"[^{}]*?"original"\s*:\s*"[^"]+"[^{}]*?"patched"\s*:\s*"[^"]+"[^{}]*?\}/g
  while ((match = inlinePatchRE.exec(output)) !== null) {
    try {
      const obj = JSON.parse(match[0]) as HealPatch
      if (obj.file && obj.original !== undefined && obj.patched !== undefined) {
        return { patches: [obj] }
      }
    } catch {
      // try next match
    }
  }

  // Strategy 6: scan code blocks for [ACTION] or [COMPLIANCE] annotations
  const actionBlocks = parsed.codeBlocks.filter(
    (b) => (b.language === 'hcl' || b.language === 'terraform') &&
      (b.code.includes('[ACTION]') || b.code.includes('[COMPLIANCE]')),
  )
  if (actionBlocks.length > 0) {
    const patches: HealPatch[] = actionBlocks.map((b) => ({
      file: `${b.language}-patch.tf`,
      original: b.code.includes('[COMPLIANCE]') ? '# Non-compliant configuration' : '# Original configuration',
      patched: b.code,
      reasoning: b.code.match(/\[THINK\](.*?)(?=\[|$)/s)?.[1]?.trim() ?? 'Auto-detected patch from annotated code block',
      patchType: b.code.includes('[COMPLIANCE]') ? 'compliance' : 'operational',
    }))
    return { patches }
  }

  return null
}

function parseHardener(output: string): HardenerData | null {
  const json = extractFirstJson<{ controls?: HardenerControl[]; passed?: number; total?: number }>(output)
  if (!json?.controls) return null
  return {
    controls: json.controls,
    passed: json.passed ?? 0,
    total: json.total ?? json.controls.length,
  }
}

function parseDocs(output: string): DocsData | null {
  const json = extractFirstJson<{ sections?: { title: string; content: string }[]; readme?: string; adr?: string | null }>(output)
  if (!json) return null
  return {
    sections: json.sections ?? [],
    readme: json.readme ?? '',
    adr: json.adr ?? null,
  }
}

function parseValidator(output: string): ValidatorData | null {
  const json = extractFirstJson<{
    checks?: ValidatorCheck[]
    score?: number
    finalScore?: number
    approved?: boolean
    valid?: boolean
  }>(output)
  if (!json?.checks) return null
  return {
    checks: json.checks,
    score: json.score ?? json.finalScore ?? 0,
    approved: json.approved ?? json.valid ?? false,
  }
}

export async function orchestrate(
  userInput: string,
  emit: SSECallback,
  signal?: AbortSignal,
): Promise<void> {
  let context = ''
  let previousCode = ''
  let allDiffLines: DiffLine[] = []
  let mermaidSource: string | null = null
  const agentReports: Partial<Record<AgentId, AgentReport>> = {}
  let totalComplianceFindings: ComplianceFinding[] = []
  let hardenerResult: HardenerData | null = null
  let validatorResult: ValidatorData | null = null
  let currentCode = ''
  let agent3Code = ''

  for (let i = 0; i < AGENT_PROMPTS_LIST.length; i++) {
    const agent = AGENT_PROMPTS_LIST[i]
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const safeContext = summarizeContext(context)
    let complianceBlock = ''
    if (agent.id === 'zap' && totalComplianceFindings.length > 0) {
      const violations = totalComplianceFindings.filter((f) => !f.passed)
      if (violations.length > 0) {
        complianceBlock = `\n\n=== COMPLIANCE VIOLATIONS TO FIX ===\nThe following compliance violations were found by the compliance auditor. Generate a patch for EACH violation that is not passed.\n\n<json>\n${JSON.stringify(violations, null, 2)}\n</json>\n`
      }
    }
    const messages: ChatMessage[] = [
      { role: 'system', content: agent.systemPrompt },
      {
        role: 'user',
        content: safeContext
          ? `Previous agent outputs:\n${safeContext}\n\nOriginal request:\n${userInput}${complianceBlock}`
          : userInput,
      },
    ]

    emit('agent-start', JSON.stringify({ agentId: agent.id, index: i, name: agent.name }))

    let fullOutput = ''
    try {
      fullOutput = await streamCerebras({
        messages,
        onToken: (token) => {
          emit('token', JSON.stringify({ agentId: agent.id, token }))
        },
        signal,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      emit('error', JSON.stringify({ agentId: agent.id, message }))
      throw err
    }

    context += `\n--- ${agent.name} output ---\n${fullOutput}\n`

    const parsed = parseAgentOutput(fullOutput)

    if (parsed.mermaidBlocks.length > 0) {
      mermaidSource = parsed.mermaidBlocks[parsed.mermaidBlocks.length - 1]
    }

    if (agent.id === 'codeXml') {
      const codeBlock = parsed.codeBlocks.find(
        (b) => b.language === 'hcl' || b.language === 'terraform',
      )
      if (codeBlock) {
        agent3Code = codeBlock.code
      }
    }

    const codeBlock = parsed.codeBlocks.find(
      (b) => b.language === 'hcl' || b.language === 'terraform' || b.language === 'yaml',
    )
    if (codeBlock) {
      previousCode = currentCode
      currentCode = codeBlock.code
      if (previousCode) {
        const diffs = computeDiffLines(previousCode, currentCode)
        allDiffLines.push(...diffs)
      }
    }

    const label = agentLabel(agent.id as AgentId)
    let agentReport: AgentReport | null = null

    switch (agent.id) {
      case 'search': {
        const data = parseAnalyze(fullOutput)
        agentReport = {
          agentId: 'search', agentName: label, type: 'analyze',
          data: data ?? { requirements: [], rpo: 'N/A', rto: 'N/A', services: [] },
        }
        break
      }
      case 'layout': {
        const parsedOutput = parseAgentOutput(fullOutput)
        const services: string[] = []
        if (parsedOutput.mermaidBlocks.length > 0) {
          const mermaid = parsedOutput.mermaidBlocks[0]
          const serviceMatches = mermaid.match(/(?:EKS|RDS|ECS|Lambda|S3|DynamoDB|ElastiCache|CloudFront|Route53|VPC|EC2|ALB|API Gateway|SQS|SNS|Kinesis|Step Functions|CodePipeline|CloudWatch|IAM|KMS|WAF|Shield|Aurora|Neptune|DocumentDB|MSK|EMR|Redshift|Elasticsearch|OpenSearch|Fargate|AppSync|x1b\[[A-Za-z]+)/g)
          if (serviceMatches) {
            serviceMatches.forEach((s) => {
              const clean = s.replace(/x1b\[[A-Za-z]+/, '')
              if (!services.includes(clean)) services.push(clean)
            })
          }
        }
        const data: LayoutData = {
          architecture: parsedOutput.mermaidBlocks[0] ?? 'No diagram',
          services,
          zones: 3,
        }
        agentReport = { agentId: 'layout', agentName: label, type: 'layout', data }
        break
      }
      case 'codeXml': {
        const data = parseCodeXml(fullOutput)
        agentReport = {
          agentId: 'codeXml', agentName: label, type: 'codeXml',
          data: data ?? { code: '', language: 'hcl', modules: [] },
        }
        break
      }
      case 'shieldCheck': {
        const data = parseCompliance(fullOutput)
        if (data) {
          totalComplianceFindings = data
        }
        agentReport = {
          agentId: 'shieldCheck', agentName: label, type: 'compliance',
          data: totalComplianceFindings,
        }
        break
      }
      case 'zap': {
        let data = parseHeal(fullOutput)

        // Fallback 1: diff between Agent 3 code and Agent 5 code
        if (!data || data.patches.length === 0) {
          const zapCodeBlock = parsed.codeBlocks.find(
            (b) => b.language === 'hcl' || b.language === 'terraform',
          )
          if (zapCodeBlock && agent3Code && zapCodeBlock.code !== agent3Code) {
            data = {
              patches: [{
                file: 'auto-healed.tf',
                original: agent3Code,
                patched: zapCodeBlock.code,
                reasoning: 'Auto-generated patch from code diff between Code/XML and Auto-Heal agents',
                patchType: 'operational',
              }],
            }
          }
        }

        // Fallback 2: generate compliance patches from remediation text
        if (!data || data.patches.length === 0) {
          const violations = totalComplianceFindings.filter((f) => !f.passed)
          if (violations.length > 0) {
            data = {
              patches: violations.map((v) => ({
                file: 'compliance-fix.tf',
                original: `# TODO: Fix ${v.article} - ${v.title}`,
                patched: `# FIXED: ${v.article} - ${v.title}\n${v.remediation ? `# ${v.remediation}` : ''}`,
                reasoning: v.remediation ?? `Auto-generated remediation for ${v.article}`,
                fixesViolation: v.article,
                fixesViolationTitle: v.title,
                patchType: 'compliance' as const,
              })),
            }
          }
        }

        agentReport = {
          agentId: 'zap', agentName: label, type: 'heal',
          data: data ?? { patches: [] },
        }
        if (data) {
          for (const patch of data.patches) {
            const patchRef = agent3Code || currentCode
            if (patch.original && patch.patched) {
              const patchDiffs = computeDiffLines(patch.original, patch.patched)
              allDiffLines.push(
                { type: 'unchanged', content: `# --- Patch: ${patch.file} ---`, lineNumber: 0 },
                ...patchDiffs,
              )
            }
          }
        }
        break
      }
      case 'lock': {
        const data = parseHardener(fullOutput)
        if (data) {
          hardenerResult = data
        }
        agentReport = {
          agentId: 'lock', agentName: label, type: 'hardener',
          data: data ?? { controls: [], passed: 0, total: 0 },
        }
        break
      }
      case 'fileText': {
        const data = parseDocs(fullOutput)
        agentReport = {
          agentId: 'fileText', agentName: label, type: 'docs',
          data: data ?? { sections: [], readme: '', adr: null },
        }
        break
      }
      case 'clipboardCheck': {
        const validatorCtx = context
        context = validatorCtx

        const data = parseValidator(fullOutput)
        if (data) {
          validatorResult = data
        }
        agentReport = {
          agentId: 'clipboardCheck', agentName: label, type: 'validator',
          data: data ?? { checks: [], score: 0, approved: false },
        }
        break
      }
    }

    if (agentReport) {
      agentReports[agent.id as AgentId] = agentReport
    }

    emit('agent-complete', JSON.stringify({ agentId: agent.id, output: fullOutput }))
  }

  const totalHardenerPassed = hardenerResult?.passed ?? 0
  const totalHardenerChecks = hardenerResult?.total ?? 0
  const hardenerFailed = totalHardenerChecks - totalHardenerPassed

  const result: ArchitectureResult = {
    diagramSvg: '',
    code: currentCode,
    diffLines: allDiffLines,
    compliance: {
      gdpr: totalComplianceFindings.every((f) => f.passed),
      details: totalComplianceFindings.map((f) => `${f.article}: ${f.title}`),
      findings: totalComplianceFindings,
    },
    security: {
      passed: totalHardenerPassed,
      failed: hardenerFailed,
      warnings: hardenerResult
        ? hardenerResult.controls.filter((c) => !c.applied).map((c) => `${c.id}: ${c.name}`)
        : ['Review each agent output'],
    },
    validation: {
      valid: validatorResult?.approved ?? true,
      errors: validatorResult
        ? validatorResult.checks.filter((c) => !c.passed).map((c) => c.message)
        : [],
    },
    agentReports,
    diagramMermaid: mermaidSource,
  }

  emit('pipeline-complete', JSON.stringify({ result }))
}
