import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Image, Mic, Send } from 'lucide-react'
import { WaveAnimation } from './WaveAnimation'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
}

export function CommandBar({ onSend, disabled }: Props) {
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] z-50"
    >
      <div className="flex items-center gap-2 bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl px-3 py-2 shadow-2xl">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => fileRef.current?.click()}
          className="p-1.5 rounded-lg hover:bg-[#1A1A1A] text-gray-400 hover:text-white transition-colors"
        >
          <Image size={16} />
        </motion.button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" />

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the infrastructure architecture..."
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none font-mono"
          disabled={disabled}
        />

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setListening((l) => !l)}
          className={`p-1.5 rounded-lg transition-colors ${
            listening ? 'bg-[#FF6B00]/20 text-[#FF6B00]' : 'hover:bg-[#1A1A1A] text-gray-400 hover:text-white'
          }`}
        >
          <Mic size={16} />
        </motion.button>

        <WaveAnimation active={listening} />

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className="p-1.5 rounded-lg bg-[#FF6B00] text-white hover:bg-[#e55f00] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </motion.button>
      </div>
    </motion.div>
  )
}
