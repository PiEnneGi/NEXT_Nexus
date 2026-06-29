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
  selectedAgentId: AgentId | null
  onAgentClick: (id: AgentId) => void
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

export function Sidebar({ agentProgress, selectedAgentId, onAgentClick }: Props) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-[#0D0D0D] border-r border-[#1A1A1A] flex flex-col items-center py-4 gap-5 z-50">
      {AGENTS.map((agent) => {
        const Icon = ICON_MAP[agent.icon]
        const state = agentProgress[agent.id]
        const progress = state?.progress ?? 0
        const status = state?.status ?? 'idle'
        const color = statusColor(status)
        const isSelected = selectedAgentId === agent.id

        return (
          <motion.button
            key={agent.id}
            onClick={() => onAgentClick(agent.id)}
            className="relative flex flex-col items-center group focus:outline-none"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative">
              <ProgressRing progress={progress} size={36} strokeWidth={2.5} color={color} />
              <div className="absolute inset-0 flex items-center justify-center">
                {Icon && (
                  <Icon
                    size={14}
                    className={
                      isSelected
                        ? 'text-white'
                        : 'text-gray-400 group-hover:text-white transition-colors'
                    }
                  />
                )}
              </div>
            </div>
            <span
              className={`text-[8px] mt-1 leading-none uppercase tracking-wider transition-colors ${
                isSelected ? 'text-[#FF6B00]' : 'text-gray-500'
              }`}
            >
              {agent.label}
            </span>
            {isSelected && (
              <motion.div
                layoutId="sidebar-indicator"
                className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-[#FF6B00] rounded-full"
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
            )}
          </motion.button>
        )
      })}
    </aside>
  )
}
