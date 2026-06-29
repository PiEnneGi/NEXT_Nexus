import type {
  AgentId,
  ArchitectureResult,
  DiffLine,
  AgentReport,
} from '@shared/types'

const AGENT_CODE_LINES: Record<AgentId, string[]> = {
  search: [
    `# Agent 1/8 — Search: discovering infrastructure requirements`,
    `# Analyzing input: "Deploy a scalable web application on AWS"`,
    `# Found: VPC, subnets, security groups, load balancer, auto-scaling`,
    `# Generating Terraform configuration...`,
    ``,
  ],
  layout: [
    `# Agent 2/8 — Layout: designing network topology`,
    `resource "aws_vpc" "nexus" {`,
    `  cidr_block           = "10.0.0.0/16"`,
    `  enable_dns_support   = true`,
    `  enable_dns_hostnames = true`,
    `  tags = { Name = "nexus-vpc" }`,
    `}`,
    ``,
    `resource "aws_subnet" "public_a" {`,
    `  vpc_id                  = aws_vpc.nexus.id`,
    `  cidr_block              = "10.0.1.0/24"`,
    `  availability_zone       = "us-east-1a"`,
    `  map_public_ip_on_launch = true`,
    `}`,
    ``,
  ],
  codeXml: [
    `# Agent 3/8 — Code/XML: defining security groups & WAF`,
    `resource "aws_security_group" "alb" {`,
    `  name        = "nexus-alb-sg"`,
    `  description = "Security group for ALB"`,
    `  vpc_id      = aws_vpc.nexus.id`,
    ``,
    `  ingress {`,
    `    from_port   = 443`,
    `    to_port     = 443`,
    `    protocol    = "tcp"`,
    `    cidr_blocks = ["0.0.0.0/0"]`,
    `  }`,
    ``,
    `  egress {`,
    `    from_port   = 0`,
    `    to_port     = 0`,
    `    protocol    = "-1"`,
    `    cidr_blocks = ["0.0.0.0/0"]`,
    `  }`,
    `}`,
    ``,
  ],
  shieldCheck: [
    `# Agent 4/8 — Shield: enabling DDoS protection`,
    `resource "aws_shield_protection" "nexus" {`,
    `  name         = "nexus-shield"`,
    `  resource_arn = aws_lb.nexus.arn`,
    `}`,
    ``,
    `resource "aws_wafv2_web_acl" "nexus" {`,
    `  name        = "nexus-waf"`,
    `  scope       = "regional"`,
    `  description = "WAF for Nexus web app"`,
    ``,
    `  default_action { allow {} }`,
    ``,
    `  rule {`,
    `    name     = "rate-limit"`,
    `    priority = 0`,
    `    action   { block {} }`,
    `    statement {`,
    `      rate_based_statement {`,
    `        limit              = 5000`,
    `        aggregate_key_type = "IP"`,
    `      }`,
    `    }`,
    `  }`,
    `}`,
    ``,
  ],
  zap: [
    `# Agent 5/8 — Optimize: configuring auto-scaling & load balancing`,
    `resource "aws_lb" "nexus" {`,
    `  name               = "nexus-alb"`,
    `  internal           = false`,
    `  load_balancer_type = "application"`,
    `  security_groups    = [aws_security_group.alb.id]`,
    `  subnets            = [aws_subnet.public_a.id]`,
    `}`,
    ``,
    `resource "aws_lb_target_group" "nexus" {`,
    `  name     = "nexus-tg"`,
    `  port     = 80`,
    `  protocol = "HTTP"`,
    `  vpc_id   = aws_vpc.nexus.id`,
    ``,
    `  health_check {`,
    `    path                = "/health"`,
    `    interval            = 30`,
    `    healthy_threshold   = 2`,
    `    unhealthy_threshold = 3`,
    `  }`,
    `}`,
    ``,
  ],
  lock: [
    `# Agent 6/8 — Security: provisioning IAM & encryption`,
    `resource "aws_iam_role" "ecs_task" {`,
    `  name = "nexus-ecs-task-role"`,
    ``,
    `  assume_role_policy = jsonencode({`,
    `    Version = "2012-10-17"`,
    `    Statement = [{`,
    `      Action = "sts:AssumeRole"`,
    `      Effect = "Allow"`,
    `      Principal = { Service = "ecs-tasks.amazonaws.com" }`,
    `    }]`,
    `  })`,
    `}`,
    ``,
    `resource "aws_kms_key" "nexus" {`,
    `  description             = "Nexus encryption key"`,
    `  deletion_window_in_days = 30`,
    `  enable_key_rotation     = true`,
    `}`,
    ``,
  ],
  fileText: [
    `# Agent 7/8 — Docs: generating outputs & tagging strategy`,
    `output "vpc_id" {`,
    `  value = aws_vpc.nexus.id`,
    `}`,
    ``,
    `output "alb_dns" {`,
    `  value = aws_lb.nexus.dns_name`,
    `}`,
    ``,
    `output "waf_arn" {`,
    `  value = aws_wafv2_web_acl.nexus.arn`,
    `}`,
    ``,
    `locals {`,
    `  environment = "production"`,
    `  project     = "cerebras-nexus"`,
    `  team        = "infrastructure"`,
    `}`,
    ``,
  ],
  clipboardCheck: [
    `# Agent 8/8 — Verify: running validation checks`,
    `# ✅ Terraform configuration is valid`,
    `# ✅ All required providers configured (aws ~> 5.0)`,
    `# ✅ Security groups reference valid resources`,
    `# ✅ IAM policies follow least-privilege principle`,
    `# ✅ Encryption enabled for all data stores`,
    `# ✅ WAF rate limiting configured for production`,
    `#`,
    `# Architecture ready for deployment.`,
    ``,
  ],
}

const AGENT_ORDER: AgentId[] = [
  'search', 'layout', 'codeXml', 'shieldCheck',
  'zap', 'lock', 'fileText', 'clipboardCheck',
]

export function startMockPipeline(
  onCodeLine: (line: string) => void,
  onProgress: (agentId: AgentId, progress: number, status: string) => void,
  onComplete: (result: ArchitectureResult) => void,
) {
  let step = 0
  let lineIndex = 0
  let progressTimer: ReturnType<typeof setInterval> | null = null

  const MOCK_DIAGRAM = `<svg width="800" height="400" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="800" height="400" fill="#0D0D0D" rx="12"/>
  <rect x="50" y="60" width="160" height="80" rx="8" fill="#1A1A1A" stroke="#FF6B00" stroke-width="2"/>
  <text x="130" y="108" text-anchor="middle" fill="#FF6B00" font-family="monospace" font-size="13">API Gateway</text>
  <rect x="320" y="60" width="160" height="80" rx="8" fill="#1A1A1A" stroke="#CCFF00" stroke-width="2"/>
  <text x="400" y="108" text-anchor="middle" fill="#CCFF00" font-family="monospace" font-size="13">Orchestrator</text>
  <rect x="590" y="60" width="160" height="80" rx="8" fill="#1A1A1A" stroke="#33FF77" stroke-width="2"/>
  <text x="670" y="108" text-anchor="middle" fill="#33FF77" font-family="monospace" font-size="13">Cache Layer</text>
  <rect x="50" y="220" width="160" height="80" rx="8" fill="#1A1A1A" stroke="#FF6B00" stroke-width="2"/>
  <text x="130" y="268" text-anchor="middle" fill="#FF6B00" font-family="monospace" font-size="13">Microservice A</text>
  <rect x="320" y="220" width="160" height="80" rx="8" fill="#1A1A1A" stroke="#FF6B00" stroke-width="2"/>
  <text x="400" y="268" text-anchor="middle" fill="#FF6B00" font-family="monospace" font-size="13">Microservice B</text>
  <rect x="590" y="220" width="160" height="80" rx="8" fill="#1A1A1A" stroke="#FF6B00" stroke-width="2"/>
  <text x="670" y="268" text-anchor="middle" fill="#FF6B00" font-family="monospace" font-size="13">Database</text>
  <line x1="210" y1="100" x2="320" y2="100" stroke="#1A1A1A" stroke-width="2"/>
  <line x1="480" y1="100" x2="590" y2="100" stroke="#1A1A1A" stroke-width="2"/>
  <line x1="130" y1="140" x2="130" y2="220" stroke="#1A1A1A" stroke-width="2"/>
  <line x1="400" y1="140" x2="400" y2="220" stroke="#1A1A1A" stroke-width="2"/>
  <line x1="670" y1="140" x2="670" y2="220" stroke="#1A1A1A" stroke-width="2"/>
  <line x1="210" y1="260" x2="320" y2="260" stroke="#1A1A1A" stroke-width="2"/>
  <line x1="480" y1="260" x2="590" y2="260" stroke="#1A1A1A" stroke-width="2"/>
</svg>`

  const MOCK_DIFF: DiffLine[] = [
    { type: 'unchanged', content: '# Cerebras Nexus Architecture', lineNumber: 1 },
    { type: 'added', content: '+ resource "aws_vpc" "nexus" { cidr_block = "10.0.0.0/16" }', lineNumber: 2 },
    { type: 'unchanged', content: '# previous: manual VPC creation', lineNumber: 3 },
    { type: 'removed', content: '- # TODO: create VPC manually', lineNumber: 4 },
    { type: 'added', content: '+ resource "aws_wafv2_web_acl" "nexus" { rate_limit = 5000 }', lineNumber: 5 },
    { type: 'unchanged', content: '# security baseline', lineNumber: 6 },
    { type: 'removed', content: '- # TODO: add WAF rules', lineNumber: 7 },
  ]

  const MOCK_AGENT_REPORTS: Partial<Record<AgentId, AgentReport>> = {
    search: {
      agentId: 'search', agentName: 'Analyze', type: 'analyze',
      data: {
        requirements: [
          { name: 'High Availability', value: 'Multi-AZ deployment with auto-scaling', priority: 'P0' },
          { name: 'Security', value: 'Encryption at rest and in transit', priority: 'P0' },
          { name: 'Scalability', value: 'Horizontal scaling with load balancer', priority: 'P1' },
        ],
        rpo: '1 hour', rto: '15 minutes',
        services: ['AWS VPC', 'ECS', 'RDS', 'ALB', 'ElastiCache'],
      },
    },
    layout: {
      agentId: 'layout', agentName: 'Design', type: 'layout',
      data: {
        architecture: 'Multi-AZ VPC with public/private subnets across 3 AZs',
        services: ['VPC', 'ECS', 'RDS', 'ALB', 'ElastiCache'],
        zones: 3,
      },
    },
    codeXml: {
      agentId: 'codeXml', agentName: 'Code/XML', type: 'codeXml',
      data: { code: '', language: 'hcl', modules: [{ name: 'vpc', type: 'network' }, { name: 'ecs_cluster', type: 'compute' }, { name: 'rds_instance', type: 'database' }] },
    },
    shieldCheck: {
      agentId: 'shieldCheck', agentName: 'Compliance', type: 'compliance',
      data: [
        { severity: 'High', article: 'GDPR-32', title: 'Data encryption at rest', description: 'Ensure KMS encryption enabled for all data stores', passed: true, remediation: 'Enable KMS' },
        { severity: 'High', article: 'GDPR-33', title: 'Access logging enabled', description: 'CloudTrail must be enabled for audit logging', passed: true, remediation: 'Enable CloudTrail' },
        { severity: 'Medium', article: 'GDPR-25', title: 'Data isolation via VPC', description: 'Resources must be deployed in isolated VPC', passed: true },
      ],
    },
    zap: {
      agentId: 'zap', agentName: 'Auto-Heal', type: 'heal',
      data: {
        patches: [
          { file: 'main.tf', original: 'instance_type = "t2.micro"', patched: 'instance_type = "t3.medium"', reasoning: 'Upgrade instance type for production workload' },
        ],
      },
    },
    lock: {
      agentId: 'lock', agentName: 'Hardener', type: 'hardener',
      data: {
        controls: [
          { id: 'IAM-01', name: 'Least privilege IAM roles', category: 'Identity', applied: true, description: 'IAM roles follow least-privilege principle' },
          { id: 'ENC-01', name: 'Encryption at rest', category: 'Encryption', applied: true, description: 'KMS encryption enabled for all data stores' },
          { id: 'LOG-01', name: 'Audit logging', category: 'Logging', applied: false, description: 'CloudTrail logging for API calls' },
        ],
        passed: 2, total: 3,
      },
    },
    fileText: {
      agentId: 'fileText', agentName: 'Docs', type: 'docs',
      data: {
        sections: [
          { title: 'Overview', content: 'This architecture deploys a scalable web application on AWS using ECS Fargate with RDS and ElastiCache.' },
          { title: 'Networking', content: 'VPC configured with public/private subnets across 3 availability zones.' },
        ],
        readme: '# Cerebras Nexus Infrastructure\n\nAutomated infrastructure deployment.',
        adr: null,
      },
    },
    clipboardCheck: {
      agentId: 'clipboardCheck', agentName: 'Validator', type: 'validator',
      data: {
        checks: [
          { name: 'Terraform syntax', passed: true, weight: 30, message: 'Configuration is valid' },
          { name: 'Security groups', passed: true, weight: 25, message: 'No overly permissive rules' },
          { name: 'IAM policies', passed: true, weight: 25, message: 'Least privilege enforced' },
        ],
        score: 100, approved: true,
      },
    },
  }

  const advanceAgent = () => {
    if (step >= AGENT_ORDER.length) {
      if (progressTimer) clearInterval(progressTimer)
      const allCode = AGENT_ORDER.flatMap((id) => AGENT_CODE_LINES[id]).join('\n')
      onComplete({
        diagramSvg: MOCK_DIAGRAM,
        diagramMermaid: null,
        code: allCode,
        diffLines: MOCK_DIFF,
        compliance: {
          gdpr: true,
          details: ['Data encryption at rest (KMS)', 'Access logging enabled (CloudTrail)', 'Data isolation via VPC'],
        },
        security: { passed: 14, failed: 0, warnings: ['Review ALB access logs retention', 'Enable AWS Config rules'] },
        validation: { valid: true, errors: [] },
        agentReports: MOCK_AGENT_REPORTS,
      })
      return
    }

    const agentId = AGENT_ORDER[step]
    const lines = AGENT_CODE_LINES[agentId]
    lineIndex = 0

    onProgress(agentId, 0, 'working')

    let pct = 0
    progressTimer = setInterval(() => {
      pct += 2
      const capped = Math.min(pct, 100)
      onProgress(agentId, capped, 'working')
      if (pct >= 100 && progressTimer) {
        clearInterval(progressTimer)
      }
    }, 60)

    const streamNextLine = () => {
      if (lineIndex < lines.length) {
        const line = lines[lineIndex]
        onCodeLine(line)
        lineIndex++
        const delay = line.trim() === '' ? 50 : line.startsWith('#') ? 40 : 120
        setTimeout(streamNextLine, delay)
      } else {
        if (progressTimer) clearInterval(progressTimer)
        onProgress(agentId, 100, 'done')
        step++
        setTimeout(advanceAgent, 350)
      }
    }

    streamNextLine()
  }

  advanceAgent()
}
