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
  const json = extractFirstJson<{ findings?: ComplianceFinding[] }>(output)
  if (!json?.findings) return null
  return json.findings
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
  if (!json) return null
  const parsed = parseAgentOutput(output)
  const codeBlock = parsed.codeBlocks.find(
    (b) => b.language === 'hcl' || b.language === 'terraform' || b.language === 'yaml',
  )
  return {
    code: codeBlock?.code ?? '',
    language: json.language ?? codeBlock?.language ?? 'hcl',
    modules: json.modules ?? [],
  }
}

function parseHeal(output: string): HealData | null {
  const json = extractFirstJson<{ patches?: HealPatch[] }>(output)
  if (!json?.patches) return null
  return { patches: json.patches }
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
    const messages: ChatMessage[] = [
      { role: 'system', content: agent.systemPrompt },
      {
        role: 'user',
        content: safeContext
          ? `Previous agent outputs:\n${safeContext}\n\nOriginal request:\n${userInput}`
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
        if (data) {
          agentReport = { agentId: 'search', agentName: label, type: 'analyze', data }
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
        if (data) {
          agentReport = { agentId: 'codeXml', agentName: label, type: 'codeXml', data }
        }
        break
      }
      case 'shieldCheck': {
        const data = parseCompliance(fullOutput)
        if (data) {
          totalComplianceFindings = data
          agentReport = { agentId: 'shieldCheck', agentName: label, type: 'compliance', data }
        }
        break
      }
      case 'zap': {
        const data = parseHeal(fullOutput)
        if (data) {
          agentReport = { agentId: 'zap', agentName: label, type: 'heal', data }

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
          agentReport = { agentId: 'lock', agentName: label, type: 'hardener', data }
        }
        break
      }
      case 'fileText': {
        const data = parseDocs(fullOutput)
        if (data) {
          agentReport = { agentId: 'fileText', agentName: label, type: 'docs', data }
        }
        break
      }
      case 'clipboardCheck': {
        const validatorCtx = context
        context = validatorCtx

        const data = parseValidator(fullOutput)
        if (data) {
          validatorResult = data
          agentReport = { agentId: 'clipboardCheck', agentName: label, type: 'validator', data }
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
