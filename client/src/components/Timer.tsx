import { Clock } from 'lucide-react'

interface Props {
  display: string
  running: boolean
  toggle: () => void
  reset: () => void
}

export function Timer({ display, running, toggle, reset }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
      <Clock size={14} className={running ? 'text-[#CCFF00]' : 'text-gray-500'} />
      <span>{display}</span>
      <button onClick={toggle} className="text-[10px] text-gray-500 hover:text-white transition-colors">
        {running ? '⏸' : '▶'}
      </button>
      <button onClick={reset} className="text-[10px] text-gray-500 hover:text-white transition-colors">
        ↺
      </button>
    </div>
  )
}
