import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DiffLine } from '@shared/types'

interface Props {
  code: string | null
  diffLines: DiffLine[] | null
}

export function CodeDiffPanel({ code, diffLines }: Props) {
  const [tab, setTab] = useState<'code' | 'diff'>('code')

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
      <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-6">
        <AnimatePresence mode="wait">
          {tab === 'code' ? (
            <motion.pre
              key="code"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-gray-300 whitespace-pre-wrap m-0"
            >
              {code ?? '// No code generated yet'}
            </motion.pre>
          ) : (
            <motion.div
              key="diff"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              {diffLines && diffLines.length > 0 ? (
                diffLines.map((line, i) => {
                  const bg =
                    line.type === 'added'
                      ? 'bg-[#33FF77]/10'
                      : line.type === 'removed'
                        ? 'bg-[#FF3333]/10'
                        : ''
                  const color =
                    line.type === 'added'
                      ? 'text-[#33FF77]'
                      : line.type === 'removed'
                        ? 'text-[#FF3333]'
                        : 'text-gray-400'
                  return (
                    <div key={i} className={`flex ${bg} rounded px-2`}>
                      <span className="w-8 text-gray-600 select-none text-right mr-3">
                        {line.lineNumber}
                      </span>
                      <span className={color}>{line.content}</span>
                    </div>
                  )
                })
              ) : (
                <div className="text-gray-600">No diffs available</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
