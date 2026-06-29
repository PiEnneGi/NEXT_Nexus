import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Download, FileImage, Minus, Plus, RotateCcw } from 'lucide-react'
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

function calcZoomPan(
  vpX: number, vpY: number,
  oldZoom: number,
  newZoom: number,
  oldPan: { x: number; y: number },
  scroll: { x: number; y: number },
) {
  const factor = newZoom / oldZoom
  return {
    x: (1 - factor) * (vpX + scroll.x) + factor * oldPan.x,
    y: (1 - factor) * (vpY + scroll.y) + factor * oldPan.y,
  }
}

export function ArchitecturePanel({ diagramSvg, diagramMermaid }: Props) {
  const [renderedSvg, setRenderedSvg] = useState<string | null>(diagramSvg)
  const [isRendering, setIsRendering] = useState(false)
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [zoom, setZoom] = useState(1)
  const [svgNaturalSize, setSvgNaturalSize] = useState({ width: 800, height: 600 })
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanningState, setIsPanningState] = useState(false)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const panRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const scrollPosRef = useRef({ x: 0, y: 0 })

  useEffect(() => { zoomRef.current = zoom }, [zoom])

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

  useEffect(() => {
    if (!renderedSvg) return
    const svg = svgContainerRef.current?.querySelector('svg')
    if (svg) {
      svg.style.maxWidth = 'none'
      const vb = svg.getAttribute('viewBox')
      if (vb) {
        const [, , w, h] = vb.split(/\s+/).map(Number)
        if (w && h) setSvgNaturalSize({ width: w, height: h })
      } else {
        const bbox = svg.getBBox()
        if (bbox.width && bbox.height) {
          setSvgNaturalSize({ width: bbox.width, height: bbox.height })
        }
      }
    }
  }, [renderedSvg])

  useEffect(() => {
    if (!renderedSvg || !scrollRef.current) return
    const { clientWidth, clientHeight } = scrollRef.current
    const cx = Math.max(0, (clientWidth - svgNaturalSize.width) / 2)
    const cy = Math.max(0, (clientHeight - svgNaturalSize.height) / 2)
    setPanOffset({ x: cx, y: cy })
    panRef.current = { x: cx, y: cy }
  }, [renderedSvg, svgNaturalSize])

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      scrollPosRef.current = {
        x: scrollRef.current.scrollLeft,
        y: scrollRef.current.scrollTop,
      }
    }
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const vpX = e.clientX - rect.left
    const vpY = e.clientY - rect.top

    const factor = e.deltaY > 0 ? 0.9 : 1.1
    const oldZoom = zoomRef.current
    const newZoom = Math.max(0.25, Math.min(4, +(oldZoom * factor).toFixed(3)))

    const newPan = calcZoomPan(vpX, vpY, oldZoom, newZoom, panRef.current, scrollPosRef.current)

    setZoom(newZoom)
    setPanOffset(newPan)
    zoomRef.current = newZoom
    panRef.current = newPan
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isPanning.current = true
    setIsPanningState(true)
    panStart.current = { x: e.clientX, y: e.clientY, panX: panOffset.x, panY: panOffset.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [panOffset])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    setPanOffset({
      x: panStart.current.panX + dx,
      y: panStart.current.panY + dy,
    })
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isPanning.current = false
    setIsPanningState(false)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }, [])

  const zoomFromCenter = useCallback((factor: number) => {
    const oldZoom = zoomRef.current
    const newZoom = Math.max(0.25, Math.min(4, +(oldZoom * factor).toFixed(3)))
    const el = scrollRef.current
    if (!el) return
    const vpX = el.clientWidth / 2
    const vpY = el.clientHeight / 2
    const newPan = calcZoomPan(vpX, vpY, oldZoom, newZoom, panRef.current, scrollPosRef.current)
    setZoom(newZoom)
    setPanOffset(newPan)
    zoomRef.current = newZoom
    panRef.current = newPan
  }, [])

  const handleZoomIn = useCallback(() => zoomFromCenter(1.25), [zoomFromCenter])
  const handleZoomOut = useCallback(() => zoomFromCenter(0.8), [zoomFromCenter])

  const handleZoomReset = useCallback(() => {
    setZoom(1)
    zoomRef.current = 1
    const el = scrollRef.current
    if (el) {
      const cx = Math.max(0, (el.clientWidth - svgNaturalSize.width) / 2)
      const cy = Math.max(0, (el.clientHeight - svgNaturalSize.height) / 2)
      setPanOffset({ x: cx, y: cy })
      panRef.current = { x: cx, y: cy }
    }
  }, [svgNaturalSize])

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
    try {
      if (svgContainerRef.current) {
        await downloadPNG(svgContainerRef.current)
      } else if (renderedSvg) {
        await downloadPNG(renderedSvg)
      }
    } catch (err) {
      console.error('[PNG Export] Failed:', err)
    }
  }

  return (
    <div
      ref={panelRef}
      className="flex-1 flex flex-col bg-[#050505] rounded-xl border border-[#1A1A1A] overflow-hidden min-w-0"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1A1A1A]">
        <span className="text-xs text-gray-400 font-mono">Architecture Diagram</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 mr-1">
            <motion.button
              onClick={handleZoomOut}
              className="flex items-center gap-1 text-[10px] p-1 rounded bg-[#1A1A1A] text-gray-300 hover:text-white transition-colors disabled:opacity-30"
              whileTap={{ scale: 0.95 }}
              disabled={!renderedSvg || isRendering || zoom <= 0.25}
              title="Zoom out"
            >
              <Minus size={10} />
            </motion.button>
            <span className="text-[10px] text-gray-500 font-mono w-8 text-center select-none">
              {Math.round(zoom * 100)}%
            </span>
            <motion.button
              onClick={handleZoomIn}
              className="flex items-center gap-1 text-[10px] p-1 rounded bg-[#1A1A1A] text-gray-300 hover:text-white transition-colors disabled:opacity-30"
              whileTap={{ scale: 0.95 }}
              disabled={!renderedSvg || isRendering || zoom >= 4}
              title="Zoom in"
            >
              <Plus size={10} />
            </motion.button>
            <motion.button
              onClick={handleZoomReset}
              className="flex items-center gap-1 text-[10px] p-1 rounded bg-[#1A1A1A] text-gray-300 hover:text-white transition-colors disabled:opacity-30 ml-0.5"
              whileTap={{ scale: 0.95 }}
              disabled={!renderedSvg || isRendering || (zoom === 1 && panOffset.x === 0 && panOffset.y === 0)}
              title="Reset zoom"
            >
              <RotateCcw size={10} />
            </motion.button>
          </div>
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
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto min-w-0 select-none"
        onScroll={handleScroll}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ cursor: isPanningState ? 'grabbing' : 'grab' }}
      >
        {isRendering ? (
          <div className="w-full h-full flex items-center justify-center text-center text-gray-600">
            <div className="animate-pulse text-2xl mb-2 opacity-30">◌</div>
            <p className="text-xs font-mono">Rendering diagram...</p>
          </div>
        ) : renderedSvg ? (
          <div
            style={{
              width: svgNaturalSize.width * zoom,
              height: svgNaturalSize.height * zoom,
              minWidth: '100%',
              minHeight: '100%',
            }}
          >
            <div
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
            >
              <div
                ref={svgContainerRef}
                dangerouslySetInnerHTML={{ __html: renderedSvg }}
              />
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-center text-gray-600">
            <div className="text-4xl mb-2 opacity-20">⊞</div>
            <p className="text-xs font-mono">Submit an input to generate the architecture</p>
          </div>
        )}
      </div>
    </div>
  )
}
