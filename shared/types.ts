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
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

export interface ComplianceReport {
  gdpr: boolean;
  details: string[];
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
