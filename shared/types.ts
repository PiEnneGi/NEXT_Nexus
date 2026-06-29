export type AgentId =
  | 'search'
  | 'layout'
  | 'codeXml'
  | 'shieldCheck'
  | 'zap'
  | 'lock'
  | 'fileText'
  | 'clipboardCheck';

export interface Agent {
  id: AgentId;
  label: string;
  icon: string;
  progress: number;
  status: 'idle' | 'working' | 'done' | 'error';
}

export interface PipelineStep {
  agentId: AgentId;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
}

export interface ArchitectureResult {
  diagramSvg: string;
  code: string;
  diffLines: DiffLine[];
  compliance: ComplianceReport;
  security: SecurityReport;
  validation: ValidationReport;
  agentReports: Partial<Record<AgentId, AgentReport>>;
  diagramMermaid: string | null;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

export interface ComplianceReport {
  gdpr: boolean;
  details: string[];
  findings?: ComplianceFinding[];
}

export interface SecurityReport {
  passed: number;
  failed: number;
  warnings: string[];
}

export interface ValidationReport {
  valid: boolean;
  errors: string[];
}

export interface AgentReport {
  agentId: AgentId;
  agentName: string;
  type: 'analyze' | 'layout' | 'codeXml' | 'compliance' | 'heal' | 'hardener' | 'docs' | 'validator';
  data: AnalyzeData | LayoutData | CodeXmlData | ComplianceFinding[] | HealData | HardenerData | DocsData | ValidatorData;
}

export interface AnalyzeData {
  requirements: { name: string; value: string; priority: 'P0' | 'P1' | 'P2' }[];
  rpo: string;
  rto: string;
  services: string[];
}

export interface LayoutData {
  architecture: string;
  services: string[];
  zones: number;
}

export interface CodeXmlData {
  code: string;
  language: string;
  modules: { name: string; type: string }[];
}

export interface ComplianceFinding {
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  article: string;
  title: string;
  description: string;
  passed: boolean;
  remediation?: string;
}

export interface HardenerControl {
  id: string;
  name: string;
  category: string;
  applied: boolean;
  description: string;
}

export interface HardeningSummary {
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  securityScore: string;
}

export interface CisBenchmark {
  version: string;
  level: string;
  controlsPassed: number;
  controlsFailed: number;
  coverage: string;
}

export interface ScpRecommendation {
  name: string;
  effect: 'Deny' | 'Allow';
  actions: string[];
  rationale: string;
  resourceType: string;
}

export interface IamHardening {
  policiesReviewed: number;
  overPrivilegedPoliciesFound: number;
  policiesHardened: Array<{
    policyName: string;
    originalActions: number;
    reducedActions: number;
    riskReduction: string;
  }>;
}

export interface EncryptionScore {
  servicesEncryptedAtRest: number;
  servicesWithTLS: number;
  kmsKeysUsed: number;
  overallEncryptionScore: string;
}

export interface HardenerData {
  controls: HardenerControl[];
  passed: number;
  total: number;
  hardeningSummary: HardeningSummary;
  cisBenchmark: CisBenchmark;
  scpRecommendations: ScpRecommendation[];
  iamHardening: IamHardening;
  encryptionScore: EncryptionScore;
}

export interface HealPatch {
  file: string;
  original: string;
  patched: string;
  reasoning?: string;
  fixesViolation?: string;
  fixesViolationTitle?: string;
  patchType?: 'operational' | 'compliance' | 'security';
  advisory?: boolean;
}

export interface HealData {
  patches: HealPatch[];
}

export interface ValidatorCheck {
  name: string;
  passed: boolean;
  weight: number;
  message: string;
}

export interface ValidatorData {
  checks: ValidatorCheck[];
  score: number;
  approved: boolean;
}

export interface DocsData {
  sections: { title: string; content: string }[];
  readme: string;
  adr: string | null;
}
