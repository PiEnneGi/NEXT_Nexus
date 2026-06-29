import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DiffLine } from '@shared/types'
import { DiffView } from './DiffView'

interface Props {
  code: string | null
  diffLines: DiffLine[] | null
  streamedCode: string
  defaultTab?: 'code' | 'diff'
}

export function CodeDiffPanel({ code, diffLines, streamedCode, defaultTab }: Props) {
  const [tab, setTab] = useState<'code' | 'diff'>('code')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (defaultTab) {
      setTab(defaultTab)
    }
  }, [defaultTab])

  useEffect(() => {
    if (scrollRef.current && tab === 'code') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [streamedCode, tab])

  const displayCode = streamedCode || code || '// No code generated yet'

  return (
    <div className="flex-1 flex flex-col bg-[#050505] rounded-xl border border-[#1A1A1A] overflow-hidden">
      <div className="flex border-b border-[#1A1A1A]">
        <button
          onClick={() => setTab('code')}
          className={`flex-1 text-xs py-2 font-mono transition-colors ${
            tab === 'code'
              ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Current Code
        </button>
        <button
          onClick={() => setTab('diff')}
          className={`flex-1 text-xs py-2 font-mono transition-colors ${
            tab === 'diff'
              ? 'text-[#CCFF00] border-b-2 border-[#CCFF00]'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Visual Diff
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto p-3 font-mono text-xs leading-6">
        <AnimatePresence mode="wait">
          {tab === 'code' ? (
            <motion.pre
              key="code"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-300 whitespace-pre-wrap m-0"
            >
              {displayCode}
            </motion.pre>
          ) : (
            <motion.div
              key="diff"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              {diffLines && diffLines.length > 0 ? (
                <DiffView lines={diffLines} />
              ) : (
                <div className="flex items-center justify-center h-24 text-gray-600 text-xs">
                  No diffs available
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
