import { motion } from 'framer-motion'
import { Download } from 'lucide-react'

interface Props {
  diagramSvg: string | null
}

export function ArchitecturePanel({ diagramSvg }: Props) {
  const handleExport = (format: 'svg' | 'png') => {
    if (!diagramSvg) return
    if (format === 'svg') {
      const blob = new Blob([diagramSvg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'architecture.svg'
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      const blob = new Blob([diagramSvg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      img.onload = () => {
        canvas.width = img.width * 2
        canvas.height = img.height * 2
        ctx!.scale(2, 2)
        ctx!.drawImage(img, 0, 0)
        canvas.toBlob((b) => {
          if (b) {
            const a = document.createElement('a')
            a.href = URL.createObjectURL(b)
            a.download = 'architecture.png'
            a.click()
          }
        }, 'image/png')
      }
      img.src = url
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[#050505] rounded-xl border border-[#1A1A1A] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1A1A1A]">
        <span className="text-xs text-gray-400 font-mono">Architecture Diagram</span>
        <div className="flex gap-2">
          <motion.button
            onClick={() => handleExport('svg')}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-[#1A1A1A] text-gray-300 hover:text-white transition-colors"
            whileTap={{ scale: 0.95 }}
            disabled={!diagramSvg}
          >
            <Download size={11} /> SVG
          </motion.button>
          <motion.button
            onClick={() => handleExport('png')}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-[#1A1A1A] text-gray-300 hover:text-white transition-colors"
            whileTap={{ scale: 0.95 }}
            disabled={!diagramSvg}
          >
            <Download size={11} /> PNG
          </motion.button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        {diagramSvg ? (
          <div className="w-full h-full flex items-center justify-center" dangerouslySetInnerHTML={{ __html: diagramSvg }} />
        ) : (
          <div className="text-center text-gray-600">
            <div className="text-4xl mb-2 opacity-20">⊞</div>
            <p className="text-xs font-mono">Submit an input to generate the architecture</p>
          </div>
        )}
      </div>
    </div>
  )
}
