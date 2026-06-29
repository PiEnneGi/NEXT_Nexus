import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Shield, FileCode, ArrowRight, BrainCircuit, X } from 'lucide-react'
import type { HealData, HealPatch, DiffLine } from '@shared/types'
import { usePipelineStore } from '../../hooks/usePipelineStore'
import { DiffView } from '../DiffView'

function computeSimpleDiff(original: string, patched: string): DiffLine[] {
  const origLines = original.split('\n')
  const patchLines = patched.split('\n')
  const maxLen = Math.max(origLines.length, patchLines.length)
  const result: DiffLine[] = []
  let lineNum = 0
  for (let i = 0; i < maxLen; i++) {
    const o = i < origLines.length ? origLines[i] : undefined
    const p = i < patchLines.length ? patchLines[i] : undefined
    if (o === undefined) {
      lineNum++
      result.push({ type: 'added', content: p!, lineNumber: lineNum })
    } else if (p === undefined) {
      lineNum++
      result.push({ type: 'removed', content: o, lineNumber: lineNum })
    } else if (o !== p) {
      lineNum++
      result.push({ type: 'removed', content: o, lineNumber: lineNum })
      lineNum++
      result.push({ type: 'added', content: p, lineNumber: lineNum })
    } else {
      lineNum++
      result.push({ type: 'unchanged', content: o, lineNumber: lineNum })
    }
  }
  return result
}

interface DiffPopoverProps {
  patch: HealPatch
  buttonRect: DOMRect
  onClose: () => void
}

function DiffPopover({ patch, buttonRect, onClose }: DiffPopoverProps) {
  const diffLines = computeSimpleDiff(patch.original ?? '', patch.patched ?? '')
  const popoverRef = useRef<HTMLDivElement>(null)

  const popoverWidth = 440
  const popoverHeight = 360

  let top = buttonRect.top - popoverHeight - 8
  let left = buttonRect.left + buttonRect.width / 2 - popoverWidth / 2

  if (top < 8) top = buttonRect.bottom + 8
  if (left < 8) left = 8
  if (left + popoverWidth > window.innerWidth - 8) left = window.innerWidth - popoverWidth - 8

  return createPortal(
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, scale: 0.92, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 4 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      style={{ position: 'fixed', top, left, width: popoverWidth, zIndex: 9999 }}
      className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl shadow-2xl flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-300">
          <span className="text-[#FF6B00]">Zoom</span>
          <span className="text-gray-600">/</span>
          {patch.file}
          {patch.fixesViolation && (
            <span className="text-[#33FF77]/70">{patch.fixesViolation}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors p-0.5"
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2">
        <div>
          <p className="text-[8px] text-[#FF3333] font-mono uppercase tracking-wider mb-0.5">Before</p>
          <pre className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap leading-4 bg-[#FF3333]/[0.04] rounded border border-[#FF3333]/20 p-2 max-h-24 overflow-auto">
            {patch.original || '(empty)'}
          </pre>
        </div>
        <div>
          <p className="text-[8px] text-[#33FF77] font-mono uppercase tracking-wider mb-0.5">After</p>
          <pre className="text-[10px] text-gray-300 font-mono whitespace-pre-wrap leading-4 bg-[#33FF77]/[0.04] rounded border border-[#33FF77]/20 p-2 max-h-24 overflow-auto">
            {patch.patched || '(empty)'}
          </pre>
        </div>
        <div>
          <p className="text-[8px] text-gray-500 font-mono uppercase tracking-wider mb-0.5">Diff</p>
          <DiffView lines={diffLines} maxHeight="140px" />
        </div>
      </div>
    </motion.div>,
    document.body,
  )
}

interface Props {
  data: HealData
}

export function HealReport({ data }: Props) {
  const setActiveDiffView = usePipelineStore((s) => s.setActiveDiffView)
  const patches = data?.patches ?? []
  const compliancePatches = patches.filter((p) => p.fixesViolation)
  const [hoveredPatch, setHoveredPatch] = useState<{ patch: HealPatch; rect: DOMRect } | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = useCallback((patch: HealPatch, e: React.MouseEvent) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      const btn = (e.currentTarget as HTMLElement).closest('button')
      if (btn) {
        setHoveredPatch({ patch, rect: btn.getBoundingClientRect() })
      }
    }, 200)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setHoveredPatch(null)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 p-3 bg-[#0D0D0D] rounded-lg border border-[#1A1A1A1]">
        <Zap size={16} className="text-[#FF6B00]" />
        <span className="text-xs font-mono text-gray-300">
          {patches.length} patch{patches.length !== 1 ? 'es' : ''} applied
        </span>
        {compliancePatches.length > 0 && (
          <span className="text-[9px] font-mono text-[#33FF77] ml-auto">
            {compliancePatches.length} compliance fix{compliancePatches.length !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {patches.map((patch, i) => (
          <div
            key={i}
            className={`bg-[#0D0D0D] rounded-lg border overflow-hidden ${
              patch.fixesViolation ? 'border-[#33FF77]/30' : 'border-[#1A1A1A]'
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#1A1A1A]">
              <div className="flex items-center gap-2">
                <FileCode size={12} className="text-gray-400" />
                <span className="text-[11px] font-mono text-gray-300">{patch.file}</span>
              </div>
              <div className="flex items-center gap-2">
                {patch.fixesViolation && (
                  <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#33FF77]/10 text-[#33FF77] border border-[#33FF77]/30">
                    <Shield size={9} />
                    {patch.fixesViolation}
                  </span>
                )}
                {patch.patchType === 'compliance' && (
                  <span className="text-[9px] font-mono text-[#33FF77]/70">Compliance</span>
                )}
                <motion.button
                  onClick={() => setActiveDiffView(true)}
                  onMouseEnter={(e) => handleMouseEnter(patch, e)}
                  onMouseLeave={handleMouseLeave}
                  className="relative flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded bg-[#1A1A1A] text-[#FF6B00] hover:bg-[#FF6B00]/10 transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  Show Diff <ArrowRight size={10} />
                </motion.button>
              </div>
            </div>

            {patch.reasoning && (
              <div className="flex items-start gap-2 px-3 py-2 border-b border-[#1A1A1A] bg-[#FF6B00]/[0.03]">
                <BrainCircuit size={12} className="text-[#FF6B00] mt-0.5 shrink-0" />
                <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
                  {patch.reasoning}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 divide-x divide-[#1A1A1A]">
              <div className="p-2">
                <p className="text-[9px] text-[#FF3333] font-mono mb-1 uppercase tracking-wider">Before</p>
                <pre className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap leading-5 max-h-20 overflow-hidden">
                  {patch.original?.slice(0, 200) ?? ''}
                  {(patch.original?.length ?? 0) > 200 ? '...' : ''}
                </pre>
              </div>
              <div className="p-2">
                <p className="text-[9px] text-[#33FF77] font-mono mb-1 uppercase tracking-wider">After</p>
                <pre className="text-[10px] text-gray-300 font-mono whitespace-pre-wrap leading-5 max-h-20 overflow-hidden">
                  {patch.patched?.slice(0, 200) ?? ''}
                  {(patch.patched?.length ?? 0) > 200 ? '...' : ''}
                </pre>
              </div>
            </div>
          </div>
        ))}
        {patches.length === 0 && (
          <p className="text-xs text-gray-500 px-3 py-3">No patches applied</p>
        )}
      </div>

      <AnimatePresence>
        {hoveredPatch && (
          <DiffPopover
            patch={hoveredPatch.patch}
            buttonRect={hoveredPatch.rect}
            onClose={() => setHoveredPatch(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
