import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Download, FileImage } from 'lucide-react'
import mermaid from 'mermaid'
import { downloadSVG, downloadPNG } from '../lib/export'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#FF6B00',
    primaryTextColor: '#CCCCCC',
    primaryBorderColor: '#FF6B00',
    lineColor: '#1A1A1A',
    secondaryColor: '#CCFF00',
    tertiaryColor: '#0D0D0D',
    fontFamily: 'monospace',
  },
})

interface Props {
  diagramSvg: string | null
  diagramMermaid: string | null
}

export function ArchitecturePanel({ diagramSvg, diagramMermaid }: Props) {
  const [renderedSvg, setRenderedSvg] = useState<string | null>(diagramSvg)
  const [isRendering, setIsRendering] = useState(false)
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (diagramSvg) {
      setRenderedSvg(diagramSvg)
      return
    }

    if (diagramMermaid) {
      setIsRendering(true)
      mermaid
        .render('nexus-mermaid-diagram', diagramMermaid)
        .then(({ svg }) => {
          setRenderedSvg(svg)
          setIsRendering(false)
        })
        .catch((err) => {
          console.error('[Mermaid] Render error:', err)
          setIsRendering(false)
        })
      return
    }

    setRenderedSvg(null)
  }, [diagramSvg, diagramMermaid])

  const getDomSvg = useCallback((): SVGElement | null => {
    if (!svgContainerRef.current) return null
    const svgEl = svgContainerRef.current.querySelector('svg')
    return svgEl
  }, [])

  const handleExportSVG = () => {
    const domSvg = getDomSvg()
    if (domSvg) {
      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(domSvg)
      downloadSVG(svgString)
    } else if (renderedSvg) {
      downloadSVG(renderedSvg)
    }
  }

  const handleExportPNG = async () => {
    const domSvg = getDomSvg()
    if (domSvg) {
      await downloadPNG(domSvg)
    } else if (renderedSvg) {
      await downloadPNG(renderedSvg)
    }
  }

  return (
    <div
      ref={panelRef}
      className="flex-1 flex flex-col bg-[#050505] rounded-xl border border-[#1A1A1A] overflow-hidden min-w-0"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1A1A1A]">
        <span className="text-xs text-gray-400 font-mono">Architecture Diagram</span>
        <div className="flex gap-2">
          <motion.button
            onClick={handleExportSVG}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-[#1A1A1A] text-gray-300 hover:text-white transition-colors disabled:opacity-30"
            whileTap={{ scale: 0.95 }}
            disabled={!renderedSvg || isRendering}
          >
            <Download size={11} /> SVG
          </motion.button>
          <motion.button
            onClick={handleExportPNG}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-[#1A1A1A] text-gray-300 hover:text-white transition-colors disabled:opacity-30"
            whileTap={{ scale: 0.95 }}
            disabled={!renderedSvg || isRendering}
          >
            <FileImage size={11} /> PNG
          </motion.button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto min-w-0">
        {isRendering ? (
          <div className="text-center text-gray-600">
            <div className="animate-pulse text-2xl mb-2 opacity-30">◌</div>
            <p className="text-xs font-mono">Rendering diagram...</p>
          </div>
        ) : renderedSvg ? (
          <div
            ref={svgContainerRef}
            className="w-full h-full flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: renderedSvg }}
          />
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
