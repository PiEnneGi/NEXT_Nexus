import { motion } from 'framer-motion'
import { FileDown, PanelRightClose } from 'lucide-react'
import { Timer } from './Timer'
import { useTimer } from '../hooks/useTimer'

interface Props {
  onToggleAssurance: () => void
  assuranceOpen: boolean
}

export function Header({ onToggleAssurance, assuranceOpen }: Props) {
  const timer = useTimer(15)

  return (
    <header className="fixed top-0 left-16 right-0 h-12 bg-[#0D0D0D] border-b border-[#1A1A1A] flex items-center justify-between px-5 z-40">
      <div className="flex items-center gap-4">
        <span className="text-sm font-bold text-white tracking-wide">CEREBRAS NEXUS</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A1A1A] text-[#FF6B00] border border-[#FF6B00]/30 font-mono">
          Gemma-4-31B API
        </span>
      </div>

      <div className="flex items-center gap-5">
        <Timer {...timer} />
        <motion.button
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/30 hover:bg-[#FF6B00]/20 transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          <FileDown size={13} />
          Export Official PDF
        </motion.button>
        <motion.button
          onClick={onToggleAssurance}
          className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md text-gray-400 hover:text-white transition-colors"
          whileTap={{ scale: 0.95 }}
          animate={{ rotate: assuranceOpen ? 180 : 0 }}
        >
          <PanelRightClose size={14} />
        </motion.button>
      </div>
    </header>
  )
}
