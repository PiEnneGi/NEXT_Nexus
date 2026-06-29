import type { Agent } from '@shared/types'

export const AGENTS: Agent[] = [
  { id: 'search', label: 'Search', icon: 'Search', progress: 0, status: 'idle' },
  { id: 'layout', label: 'Layout', icon: 'LayoutDashboard', progress: 0, status: 'idle' },
  { id: 'codeXml', label: 'Code/XML', icon: 'CodeXml', progress: 0, status: 'idle' },
  { id: 'shieldCheck', label: 'Shield', icon: 'ShieldCheck', progress: 0, status: 'idle' },
  { id: 'zap', label: 'Optimize', icon: 'Zap', progress: 0, status: 'idle' },
  { id: 'lock', label: 'Security', icon: 'Lock', progress: 0, status: 'idle' },
  { id: 'fileText', label: 'Docs', icon: 'FileText', progress: 0, status: 'idle' },
  { id: 'clipboardCheck', label: 'Verify', icon: 'ClipboardCheck', progress: 0, status: 'idle' },
]

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'
export const GEMMA_API_KEY = import.meta.env.VITE_GEMMA_API_KEY ?? ''
