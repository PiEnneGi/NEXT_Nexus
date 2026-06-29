import { motion } from 'framer-motion'
import {
  Search,
  LayoutDashboard,
  CodeXml,
  ShieldCheck,
  Zap,
  Lock,
  FileText,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react'
import { AGENTS } from '../lib/constants'
import { ProgressRing } from './ProgressRing'
import type { AgentId } from '@shared/types'

const ICON_MAP: Record<string, LucideIcon> = {
  Search,
  LayoutDashboard,
  CodeXml,
  ShieldCheck,
  Zap,
  Lock,
  FileText,
  ClipboardCheck,
}

interface Props {
  agentProgress: Partial<Record<AgentId, { progress: number; status: string }>>
}

const statusColor = (status: string) => {
  switch (status) {
    case 'working':
      return '#FF6B00'
    case 'done':
      return '#33FF77'
    case 'error':
      return '#FF3333'
    default:
      return '#1A1A1A'
  }
}

export function Sidebar({ agentProgress }: Props) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-[#0D0D0D] border-r border-[#1A1A1A] flex flex-col items-center py-4 gap-5 z-50">
      {AGENTS.map((agent) => {
        const Icon = ICON_MAP[agent.icon]
        const state = agentProgress[agent.id]
        const progress = state?.progress ?? 0
        const status = state?.status ?? 'idle'
        const color = statusColor(status)

        return (
          <motion.div
            key={agent.id}
            className="relative flex flex-col items-center group cursor-pointer"
            whileHover={{ scale: 1.15 }}
          >
            <div className="relative">
              <ProgressRing progress={progress} size={36} strokeWidth={2.5} color={color} />
              <div className="absolute inset-0 flex items-center justify-center">
                {Icon && <Icon size={14} className="text-gray-400 group-hover:text-white transition-colors" />}
              </div>
            </div>
            <span className="text-[8px] text-gray-500 mt-1 leading-none uppercase tracking-wider">
              {agent.label}
            </span>
          </motion.div>
        )
      })}
    </aside>
  )
}
