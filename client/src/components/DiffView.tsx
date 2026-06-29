import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { DiffLine } from '@shared/types'

interface Props {
  lines: DiffLine[]
  maxHeight?: string
}

export function DiffView({ lines, maxHeight = '100%' }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines.length])

  return (
    <div
      ref={scrollRef}
      className="font-mono text-xs leading-6 overflow-auto rounded-lg border border-[#1A1A1A] bg-[#050505]"
      style={{ maxHeight }}
    >
      {lines.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-gray-600 text-xs">
          No changes detected
        </div>
      ) : (
        lines.map((line, i) => {
          const isAdded = line.type === 'added'
          const isRemoved = line.type === 'removed'
          const isUnchanged = line.type === 'unchanged'

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: isAdded ? 5 : isRemoved ? -5 : 0 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.12, delay: Math.min(i * 0.003, 0.3) }}
              className={`flex items-stretch ${
                isAdded
                  ? 'bg-[#33FF77]/[0.06]'
                  : isRemoved
                    ? 'bg-[#FF3333]/[0.06]'
                    : ''
              } hover:bg-white/[0.02] transition-colors`}
            >
              <div className="flex items-center justify-center w-8 shrink-0 text-gray-600 select-none text-[10px] border-r border-[#1A1A1A] bg-[#080808]">
                {line.lineNumber}
              </div>
              <div className="flex items-center justify-center w-5 shrink-0 select-none text-[10px]">
                {isAdded ? (
                  <span className="text-[#33FF77]">+</span>
                ) : isRemoved ? (
                  <span className="text-[#FF3333]">−</span>
                ) : (
                  <span className="text-gray-600">&nbsp;</span>
                )}
              </div>
              <div
                className={`flex-1 px-2 whitespace-pre-wrap break-all ${
                  isAdded
                    ? 'text-[#33FF77]'
                    : isRemoved
                      ? 'text-[#FF3333]'
                      : 'text-gray-400'
                }`}
              >
                {line.content || ' '}
              </div>
            </motion.div>
          )
        })
      )}
    </div>
  )
}
